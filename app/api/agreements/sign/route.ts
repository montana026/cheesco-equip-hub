import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { notificationService } from '@/lib/services/notification.service';
import { verifyCustomerAuth } from '@/lib/admin-auth';

const ADMIN_ROLES = ['SUPER_ADMIN', 'OPERATIONS_ADMIN', 'FINANCE_ADMIN', 'VERIFICATION_ADMIN', 'SUPPORT_ADMIN'];

export async function POST(request: NextRequest) {
  try {
    // Verify authentication via verifyCustomerAuth (supports cookies and Bearer token)
    const auth = await verifyCustomerAuth(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: auth.status || 401 });
    }

    const body = await request.json();
    const { rentalRequestId, signature, ipAddress } = body;

    // Verify rental request belongs to this customer
    const { data: rentalRequest, error: rentalError } = await supabaseServer
      .from('rental_requests')
      .select('*, quotation:quotations(*)')
      .eq('id', rentalRequestId)
      .eq('customer_id', auth.userId)
      .single();

    if (rentalError || !rentalRequest) {
      return NextResponse.json({ error: 'Rental request not found' }, { status: 404 });
    }

    // Verify quotation has been accepted
    if (rentalRequest.current_state !== 'QUOTATION_ACCEPTED') {
      return NextResponse.json(
        { error: 'Quotation must be accepted before signing agreement' },
        { status: 400 }
      );
    }

    // Generate agreement terms
    const termsAndConditions = generateAgreementTerms(rentalRequest);

    // Create or update rental agreement
    const { data: agreement, error: agreementError } = await supabaseServer
      .from('rental_agreements')
      .upsert({
        rental_request_id: rentalRequestId,
        quotation_id: rentalRequest.quotation.id,
        terms_and_conditions: termsAndConditions,
        customer_signed_at: new Date().toISOString(),
        customer_ip_address: ipAddress,
      }, {
        onConflict: 'rental_request_id',
      })
      .select()
      .single();

    if (agreementError) {
      console.error('Error creating agreement:', agreementError);
      throw new Error('Failed to create rental agreement');
    }

    // Update rental state to AGREEMENT_SIGNED
    const { error: stateError } = await supabaseServer
      .from('rental_requests')
      .update({ current_state: 'AGREEMENT_SIGNED' })
      .eq('id', rentalRequestId);

    if (stateError) {
      console.error('Error updating rental state:', stateError);
    }

    // Log state change
    await supabaseServer.from('rental_state_history').insert({
      rental_request_id: rentalRequestId,
      from_state: 'QUOTATION_ACCEPTED',
      to_state: 'AGREEMENT_SIGNED',
      changed_by: auth.userId,
      notes: `Agreement signed digitally. Signature: ${signature}`,
    });

    // Send notification to operations team
    try {
      // Get rental request with customer and merchant info
      const { data: rentalRequestWithDetails } = await supabaseServer
        .from('rental_requests')
        .select(`
          *,
          customer:users!customer_id(id, full_name),
          merchant:merchant_profiles!merchant_id(business_name)
        `)
        .eq('id', rentalRequestId)
        .single();

      if (rentalRequestWithDetails) {
        await notificationService.send({
          userId: rentalRequestWithDetails.merchant_id, // Send to merchant (could also send to operations team)
          title: 'Rental Agreement Signed',
          message: `The rental agreement for ${rentalRequestWithDetails.name} has been signed by the customer.`,
          type: 'SUCCESS',
          category: 'AGREEMENT',
          referenceId: rentalRequestWithDetails.reference_number,
          actionUrl: `/admin/operations?requestId=${rentalRequestId}`,
          channels: ['IN_APP', 'EMAIL'],
        });
      }
    } catch (notificationError) {
      console.error('Failed to send agreement notification:', notificationError);
      // Don't fail the request if notifications fail
    }

    // TODO: Generate PDF version of agreement

    return NextResponse.json({
      success: true,
      data: agreement,
      message: 'Agreement signed successfully',
    });
  } catch (error: any) {
    console.error('[/api/agreements/sign] Error signing agreement:', error);
    return NextResponse.json(
      { error: 'An internal error occurred. Please try again.' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rentalRequestId = searchParams.get('rentalRequestId');

    // Verify authentication
    const auth = await verifyCustomerAuth(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: auth.status || 401 });
    }

    if (!rentalRequestId) {
      return NextResponse.json({ error: 'Rental request ID required' }, { status: 400 });
    }

    // Ownership check: must be admin, customer, or merchant for this rental
    const isAdmin = ADMIN_ROLES.includes(auth.role);
    if (!isAdmin) {
      const { data: rental } = await supabaseServer
        .from('rental_requests')
        .select('customer_id, merchant_id')
        .eq('id', rentalRequestId)
        .maybeSingle();

      if (!rental) {
        return NextResponse.json({ error: 'Rental request not found' }, { status: 404 });
      }

      let isMerchant = false;
      if (rental.merchant_id) {
        const { data: merchantProfile } = await supabaseServer
          .from('merchant_profiles')
          .select('id')
          .eq('user_id', auth.userId)
          .maybeSingle();

        if (merchantProfile && merchantProfile.id === rental.merchant_id) {
          isMerchant = true;
        }
      }

      const isCustomer = rental.customer_id === auth.userId;
      if (!isCustomer && !isMerchant) {
        return NextResponse.json({ error: 'Forbidden: You do not have access to this agreement' }, { status: 403 });
      }
    }

    // Get agreement
    const { data: agreement, error } = await supabaseServer
      .from('rental_agreements')
      .select('*')
      .eq('rental_request_id', rentalRequestId)
      .single();

    if (error) {
      return NextResponse.json({ error: 'Agreement not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: agreement,
    });
  } catch (error: any) {
    console.error('[/api/agreements/sign] Error fetching agreement:', error);
    return NextResponse.json(
      { error: 'An internal error occurred. Please try again.' },
      { status: 500 }
    );
  }
}

function generateAgreementTerms(rentalRequest: any): string {
  return `
RENTAL AGREEMENT TERMS AND CONDITIONS

1. PAYMENT TERMS
Full rental payment and damage deposit must be paid before equipment delivery.

2. DAMAGE DEPOSIT
Deposit will be refunded within 7 business days after rental completion, less any deductions for damage.

3. EQUIPMENT CONDITION
Equipment will be inspected before delivery and after return. Renter is responsible for maintaining equipment.

4. DELIVERY & RETURN
${rentalRequest.delivery_required
  ? 'Equipment will be delivered to project location by Cheesco-coordinated logistics.'
  : 'Renter is responsible for equipment pickup and return.'}

${rentalRequest.operator_required
  ? '5. OPERATOR\nQualified operator provided. Costs included in rental fee.\n\n6. LIABILITY & INSURANCE'
  : '5. LIABILITY & INSURANCE'}
Renter assumes full responsibility for equipment during rental period.

${rentalRequest.operator_required ? '7' : '6'}. CANCELLATION
Cancellations must be made through Cheesco Equip Hub. Fees may apply.

${rentalRequest.operator_required ? '8' : '7'}. DISPUTE RESOLUTION
Disputes will be mediated by Cheesco Equip Hub.

${rentalRequest.operator_required ? '9' : '8'}. GOVERNING LAW
This agreement is governed by Nigerian law.

Agreement Date: ${new Date().toISOString()}
Rental Period: ${rentalRequest.start_date} to ${rentalRequest.end_date}
`;
}
