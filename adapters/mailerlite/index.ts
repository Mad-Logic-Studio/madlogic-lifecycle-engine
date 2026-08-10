import { createHash } from 'node:crypto';
import type { ProviderAdapter } from '../../packages/core/src/provider-adapter.js';
import type { WebhookRequest } from '../../packages/core/src/webhook.js';
import { verifyHmacSha256 } from '../../packages/core/src/webhook.js';

export interface MailerLiteAdapterOptions {
  webhookSecret: string;
}

interface MailerLiteWebhookPayload {
  id?: string | number;
  email?: string;
  event?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  fields?: Record<string, unknown>;
  [key: string]: unknown;
}

export function createMailerLiteAdapter(options: MailerLiteAdapterOptions): ProviderAdapter<MailerLiteWebhookPayload> {
  return {
    name: 'mailerlite',
    capabilities: new Set([
      'crm.read',
      'crm.write',
      'webhooks.verify',
      'webhooks.normalize',
    ]),
    verifier: {
      verify(request: WebhookRequest) {
        const supplied = request.headers['signature'];
        if (!supplied) return { ok: false, reason: 'missing_signature' };
        return verifyHmacSha256(options.webhookSecret, request.rawBody, supplied)
          ? { ok: true }
          : { ok: false, reason: 'invalid_signature' };
      },
    },
    normalizer: {
      normalize(request: WebhookRequest) {
        const payload = JSON.parse(request.rawBody) as MailerLiteWebhookPayload;
        const eventType = typeof payload.event === 'string' ? payload.event : 'mailerlite.unknown';
        const identity = payload.id == null ? '' : String(payload.id);
        const providerEventId = createHash('sha256')
          .update(`${eventType}:${identity}:${request.rawBody}`)
          .digest('hex');
        return {
          provider: 'mailerlite',
          providerEventId,
          eventType,
          occurredAt: payload.updated_at ?? payload.created_at ?? request.receivedAt ?? new Date().toISOString(),
          receivedAt: request.receivedAt ?? new Date().toISOString(),
          payload,
        };
      },
    },
    identityFromEvent(event) {
      const id = event.payload.id == null ? undefined : String(event.payload.id);
      if (!id) return undefined;
      const phone = event.payload.fields?.['phone'];
      return {
        provider: 'mailerlite',
        providerIdentityType: 'subscriber',
        providerIdentityId: id,
        email: event.payload.email,
        phone: typeof phone === 'string' ? phone : undefined,
      };
    },
  };
}
