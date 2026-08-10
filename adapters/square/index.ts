import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type { ProviderAdapter } from '../../packages/core/src/provider-adapter.js';
import type { WebhookRequest } from '../../packages/core/src/webhook.js';

export interface SquareAdapterOptions {
  signatureKey: string;
  notificationUrl: string;
}

interface SquareWebhookPayload {
  event_id?: string;
  type?: string;
  created_at?: string;
  merchant_id?: string;
  data?: {
    type?: string;
    id?: string;
    object?: Record<string, unknown>;
  };
}

function constantTimeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left, 'utf8');
  const b = Buffer.from(right, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

export function createSquareAdapter(options: SquareAdapterOptions): ProviderAdapter<SquareWebhookPayload> {
  return {
    name: 'square',
    capabilities: new Set([
      'customers.read',
      'orders.read',
      'payments.read',
      'webhooks.verify',
      'webhooks.normalize',
    ]),
    verifier: {
      verify(request: WebhookRequest) {
        const supplied = request.headers['x-square-hmacsha256-signature'];
        if (!supplied) return { ok: false, reason: 'missing_signature' };
        const expected = createHmac('sha256', options.signatureKey)
          .update(`${options.notificationUrl}${request.rawBody}`)
          .digest('base64');
        return constantTimeEqual(expected, supplied)
          ? { ok: true }
          : { ok: false, reason: 'invalid_signature' };
      },
    },
    normalizer: {
      normalize(request: WebhookRequest) {
        const payload = JSON.parse(request.rawBody) as SquareWebhookPayload;
        const eventType = payload.type ?? 'square.unknown';
        const providerEventId = payload.event_id
          ?? createHash('sha256').update(request.rawBody).digest('hex');
        return {
          provider: 'square',
          providerEventId,
          eventType,
          occurredAt: payload.created_at ?? request.receivedAt ?? new Date().toISOString(),
          receivedAt: request.receivedAt ?? new Date().toISOString(),
          payload,
        };
      },
    },
    identityFromEvent(event) {
      const object = event.payload.data?.object ?? {};
      const payment = object['payment'] as Record<string, unknown> | undefined;
      const order = object['order'] as Record<string, unknown> | undefined;
      const customer = object['customer'] as Record<string, unknown> | undefined;
      const customerId = payment?.['customer_id'] ?? order?.['customer_id'] ?? customer?.['id'];
      if (typeof customerId !== 'string' || !customerId) return undefined;
      return {
        provider: 'square',
        providerIdentityType: 'customer',
        providerIdentityId: customerId,
        email: typeof customer?.['email_address'] === 'string' ? customer['email_address'] : undefined,
        phone: typeof customer?.['phone_number'] === 'string' ? customer['phone_number'] : undefined,
      };
    },
  };
}
