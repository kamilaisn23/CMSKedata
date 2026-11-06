import { signWebhookPayload } from './security.js';
import { prisma } from './db.js';

export interface WebhookEventPayload {
  event: 'post.published' | 'post.updated' | 'post.deleted' | 'page.published' | 'page.updated' | 'page.deleted' | 'site.updated';
  siteSlug: string;
  siteId: string;
  entityType: string;
  entityId: string;
  timestamp: string;
  data: any;
}

export async function triggerSiteWebhook(siteId: string, event: WebhookEventPayload['event'], entityType: string, entityId: string, data: any): Promise<void> {
  try {
    const site = await prisma.site.findUnique({
      where: { id: siteId },
      select: { slug: true, webhookUrl: true, webhookSecret: true },
    });

    if (!site || !site.webhookUrl) {
      return;
    }

    const payload: WebhookEventPayload = {
      event,
      siteSlug: site.slug,
      siteId,
      entityType,
      entityId,
      timestamp: new Date().toISOString(),
      data,
    };

    const payloadString = JSON.stringify(payload);
    const signature = site.webhookSecret
      ? signWebhookPayload(payloadString, site.webhookSecret)
      : '';

    // Fire and forget with 4-second timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    fetch(site.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Kedata-CMS-Webhook/1.0',
        'X-Kedata-Event': event,
        'X-Kedata-Signature': signature ? `sha256=${signature}` : '',
      },
      body: payloadString,
      signal: controller.signal,
    })
      .then(async (res) => {
        clearTimeout(timeout);
        // Log webhook delivery in audit log
        await prisma.auditLog.create({
          data: {
            siteId,
            actor: 'system:webhook',
            action: 'WEBHOOK_DELIVERED',
            entityType: 'Webhook',
            entityId,
            details: JSON.stringify({
              url: site.webhookUrl,
              status: res.status,
              event,
            }),
          },
        }).catch(() => {});
      })
      .catch(async (err) => {
        clearTimeout(timeout);
        await prisma.auditLog.create({
          data: {
            siteId,
            actor: 'system:webhook',
            action: 'WEBHOOK_FAILED',
            entityType: 'Webhook',
            entityId,
            details: JSON.stringify({
              url: site.webhookUrl,
              error: err.message,
              event,
            }),
          },
        }).catch(() => {});
      });
  } catch (err) {
    console.error('Webhook trigger error:', err);
  }
}
