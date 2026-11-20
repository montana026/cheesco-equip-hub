import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/services/auth.service';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

const ALLOWED_SIGNUP_ROLES = new Set(['CUSTOMER', 'MERCHANT']);

export async function POST(request: NextRequest) {
  try {
    // 1. Rate limiting: max 5 signups per 5 minutes per IP; fail-closed on Upstash errors
    const clientIp = getClientIp(request);
    const rateLimit = await checkRateLimit(`signup:${clientIp}`, 5, 300_000, { failClosed: true });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many registration attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { email, password, fullName, phone, role, businessName } = body;

    // Validate required fields
    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Password strength check
    if (typeof password !== 'string' || password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // 2. Privilege Escalation Prevention:
    // Only CUSTOMER or MERCHANT may be registered publicly. Admin roles are strictly blocked.
    const userRole = ALLOWED_SIGNUP_ROLES.has(role) ? role : 'CUSTOMER';

    // For merchants, business name is required
    if (userRole === 'MERCHANT' && !businessName) {
      return NextResponse.json(
        { error: 'Business name is required for merchants' },
        { status: 400 }
      );
    }

    const result = await authService.signUp({
      email,
      password,
      fullName,
      phone,
      role: userRole,
      businessName,
    });

    return NextResponse.json({
      data: result,
      message: 'Account created successfully. Please check your email to verify your account.',
    });
  } catch (error: any) {
    console.error('[/api/auth/signup] Signup error:', error);
    const msg = error?.message?.toLowerCase() || '';
    if (msg.includes('already registered') || msg.includes('already exists')) {
      return NextResponse.json(
        { error: 'An account with this email already exists.' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'An internal error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
