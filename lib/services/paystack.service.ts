/* ── Paystack Service for Payment Processing and Refunds ─────────────────────── */

export async function initiateRefund(
  paymentReference: string,
  amount: number,
  reason: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const response = await fetch('https://api.paystack.co/refund', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transaction: paymentReference,
        amount: amount * 100, // Convert to kobo (smallest currency unit)
        merchant_note: reason,
      }),
    });

    const result = await response.json();

    if (!result.status) {
      throw new Error(result.message || 'Refund failed');
    }

    return { success: true, data: result.data };
  } catch (error: any) {
    console.error('Paystack refund error:', error);
    return { success: false, error: error.message };
  }
}

export async function verifyPayment(reference: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();

    if (!result.status) {
      throw new Error(result.message || 'Payment verification failed');
    }

    return { success: true, data: result.data };
  } catch (error: any) {
    console.error('Paystack verification error:', error);
    return { success: false, error: error.message };
  }
}