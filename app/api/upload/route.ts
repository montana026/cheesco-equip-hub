import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { verifyCustomerAuth } from '@/lib/admin-auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

const ALLOWED_BUCKETS = new Set([
  'equipment-images',
  'equipment-documents',
  'inspection-photos',
  'merchant-documents',
]);

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'pdf']);
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit

export async function POST(request: NextRequest) {
  try {
    // 1. Enforce authentication
    const auth = await verifyCustomerAuth(request);
    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized: You must be logged in to upload files' },
        { status: auth.status || 401 }
      );
    }

    // 2. Rate limiting (max 20 uploads per minute per user/IP)
    const clientKey = `upload:${auth.userId || getClientIp(request)}`;
    const rateLimit = await checkRateLimit(clientKey, 20, 60_000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many uploads. Please wait a minute before uploading again.' },
        { status: 429 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const bucket = (formData.get('bucket') as string) || 'equipment-images';
    const pathPrefix = (formData.get('path') as string) || '';
    const isPublic = formData.get('isPublic') !== 'false';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // 2. Validate storage bucket against strict whitelist
    if (!ALLOWED_BUCKETS.has(bucket)) {
      return NextResponse.json({ error: 'Invalid or restricted storage bucket' }, { status: 400 });
    }

    // 3. Enforce maximum file size (10MB)
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File exceeds maximum allowed size of 10MB' },
        { status: 400 }
      );
    }

    // 4. Validate MIME type
    const fileType = (file.type || '').toLowerCase();
    if (fileType && !ALLOWED_MIME_TYPES.has(fileType)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Only JPEG, PNG, WEBP, and PDF files are allowed.' },
        { status: 400 }
      );
    }

    // 5. Sanitize and validate file extension
    const originalName = file.name || 'upload.jpg';
    const rawExt = originalName.split('.').pop()?.toLowerCase() || 'jpg';
    if (!ALLOWED_EXTENSIONS.has(rawExt)) {
      return NextResponse.json(
        { error: 'Restricted file extension. Only .jpg, .jpeg, .png, .webp, and .pdf are allowed.' },
        { status: 400 }
      );
    }

    // 6. Sanitize path prefix against directory traversal
    const safePrefix = pathPrefix
      .replace(/\.\./g, '')
      .replace(/[^a-zA-Z0-9_\-\/]/g, '')
      .replace(/^\/+|\/+$/g, '');

    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 10);
    const fileName = `${timestamp}-${randomString}.${rawExt}`;
    const storagePath = safePrefix ? `${safePrefix}/${fileName}` : fileName;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload using service role to bypass RLS
    const { error: uploadError } = await supabaseServer.storage
      .from(bucket)
      .upload(storagePath, buffer, {
        contentType: fileType || 'application/octet-stream',
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      console.error('[/api/upload] Storage upload error in API route:', uploadError);
      return NextResponse.json({ error: 'An internal error occurred. Please try again.' }, { status: 500 });
    }

    let url: string;
    if (isPublic) {
      const { data: publicUrlData } = supabaseServer.storage
        .from(bucket)
        .getPublicUrl(storagePath);
      url = publicUrlData.publicUrl;
    } else {
      const { data: signedUrlData } = await supabaseServer.storage
        .from(bucket)
        .createSignedUrl(storagePath, 31536000); // 1 year validity
      url = signedUrlData?.signedUrl || '';
    }

    return NextResponse.json({
      success: true,
      data: {
        url,
        path: storagePath,
        publicUrl: isPublic ? url : undefined,
      },
    });
  } catch (err: any) {
    console.error('[/api/upload] Error in /api/upload handler:', err);
    return NextResponse.json(
      { error: 'An internal error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
