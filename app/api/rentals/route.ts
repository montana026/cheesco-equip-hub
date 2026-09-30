import { NextRequest, NextResponse } from 'next/server';
import { rentalService } from '@/lib/services/rental.service';
import { authService } from '@/lib/services/auth.service';

export async function POST(request: NextRequest) {
  try {
    // Get current user
    const user = await authService.getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (user.role !== 'CUSTOMER') {
      return NextResponse.json(
        { error: 'Only customers can submit rental requests' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.equipmentId || !body.startDate || !body.endDate || !body.projectLocation) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const rentalRequest = await rentalService.createRequest({
      customerId: user.id,
      equipmentId: body.equipmentId,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      projectLocation: body.projectLocation,
      projectType: body.projectType,
      operatorRequired: body.operatorRequired || false,
      deliveryRequired: body.deliveryRequired !== false, // default true
      additionalRequirements: body.additionalRequirements,
    });

    return NextResponse.json({
      data: rentalRequest,
      message: 'Rental request submitted successfully. Cheesco will verify and send you a quotation.',
    });
  } catch (error: any) {
    console.error('Rental request creation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create rental request' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await authService.getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    let requests;

    if (user.role === 'CUSTOMER') {
      requests = await rentalService.getCustomerRequests(user.id);
    } else if (user.role === 'MERCHANT' && user.merchant_profile?.[0]) {
      requests = await rentalService.getMerchantRequests(user.merchant_profile[0].id);
    } else {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    return NextResponse.json({ data: requests });
  } catch (error) {
    console.error('Rental requests fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rental requests' },
      { status: 500 }
    );
  }
}
