import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { notificationService } from '@/lib/services/notification.service';
import { notifyAdmins } from '@/lib/notifications';
import { verifyMerchantAuth } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyMerchantAuth(request);
    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' },
        { status: auth.status || 401 }
      );
    }

    const userId = auth.userId;

    // Get merchant profile for this user
    const { data: merchantProfile } = await supabaseServer
      .from('merchant_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (!merchantProfile) {
      return NextResponse.json({
        success: true,
        data: {
          id: null,
          businessName: '',
          verificationStatus: 'NOT_STARTED',
          verificationNotes: '',
          documents: [],
        },
      });
    }

    // Get merchant documents
    const { data: documents } = await supabaseServer
      .from('merchant_documents')
      .select('*')
      .eq('merchant_id', merchantProfile.id)
      .order('uploaded_at', { ascending: false });

    // Map actual DB column names → API response fields
    const verificationData = {
      id: merchantProfile.id,
      businessName: merchantProfile.business_name || '',
      registrationNumber: merchantProfile.business_registration_number || '',
      contactPhone: merchantProfile.business_phone || '',
      address: merchantProfile.business_address || '',
      verificationStatus: merchantProfile.verification_status || 'NOT_STARTED',
      verificationNotes: merchantProfile.verification_notes || '',
      verifiedAt: merchantProfile.verified_at,
      documents: (documents || []).map((doc: any) => ({
        id: doc.id,
        documentType: doc.document_type,
        documentUrl: doc.document_url,
        uploadedAt: doc.uploaded_at,
      })),
      createdAt: merchantProfile.created_at,
      updatedAt: merchantProfile.updated_at,
    };

    return NextResponse.json({ success: true, data: verificationData });
  } catch (error: any) {
    console.error('[/api/merchant/verification] GET Error:', error);
    return NextResponse.json(
      { error: 'An internal error occurred. Please try again.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyMerchantAuth(request);
    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' },
        { status: auth.status || 401 }
      );
    }

    const user = { id: auth.userId };

    const body = await request.json();
    const {
      businessName,
      cacNumber,        // → business_registration_number
      businessType,     // stored in users.metadata or as part of business_name suffix
      contactName,      // → users.full_name
      phone,            // → business_phone
      address,          // → business_address
      documents = [],
      documentType = 'BUSINESS_REGISTRATION',
    } = body;

    // 1. Update users table with contact info
    await supabaseServer
      .from('users')
      .update({
        role: 'MERCHANT',
        ...(phone ? { phone } : {}),
        ...(contactName ? { full_name: contactName } : {}),
      })
      .eq('id', user.id);

    // 2. Fetch existing merchant profile
    let { data: merchantProfile } = await supabaseServer
      .from('merchant_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    // Build the update payload using ACTUAL column names from the DB
    const profilePayload: Record<string, any> = {
      verification_status: 'SUBMITTED',
      updated_at: new Date().toISOString(),
    };
    if (businessName) profilePayload.business_name = businessName;
    if (cacNumber) profilePayload.business_registration_number = cacNumber;
    if (phone) profilePayload.business_phone = phone;
    if (address) profilePayload.business_address = address;

    if (!merchantProfile) {
      // Create new merchant profile
      const { data: newProfile, error: createError } = await supabaseServer
        .from('merchant_profiles')
        .insert({
          user_id: user.id,
          business_name: businessName || 'Business Name Pending',
          business_registration_number: cacNumber || null,
          business_phone: phone || null,
          business_address: address || null,
          verification_status: 'SUBMITTED',
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (createError) {
        console.error('Error creating merchant profile:', createError);
        // Fallback with minimal fields
        const { data: minProfile, error: minErr } = await supabaseServer
          .from('merchant_profiles')
          .insert({
            user_id: user.id,
            business_name: businessName || 'Business Name Pending',
            verification_status: 'SUBMITTED',
          })
          .select('id')
          .single();

        if (minErr) throw minErr;
        merchantProfile = minProfile;
      } else {
        merchantProfile = newProfile;
      }
    } else {
      // Update existing profile
      const { error: updateError } = await supabaseServer
        .from('merchant_profiles')
        .update(profilePayload)
        .eq('id', merchantProfile.id);

      if (updateError) {
        console.error('Profile update error:', updateError);
      }
    }

    // 3. Insert documents into merchant_documents
    if (documents.length > 0 && merchantProfile?.id) {
      const documentInserts = documents.map((url: string) => ({
        merchant_id: merchantProfile!.id,
        document_type: documentType,
        document_url: url,
        uploaded_at: new Date().toISOString(),
      }));

      try {
        await supabaseServer.from('merchant_documents').insert(documentInserts);
      } catch (docErr) {
        console.warn('Document insert notice:', docErr);
      }
    }

    // 4. Send notification to merchant and admins
    try {
      await notificationService.send({
        userId: user.id,
        title: 'KYC Verification Submitted',
        message:
          'Your business verification documents have been received and are under review by our compliance team.',
        type: 'INFO',
        category: 'MERCHANT',
        actionUrl: '/merchant/verification',
        channels: ['IN_APP', 'EMAIL'],
      });

      await notifyAdmins(['VERIFICATION_ADMIN', 'SUPER_ADMIN'], {
        title: '🏢 New Merchant Verification Submitted',
        message: `Merchant "${businessName || 'Business Owner'}" submitted CAC & identity documents for KYC compliance review.`,
        link: '/admin/verification',
        type: 'MERCHANT',
      });
    } catch (nErr) {
      console.error('Notification dispatch error:', nErr);
    }

    return NextResponse.json({
      success: true,
      message:
        'KYC Verification submitted successfully. Your application is now in the admin review queue.',
      data: merchantProfile,
    });
  } catch (error: any) {
    console.error('[/api/merchant/verification] POST Error:', error);
    return NextResponse.json(
      { error: 'An internal error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
