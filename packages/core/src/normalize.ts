export function normalizeEmail(value?: string): string | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : undefined;
}

export function normalizePhone(value?: string): string | undefined {
  if (!value) return undefined;
  const normalized = value.replace(/[^0-9+]/g, '');
  return normalized.length > 0 ? normalized : undefined;
}

export function makeCorrelationId(provider: string, providerEventId: string): string {
  return `${provider}:${providerEventId}`;
}

export function makeDedupeKey(provider: string, providerEventId: string): string {
  return `${provider}::${providerEventId}`;
}
