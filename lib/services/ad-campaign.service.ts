import { supabaseServer } from '@/lib/supabase/server';
import { AD_PACKAGES } from '@/lib/seed';
import type { AdPackageType, AdCampaign } from '@/lib/types';
import { PAYMENT_STATUS, PAYMENT_TYPE } from '@/lib/types';
import { notifyUser, notifyAdmins } from '@/lib/notifications';

export interface CreateAdCampaignInput {
  equipmentId: string;
  packageType: AdPackageType;
  provider?: 'paystack' | 'flutterwave' | 'demo';
  email?: string;
  name?: string;
}

export const adCampaignService = {
  /**
   * List all campaigns for a merchant and auto-expire finished campaigns
   */
  async listMerchantCampaigns(merchantProfileId: string) {
    const today = new Date().toISOString().split('T')[0];

    // 1. Fetch campaigns with equipment details
    const { data: campaigns, error } = await supabaseServer
      .from('ad_campaigns')
      .select(`
        *,
        equipment:equipment (
          id,
          name,
          slug,
          category,
          location_city,
          location_state,
          images:equipment_images (image_url, is_primary)
        )
      `)
      .eq('merchant_id', merchantProfileId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching merchant ad campaigns:', error);
      throw error;
    }

    const items = campaigns || [];

    // 2. Check for expired campaigns and clean up equipment promotion_tier
    for (const c of items) {
      if (c.status === 'ACTIVE' && c.end_date && c.end_date < today) {
        c.status = 'EXPIRED';
        await supabaseServer
          .from('ad_campaigns')
          .update({ status: 'EXPIRED', updated_at: new Date().toISOString() })
          .eq('id', c.id);

        // Reset equipment promotion tier if it matches this expired campaign
        if (c.equipment_id) {
          await supabaseServer
            .from('equipment')
            .update({
              promotion_tier: 'NONE',
              is_featured: false,
              promotion_expires_at: null,
            })
            .eq('id', c.equipment_id);
        }
      }
    }

    return items;
  },

  /**
   * Create a new ad campaign and initialize payment
   */
  async createCampaign(merchantProfileId: string, input: CreateAdCampaignInput) {
    const { equipmentId, packageType, provider = 'paystack', email = 'merchant@cheesco.ng' } = input;

    // 1. Validate package
    const pkg = AD_PACKAGES.find((p) => p.type === packageType);
    if (!pkg) {
      throw new Error(`Invalid ad package type: ${packageType}`);
    }

    // 2. Verify equipment belongs to this merchant
    const { data: equipment, error: eqErr } = await supabaseServer
      .from('equipment')
      .select('id, name, slug, merchant_id, verification_status')
      .eq('id', equipmentId)
      .maybeSingle();

    if (eqErr || !equipment) {
      throw new Error('Equipment not found');
    }

    if (equipment.merchant_id !== merchantProfileId) {
      throw new Error('Unauthorized: Equipment does not belong to your merchant profile');
    }

    // 3. Generate unique payment & campaign reference
    const timestamp = Date.now().toString(36).toUpperCase();
    const randomHex = Math.random().toString(36).slice(2, 6).toUpperCase();
    const reference = `AD-${timestamp}-${randomHex}`;

    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + pkg.durationDays * 24 * 60 * 60 * 1000);
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // 4. Create row in ad_campaigns
    const { data: campaign, error: campErr } = await supabaseServer
      .from('ad_campaigns')
      .insert({
        merchant_id: merchantProfileId,
        equipment_id: equipmentId,
        package_type: packageType,
        amount_paid: pkg.priceNgn,
        duration_days: pkg.durationDays,
        start_date: startDateStr,
        end_date: endDateStr,
        status: provider === 'demo' ? 'ACTIVE' : 'PENDING_APPROVAL',
        payment_reference: reference,
        impressions_count: 0,
        clicks_count: 0,
        enquiries_count: 0,
      })
      .select()
      .single();

    if (campErr) {
      console.error('Error inserting ad_campaign:', campErr);
      throw new Error(`Failed to create ad campaign: ${campErr.message}`);
    }

    // 5. Create row in payments table
    await supabaseServer.from('payments').insert({
      reference: reference,
      payment_reference: reference,
      amount: pkg.priceNgn,
      currency: 'NGN',
      payment_type: PAYMENT_TYPE.AD_CAMPAIGN_FEE,
      status: provider === 'demo' ? PAYMENT_STATUS.CONFIRMED : PAYMENT_STATUS.PENDING,
      payment_gateway: provider.toUpperCase(),
      provider: provider,
      payer_id: merchantProfileId,
      paid_at: provider === 'demo' ? new Date().toISOString() : null,
    });

    // If demo provider, immediately activate equipment promotion
    if (provider === 'demo') {
      await this.activateCampaign(reference, true);
      return {
        success: true,
        campaign,
        reference,
        checkoutUrl: `/merchant/ads?activated=true&ref=${reference}`,
        isDemo: true,
      };
    }

    // 6. Initialize Paystack / Flutterwave Gateway
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
    const callbackUrl = `${appUrl}/merchant/ads?activated=true&ref=${reference}`;

    const paystackSecret = process.env.PAYSTACK_SECRET_KEY?.trim();

    if (provider === 'paystack' && paystackSecret && !paystackSecret.includes('your_paystack')) {
      try {
        const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${paystackSecret}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            amount: Math.round(pkg.priceNgn * 100), // in kobo
            reference,
            callback_url: callbackUrl,
            metadata: {
              ad_campaign_id: campaign.id,
              equipment_id: equipmentId,
              payment_type: 'AD_CAMPAIGN_FEE',
              package_type: packageType,
              custom_fields: [
                { display_name: 'Package', variable_name: 'package', value: pkg.label },
                { display_name: 'Equipment', variable_name: 'equipment', value: equipment.name },
                { display_name: 'Duration', variable_name: 'duration', value: `${pkg.durationDays} Days` },
              ],
            },
          }),
        });

        const paystackData = await paystackRes.json();
        if (paystackData.status && paystackData.data?.authorization_url) {
          return {
            success: true,
            campaign,
            reference,
            checkoutUrl: paystackData.data.authorization_url,
          };
        }
      } catch (gatewayErr) {
        console.warn('Paystack ad initialization warning:', gatewayErr);
      }
    }

    // Fallback if live gateway is unreachable or unconfigured in dev
    return {
      success: true,
      campaign,
      reference,
      checkoutUrl: `/merchant/ads?activated=true&ref=${reference}`,
    };
  },

  /**
   * Activate an ad campaign and update the equipment promotion status
   */
  async activateCampaign(referenceOrId: string, bypassPaymentCheck = false) {
    // 1. Find campaign
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(referenceOrId);
    let query = supabaseServer.from('ad_campaigns').select('*');
    if (isUuid) {
      query = query.eq('id', referenceOrId);
    } else {
      query = query.eq('payment_reference', referenceOrId);
    }

    const { data: campaign, error } = await query.maybeSingle();
    if (error || !campaign) {
      throw new Error(`Ad campaign not found: ${referenceOrId}`);
    }

    if (campaign.status === 'ACTIVE') {
      return { success: true, campaign, alreadyActive: true };
    }

    // 2. Mark payment as CONFIRMED
    await supabaseServer
      .from('payments')
      .update({
        status: PAYMENT_STATUS.CONFIRMED,
        paid_at: new Date().toISOString(),
      })
      .eq('reference', campaign.payment_reference);

    // 3. Mark campaign as ACTIVE with refreshed duration dates
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + campaign.duration_days * 24 * 60 * 60 * 1000);

    const { data: updatedCampaign, error: updateErr } = await supabaseServer
      .from('ad_campaigns')
      .update({
        status: 'ACTIVE',
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        updated_at: new Date().toISOString(),
      })
      .eq('id', campaign.id)
      .select()
      .single();

    if (updateErr) {
      console.error('Error activating ad campaign:', updateErr);
      throw updateErr;
    }

    // 4. Update equipment record in Supabase
    const isFeatured =
      campaign.package_type === 'HOMEPAGE_HERO_SPOTLIGHT' ||
      campaign.package_type === 'HOMEPAGE_FEATURED_GRID';

    await supabaseServer
      .from('equipment')
      .update({
        promotion_tier: campaign.package_type,
        is_featured: isFeatured,
        promotion_expires_at: endDate.toISOString(),
      })
      .eq('id', campaign.equipment_id);

    // 5. Notify Merchant
    const pkg = AD_PACKAGES.find((p) => p.type === campaign.package_type);
    const { data: eq } = await supabaseServer
      .from('equipment')
      .select('name')
      .eq('id', campaign.equipment_id)
      .maybeSingle();

    const eqName = eq?.name || 'Equipment';
    const pkgLabel = pkg?.label || campaign.package_type;

    // Look up user_id of merchant profile for notification
    const { data: profile } = await supabaseServer
      .from('merchant_profiles')
      .select('user_id')
      .eq('id', campaign.merchant_id)
      .maybeSingle();

    if (profile?.user_id) {
      await notifyUser(profile.user_id, {
        title: '🚀 Ad Campaign Activated!',
        message: `Your promotional campaign "${pkgLabel}" for ${eqName} is now live and boosting marketplace ranking.`,
        link: '/merchant/ads',
        type: 'SYSTEM',
      });
    }

    await notifyAdmins(['OPERATIONS_ADMIN', 'SUPER_ADMIN'], {
      title: '📈 New Merchant Ad Campaign Live',
      message: `${eqName} promoted with ${pkgLabel} (₦${campaign.amount_paid?.toLocaleString()})`,
      link: '/admin/operations',
      type: 'PAYMENT',
    });

    return { success: true, campaign: updatedCampaign };
  },

  /**
   * Track ad performance telemetry (impressions, clicks, enquiries)
   */
  async recordMetric(equipmentId: string, metric: 'impression' | 'click' | 'enquiry') {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data: campaign } = await supabaseServer
        .from('ad_campaigns')
        .select('id, impressions_count, clicks_count, enquiries_count')
        .eq('equipment_id', equipmentId)
        .eq('status', 'ACTIVE')
        .gte('end_date', today)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!campaign) return;

      const column =
        metric === 'impression'
          ? 'impressions_count'
          : metric === 'click'
          ? 'clicks_count'
          : 'enquiries_count';

      const currentVal = (campaign as any)[column] || 0;

      await supabaseServer
        .from('ad_campaigns')
        .update({
          [column]: currentVal + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', campaign.id);
    } catch (e) {
      // Telemetry failures should never disrupt user browsing
      console.warn('Ad metric recording error:', e);
    }
  },
};
