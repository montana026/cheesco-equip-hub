import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/services/auth.service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { email, password, fullName, phone, role, businessName } = body;

    // Validate required fields
    if (!email || !password || !fullName || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // For merchants, business name is required
    if (role === 'MERCHANT' && !businessName) {
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
      role,
      businessName,
    });

    return NextResponse.json({
      data: result,
      message: 'Account created successfully. Please check your email to verify your account.',
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create account' },
      { status: 500 }
    );
  }
}
