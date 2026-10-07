import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { storageService } from '@/lib/services/storage.service';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get merchant profile for this user
    const { data: merchantProfile, error: profileError } = await supabase
      .from('merchant_profiles')
      .select(`
        *,
        user:users!inner(full_name)
      `)
      .eq('user_id', user.id)
      .single();

    if (profileError || !merchantProfile) {
      return NextResponse.json({ error: 'Merchant profile not found' }, { status: 404 });
    }

    // Get merchant documents
    const { data: documents, error: docsError } = await supabase
      .from('merchant_documents')
      .select('*')
      .eq('merchant_id', merchantProfile.id)
      .order('uploaded_at', { ascending: false });

    if (docsError) {
      console.error('Error fetching merchant documents:', docsError);
    }

    // Format response
    const verificationData = {
      id: merchantProfile.id,
      businessName: merchantProfile.business_name,
      verificationStatus: merchantProfile.verification_status,
      verificationNotes: merchantProfile.verification_notes,
      verifiedAt: merchantProfile.verified_at,
      verifiedBy: merchantProfile.verified_by
        ? await (async () => {
            const { data } = await supabase
              .from('users')
              .select('full_name')
              .eq('id', merchantProfile.verified_by)
              .single();
            return data?.full_name || null;
          })().catch(() => null)
        : null,
      documents: (documents || []).map(doc => ({
        id: doc.id,
        documentType: doc.document_type,
        documentUrl: doc.document_url,
        uploadedAt: doc.uploaded_at,
      })),
      createdAt: merchantProfile.created_at,
      updatedAt: merchantProfile.updated_at,
    };

    return NextResponse.json({
      success: true,
      data: verificationData,
    });
  } catch (error: any) {
    console.error('Error fetching merchant verification:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch verification status' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get merchant profile for this user
    const { data: merchantProfile, error: profileError } = await supabase
      .from('merchant_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !merchantProfile) {
      return NextResponse.json({ error: 'Merchant profile not found' }, { status: 404 });
    }

    const body = await request.json();
    const { documentType, documents } = body;

    // Validate input
    if (!documentType) {
      return NextResponse.json({ error: 'Document type is required' }, { status: 400 });
    }

    if (!documents || documents.length === 0) {
      return NextResponse.json({ error: 'At least one document is required' }, { status: 400 });
    }

    // Upload actual documents to Supabase Storage
    // The frontend has already uploaded the documents and sent the URLs, so we just store them

    const documentInserts = documents.map((url: string, index: number) => ({
      merchant_id: merchantProfile.id,
      document_type: documentType,
      document_url: url, // This is the actual storage URL from the frontend
      uploaded_at: new Date().toISOString(),
    }));

    const { error: insertError } = await supabase
      .from('merchant_documents')
      .insert(documentInserts);

    if (insertError) {
      console.error('Error inserting merchant documents:', insertError);
      throw new Error('Failed to upload documents');
    }

    // Update merchant verification status to SUBMITTED (if not already)
    const { error: updateError } = await supabase
      .from('merchant_profiles')
      .update({
        verification_status: 'SUBMITTED',
        updated_at: new Date().toISOString(),
      })
      .eq('id', merchantProfile.id);

    if (updateError) {
      console.error('Error updating verification status:', updateError);
      throw new Error('Failed to update verification status');
    }

    // TODO: Trigger notification to verification admins

    return NextResponse.json({
      success: true,
      message: 'Documents uploaded successfully. Your verification is now under review.',
    });
  } catch (error: any) {
    console.error('Error uploading verification documents:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload verification documents' },
      { status: 500 }
    );
  }
}
