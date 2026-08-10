import { createHash, timingSafeEqual } from 'node:crypto';
import type { ProviderAdapter } from '../../packages/core/src/provider-adapter.js';
import type { WebhookRequest } from '../../packages/core/src/webhook.js';

export interface TrafftAdapterOptions {
  verificationToken: string;
  eventType: string;
}

type TrafftWebhookPayload = Record<string, unknown>;

function equalToken(expected: string, supplied: string): boolean {
  const normalized = supplied.toLowerCase().startsWith('bearer ')
    ? supplied.slice(7).trim()
    : supplied.trim();
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(normalized, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

function firstString(payload: TrafftWebhookPayload, keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === 'string' && value) return value;
    if (typeof value === 'number') return String(value);
  }
  return undefined;
}

export function createTrafftAdapter(options: TrafftAdapterOptions): ProviderAdapter<TrafftWebhookPayload> {
  return {
    name: 'trafft',
    capabilities: new Set([
      'customers.read',
      'appointments.read',
      'webhooks.verify',
      'webhooks.normalize',
    ]),
    verifier: {
      verify(request: WebhookRequest) {
        const supplied = request.headers['authorization'];
        if (!supplied) return { ok: false, reason: 'missing_authorization' };
        return equalToken(options.verificationToken, supplied)
          ? { ok: true }
          : { ok: false, reason: 'invalid_verification_token' };
      },
    },
    normalizer: {
      normalize(request: WebhookRequest) {
        const payload = JSON.parse(request.rawBody) as TrafftWebhookPayload;
        const appointmentId = firstString(payload, [
          'appointment_id', 'appointmentId', 'id',
        ]);
        const customerId = firstString(payload, [
          'customer_id', 'customerId', 'customerID',
        ]);
        const sourceIdentity = appointmentId ?? customerId ?? request.rawBody;
        const providerEventId = createHash('sha256')
          .update(`${options.eventType}:${sourceIdentity}:${request.rawBody}`)
          .digest('hex');
        const occurredAt = firstString(payload, [
          'appointment_start_date_time',
          'appointmentStartDateTime',
          'start_date_time',
          'startDateTime',
        ]) ?? request.receivedAt ?? new Date().toISOString();

        return {
          provider: 'trafft',
          providerEventId,
          eventType: options.eventType,
          occurredAt,
          receivedAt: request.receivedAt ?? new Date().toISOString(),
          payload,
        };
      },
    },
    identityFromEvent(event) {
      const payload = event.payload;
      const customerId = firstString(payload, ['customer_id', 'customerId', 'customerID']);
      const email = firstString(payload, ['customer_email', 'customerEmail', 'email']);
      const phone = firstString(payload, ['customer_phone', 'customerPhone', 'phone']);
      if (!customerId && !email && !phone) return undefined;
      return {
        provider: 'trafft',
        providerIdentityType: 'customer',
        providerIdentityId: customerId ?? `email:${email ?? phone}`,
        email,
        phone,
      };
    },
  };
}
