import { NextRequest, NextResponse } from 'next/server';
import { rentalService } from '@/lib/services/rental.service';
import { verifyCustomerAuth } from '@/lib/admin-auth';
import { supabaseServer } from '@/lib/supabase/server';
import { checkRateLimit, checkDailyQuota, COST_CONTROLS, getClientIp } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user via bearer token or cookie
    const auth = await verifyCustomerAuth(request);

    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Please log in to submit a rental request' },
        { status: auth.status || 401 }
      );
    }

    // Rate limit & Abuse quota: prevent booking spam
    const clientKey = auth.userId || getClientIp(request);
    const rateLimit = await checkRateLimit(`rental_submit:${clientKey}`, 5, 600_000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many booking requests submitted. Please wait a few minutes before submitting another.' },
        { status: 429 }
      );
    }

    const dailyQuota = await checkDailyQuota('rental_request', clientKey, COST_CONTROLS.MAX_DAILY_RENTAL_REQUESTS_PER_USER);
    if (!dailyQuota.allowed) {
      return NextResponse.json(
        { success: false, error: 'Daily booking request quota reached (10 requests/day). Please contact Cheesco support for bulk fleet arrangements.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const isPurchase = body.kind === 'buy' || body.requestType === 'PURCHASE';

    // Validate required fields
    if (!body.equipmentId || !body.projectLocation || (!isPurchase && !body.startDate)) {
      return NextResponse.json(
        {
          success: false,
          error: isPurchase
            ? 'Missing required fields: equipment and delivery destination / company yard address are required'
            : 'Missing required fields: equipment, start date, and project location are required',
        },
        { status: 400 }
      );
    }

    const startDate = body.startDate ? new Date(body.startDate) : new Date();
    const durationDays = isPurchase ? 1 : Math.max(1, Number(body.durationDays) || 1);
    const endDate = body.endDate
      ? new Date(body.endDate)
      : new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

    const scopeOfWork = (body.scopeOfWork || body.projectType || 'General Construction').trim();
    const maxTonnage = body.maxTonnage ? `${body.maxTonnage}`.trim() : '';

    // API-layer guard: reject leased equipment before touching the service
    const { data: equipCheck } = await supabaseServer
      .from('equipment')
      .select('availability_status, name, listing_type')
      .eq('id', body.equipmentId)
      .maybeSingle();

    if (equipCheck?.availability_status === 'RENTED') {
      return NextResponse.json(
        {
          success: false,
          error: `"${equipCheck.name}" is currently deployed on an active lease and is not available for ${isPurchase ? 'purchase' : 'new bookings'}. Please browse our catalog for available equipment.`,
        },
        { status: 409 }
      );
    }

    // Strict listing type enforcement: equipment for sale cannot be rented, and vice versa
    if (equipCheck?.listing_type === 'FOR_SALE' && !isPurchase) {
      return NextResponse.json(
        {
          success: false,
          error: `"${equipCheck.name}" is listed exclusively for outright purchase and cannot be rented.`,
        },
        { status: 400 }
      );
    }

    if (equipCheck?.listing_type === 'FOR_RENT' && isPurchase) {
      return NextResponse.json(
        {
          success: false,
          error: `"${equipCheck.name}" is listed exclusively for rental lease and cannot be purchased.`,
        },
        { status: 400 }
      );
    }

    // Assemble comprehensive requirements string
    const notesParts: string[] = [];

    if (isPurchase) {
      notesParts.push('[PURCHASE / OUTRIGHT ACQUISITION]');
      if (body.intendedIndustry) {
        notesParts.push(`Industry: ${body.intendedIndustry.trim()}`);
      }
      if (body.inspectionPreference) {
        notesParts.push(`Inspection Preference: ${body.inspectionPreference.trim()}`);
      }
      if (body.inspectionDate) {
        notesParts.push(`Requested Inspection Date: ${body.inspectionDate.trim()}`);
      }
      if (body.paymentPreference) {
        notesParts.push(`Payment Structure: ${body.paymentPreference.trim()}`);
      }
      if (body.companyName) {
        notesParts.push(`Buyer Company: ${body.companyName.trim()}`);
      }
      if (body.rcNumber) {
        notesParts.push(`RC / Tax ID: ${body.rcNumber.trim()}`);
      }
    } else {
      if (maxTonnage) {
        notesParts.push(`Max Tonnage: ${maxTonnage} Tonnes`);
      }
      if (scopeOfWork && scopeOfWork !== 'General Construction') {
        notesParts.push(`Scope: ${scopeOfWork}`);
      }
    }

    if (body.additionalRequirements && typeof body.additionalRequirements === 'string') {
      const existing = body.additionalRequirements.trim();
      if (existing && !notesParts.some((p) => existing.includes(p))) {
        notesParts.push(existing);
      }
    }
    const combinedRequirements = notesParts.join(' | ') || (body.additionalRequirements || null);

    const rentalRequest = await rentalService.createRequest({
      customerId: auth.userId,
      equipmentId: body.equipmentId,
      startDate,
      endDate,
      projectLocation: body.projectLocation,
      projectType: isPurchase ? `Purchase: ${body.intendedIndustry || 'Machinery'}` : scopeOfWork,
      operatorRequired: isPurchase ? false : Boolean(body.operatorRequired),
      deliveryRequired: body.deliveryRequired !== false, // default true
      additionalRequirements: combinedRequirements || '',
      isPurchase,
    });

    return NextResponse.json({
      success: true,
      data: rentalRequest,
      message: isPurchase
        ? 'Purchase request submitted successfully. Cheesco will verify title, mechanical diagnostics, and issue a Proforma Invoice.'
        : 'Rental request submitted successfully. Cheesco will verify and send you a quotation.',
    });
  } catch (error: any) {
    console.error('[/api/rentals] Rental request creation error:', error);
    return NextResponse.json(
      { success: false, error: 'An internal error occurred. Please try again.' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyCustomerAuth(request);

    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: auth.status || 401 }
      );
    }

    let requests: any[] = [];

    // Merchants see their own equipment requests
    if (auth.role === 'MERCHANT') {
      const { data: merchantProfile } = await supabaseServer
        .from('merchant_profiles')
        .select('id')
        .eq('user_id', auth.userId)
        .maybeSingle();
      if (merchantProfile?.id) {
        requests = await rentalService.getMerchantRequests(merchantProfile.id);
      }
    } else {
      requests = await rentalService.getCustomerRequests(auth.userId);
      // If an administrator is viewing the customer portal to test/simulate,
      // fallback to the most recent rental requests so they see active items
      if ((!requests || requests.length === 0) && ['SUPER_ADMIN', 'OPERATIONS_ADMIN', 'ADMIN'].includes(auth.role)) {
        const { data: adminFallback } = await supabaseServer
          .from('rental_requests')
          .select(`
            *,
            equipment:equipment(
              name,
              category,
              images:equipment_images(image_url, is_primary)
            ),
            quotation:quotations(id, status, total_amount, reference_number)
          `)
          .order('created_at', { ascending: false })
          .limit(20);
        if (adminFallback && adminFallback.length > 0) {
          requests = adminFallback;
        }
      }
    }

    const normalized = (requests || []).map((r: any) => {
      const eqName = r.equipment?.name || (Array.isArray(r.equipment) ? r.equipment[0]?.name : null) || r.equipmentName || 'Equipment';
      return {
        ...r,
        referenceNumber: r.reference_number || r.referenceNumber || 'REQ-PENDING',
        equipmentName: eqName,
        startDate: r.start_date || r.startDate,
        endDate: r.end_date || r.endDate,
        durationDays: r.duration_days ?? r.durationDays ?? 30,
        projectLocation: r.project_location || r.projectLocation || 'N/A',
        currentState: r.current_state || r.currentState || 'REQUEST_SUBMITTED',
        createdAt: r.created_at || r.createdAt,
      };
    });

    return NextResponse.json({ success: true, data: normalized });
  } catch (error: any) {
    console.error('[/api/rentals] Rental requests fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'An internal error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
