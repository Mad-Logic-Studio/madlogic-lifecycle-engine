const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const MAX_BODY_BYTES = 1_048_576;

const jsonHeaders = { 'content-type': 'application/json; charset=utf-8' };

type Provider = 'square' | 'mailerlite' | 'trafft';

type NormalizedEvent = {
  provider: Provider;
  providerEventId: string;
  eventType: string;
  occurredAt: string;
  receivedAt: string;
  payload: Record<string, unknown>;
  payloadHash: string;
};

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return mismatch === 0;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return bytesToHex(new Uint8Array(digest));
}

async function hmac(secret: string, value: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value)));
}

function pick(payload: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === 'string' && value) return value;
    if (typeof value === 'number') return String(value);
  }
  return undefined;
}

async function callIngest(event: NormalizedEvent): Promise<Record<string, unknown>> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/lifecycle_ingest_webhook`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      apikey: SERVICE_ROLE_KEY,
      authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({
      p_provider: event.provider,
      p_provider_event_id: event.providerEventId,
      p_event_type: event.eventType,
      p_occurred_at: event.occurredAt,
      p_received_at: event.receivedAt,
      p_payload: event.payload,
      p_payload_hash: event.payloadHash,
      p_signature_valid: true,
    }),
  });
  if (!response.ok) throw new Error(`ingest_rpc_${response.status}`);
  return await response.json() as Record<string, unknown>;
}

async function normalizeAndVerify(req: Request, provider: Provider, rawBody: string, url: URL): Promise<NormalizedEvent> {
  const payload = JSON.parse(rawBody) as Record<string, unknown>;
  const receivedAt = new Date().toISOString();
  const payloadHash = await sha256(rawBody);

  if (provider === 'square') {
    const signatureKey = Deno.env.get('SQUARE_WEBHOOK_SIGNATURE_KEY') ?? '';
    const notificationUrl = Deno.env.get('SQUARE_WEBHOOK_NOTIFICATION_URL') ?? '';
    if (!signatureKey || !notificationUrl) throw new Error('square_not_configured');
    const supplied = req.headers.get('x-square-hmacsha256-signature') ?? '';
    const expected = bytesToBase64(await hmac(signatureKey, `${notificationUrl}${rawBody}`));
    if (!supplied || !constantTimeEqual(expected, supplied)) throw new Error('invalid_signature');
    return {
      provider,
      providerEventId: pick(payload, ['event_id']) ?? payloadHash,
      eventType: pick(payload, ['type']) ?? 'square.unknown',
      occurredAt: pick(payload, ['created_at']) ?? receivedAt,
      receivedAt,
      payload,
      payloadHash,
    };
  }

  if (provider === 'mailerlite') {
    const secret = Deno.env.get('MAILERLITE_WEBHOOK_SECRET') ?? '';
    if (!secret) throw new Error('mailerlite_not_configured');
    const supplied = req.headers.get('signature') ?? '';
    const expected = bytesToHex(await hmac(secret, rawBody));
    if (!supplied || !constantTimeEqual(expected, supplied)) throw new Error('invalid_signature');
    const eventType = pick(payload, ['event']) ?? 'mailerlite.unknown';
    const entityId = pick(payload, ['id']) ?? 'unknown';
    return {
      provider,
      providerEventId: await sha256(`${eventType}:${entityId}:${rawBody}`),
      eventType,
      occurredAt: pick(payload, ['updated_at', 'created_at']) ?? receivedAt,
      receivedAt,
      payload,
      payloadHash,
    };
  }

  const verificationToken = Deno.env.get('TRAFFT_WEBHOOK_VERIFICATION_TOKEN') ?? '';
  if (!verificationToken) throw new Error('trafft_not_configured');
  const auth = (req.headers.get('authorization') ?? '').trim();
  const supplied = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : auth;
  if (!supplied || !constantTimeEqual(verificationToken, supplied)) throw new Error('invalid_signature');
  const eventType = url.searchParams.get('event')?.trim();
  if (!eventType) throw new Error('missing_trafft_event_type');
  const sourceIdentity = pick(payload, ['appointment_id', 'appointmentId', 'customer_id', 'customerId', 'id']) ?? payloadHash;
  return {
    provider,
    providerEventId: await sha256(`${eventType}:${sourceIdentity}:${rawBody}`),
    eventType,
    occurredAt: pick(payload, ['appointment_start_date_time', 'appointmentStartDateTime', 'start_date_time', 'startDateTime']) ?? receivedAt,
    receivedAt,
    payload,
    payloadHash,
  };
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const provider = url.searchParams.get('provider');

  if (req.method === 'GET') {
    return json(200, {
      service: 'madlogic-lifecycle-webhook',
      status: 'ok',
      configured: {
        square: Boolean(Deno.env.get('SQUARE_WEBHOOK_SIGNATURE_KEY') && Deno.env.get('SQUARE_WEBHOOK_NOTIFICATION_URL')),
        mailerlite: Boolean(Deno.env.get('MAILERLITE_WEBHOOK_SECRET')),
        trafft: Boolean(Deno.env.get('TRAFFT_WEBHOOK_VERIFICATION_TOKEN')),
      },
    });
  }

  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });
  if (!['square', 'mailerlite', 'trafft'].includes(provider ?? '')) return json(400, { error: 'unsupported_provider' });
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return json(503, { error: 'supabase_runtime_missing' });

  const rawBody = await req.text();
  if (!rawBody.trim()) return json(400, { error: 'empty_body' });
  if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) return json(413, { error: 'payload_too_large' });

  try {
    const event = await normalizeAndVerify(req, provider as Provider, rawBody, url);
    const result = await callIngest(event);
    return json(200, {
      accepted: result.accepted ?? false,
      duplicate: result.duplicate ?? false,
      event_id: result.event_id ?? null,
      correlation_id: result.correlation_id ?? null,
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'webhook_error';
    if (code === 'invalid_signature') return json(401, { error: code });
    if (code.endsWith('_not_configured')) return json(503, { error: code });
    if (code === 'missing_trafft_event_type') return json(400, { error: code });
    if (error instanceof SyntaxError) return json(400, { error: 'invalid_json' });
    console.error('webhook failure', { code });
    return json(500, { error: 'internal_error' });
  }
});
