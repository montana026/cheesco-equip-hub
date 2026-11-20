import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/services/auth.service';
import { clearAuthCookies } from '@/lib/cookies';

export async function POST(request: NextRequest) {
  try {
    const token =
      request.cookies.get('sb-access-token')?.value ||
      request.cookies.get('auth_token')?.value;
    await authService.signOut(token);
  } catch (error: any) {
    console.error('Logout error:', error);
  }

  const response = NextResponse.json({
    message: 'Logged out successfully',
  });

  // Thoroughly clear all session and auth cookies
  clearAuthCookies(response);

  return response;
}
