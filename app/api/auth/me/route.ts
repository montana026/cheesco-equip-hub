import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/services/auth.service';

export async function GET(request: NextRequest) {
  try {
    const user = await authService.getUserFromRequest(request);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}
