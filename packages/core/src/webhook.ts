import { createHmac, timingSafeEqual } from 'node:crypto';

export interface WebhookRequest {
  method: string;
  headers: Readonly<Record<string, string | undefined>>;
  rawBody: string;
  receivedAt?: string;
}

export interface VerificationResult {
  ok: boolean;
  reason?: string;
}

export interface WebhookVerifier {
  verify(request: WebhookRequest): VerificationResult | Promise<VerificationResult>;
}

export interface IngestedWebhook<TPayload = unknown> {
  provider: string;
  providerEventId: string;
  eventType: string;
  occurredAt: string;
  receivedAt: string;
  payload: TPayload;
  payloadHash?: string;
}

export interface WebhookNormalizer<TPayload = unknown> {
  normalize(request: WebhookRequest): IngestedWebhook<TPayload>;
}

export type WebhookDisposition =
  | { status: 202; accepted: true; event: IngestedWebhook }
  | { status: 400 | 401 | 405 | 413; accepted: false; reason: string };

export function enforceWebhookEnvelope(
  request: WebhookRequest,
  options: { maxBytes?: number } = {},
): WebhookDisposition | null {
  if (request.method.toUpperCase() !== 'POST') {
    return { status: 405, accepted: false, reason: 'method_not_allowed' };
  }

  const maxBytes = options.maxBytes ?? 1_048_576;
  if (Buffer.byteLength(request.rawBody, 'utf8') > maxBytes) {
    return { status: 413, accepted: false, reason: 'payload_too_large' };
  }

  if (!request.rawBody.trim()) {
    return { status: 400, accepted: false, reason: 'empty_body' };
  }

  return null;
}

export async function ingestWebhook(
  request: WebhookRequest,
  verifier: WebhookVerifier,
  normalizer: WebhookNormalizer,
  options: { maxBytes?: number } = {},
): Promise<WebhookDisposition> {
  const envelopeFailure = enforceWebhookEnvelope(request, options);
  if (envelopeFailure) return envelopeFailure;

  const verification = await verifier.verify(request);
  if (!verification.ok) {
    return {
      status: 401,
      accepted: false,
      reason: verification.reason ?? 'verification_failed',
    };
  }

  try {
    return { status: 202, accepted: true, event: normalizer.normalize(request) };
  } catch {
    return { status: 400, accepted: false, reason: 'normalization_failed' };
  }
}

export function verifyHmacSha256(
  secret: string,
  rawBody: string,
  suppliedSignature: string,
  prefix = '',
): boolean {
  const expected = `${prefix}${createHmac('sha256', secret).update(rawBody).digest('hex')}`;
  const left = Buffer.from(expected, 'utf8');
  const right = Buffer.from(suppliedSignature, 'utf8');
  return left.length === right.length && timingSafeEqual(left, right);
}
