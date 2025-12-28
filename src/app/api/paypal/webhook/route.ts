import { NextRequest, NextResponse } from 'next/server';
import { addBitsWithRoleUpdate } from '@/services/bits-role-manager';

// PayPal webhook verification (simplified - in production you'd verify the signature)
async function verifyPayPalWebhook(request: NextRequest): Promise<boolean> {
  // In production, implement proper webhook signature verification
  // For now, we'll trust the request comes from PayPal
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // Verify webhook authenticity
    const isValid = await verifyPayPalWebhook(request);
    if (!isValid) {
      console.error('[PayPal Webhook] Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const body = await request.json();
    const { event_type, resource } = body;

    console.log(`[PayPal Webhook] Received event: ${event_type}`);

    // Handle payment capture completed
    if (event_type === 'PAYMENT.CAPTURE.COMPLETED') {
      const { amount, custom_id } = resource;

      if (!custom_id) {
        console.error('[PayPal Webhook] No custom_id in payment capture');
        return NextResponse.json({ error: 'Missing custom_id' }, { status: 400 });
      }

      // custom_id should contain the Discord user ID
      const discordUserId = custom_id;
      const paymentAmount = parseFloat(amount.value);

      // Convert dollars to bits ($1 = 100 bits)
      const bitsToAdd = Math.floor(paymentAmount * 100);

      console.log(`[PayPal Webhook] Adding ${bitsToAdd} bits to user ${discordUserId} for $${paymentAmount}`);

      await addBitsWithRoleUpdate(discordUserId, bitsToAdd);

      return NextResponse.json({ success: true });
    }

    // Handle other events if needed
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[PayPal Webhook] Error processing webhook:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
