import { NextRequest, NextResponse } from 'next/server';
import { verifyMerchantAuth } from '@/lib/admin-auth';
import { adCampaignService } from '@/lib/services/ad-campaign.service';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyMerchantAuth(request);
    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' },
        { status: auth.status || 401 }
      );
    }

    const body = await request.json();
    const reference = body.reference || body.paymentReference || body.campaignId;

    if (!reference) {
      return NextResponse.json({ error: 'Missing payment reference' }, { status: 400 });
    }

    const result = await adCampaignService.activateCampaign(reference);

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Ad campaign activated successfully',
    });
  } catch (error: any) {
    console.error('[/api/merchant/ads/activate] Error:', error);
    return NextResponse.json(
      { error: 'An internal error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
