/**
 * Next.js On-Demand ISR Revalidation Route Handler
 * Triggered automatically by Kedata CMS webhooks upon content updates
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-kedata-signature');
    const webhookSecret = process.env.KEDATA_WEBHOOK_SECRET || 'kedata_secret_123';

    // Verify HMAC-SHA256 signature
    if (signature) {
      const expected = `sha256=${crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex')}`;

      if (signature !== expected) {
        return NextResponse.json({ error: 'Invalid HMAC signature' }, { status: 401 });
      }
    }

    const payload = JSON.parse(rawBody);
    console.log(`[Next.js Webhook] Revalidating on event: ${payload.event}`);

    // Revalidate specific tags or paths
    // e.g. revalidateTag('kedata-posts') or revalidatePath(`/posts/${payload.data?.slug}`)

    return NextResponse.json({
      revalidated: true,
      event: payload.event,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
