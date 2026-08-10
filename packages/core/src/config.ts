export interface ProviderBinding {
  provider: string;
  role: 'commerce' | 'crm' | 'booking' | 'other';
  enabled: boolean;
}

export interface LifecycleOfferBinding {
  key: string;
  commerceProductRef?: string;
  crmGroupRefs?: readonly string[];
  bookingServiceRef?: string;
  requiresPayment?: boolean;
  requiresBooking?: boolean;
}

export interface LifecycleEngineConfig {
  providers: readonly ProviderBinding[];
  offers?: readonly LifecycleOfferBinding[];
  automaticRepairCodes?: readonly string[];
}

export interface ConfigValidationResult {
  ok: boolean;
  errors: string[];
}

export function validateLifecycleConfig(config: LifecycleEngineConfig): ConfigValidationResult {
  const errors: string[] = [];
  const providerNames = new Set<string>();

  for (const provider of config.providers) {
    const name = provider.provider.trim();
    if (!name) errors.push('provider_name_required');
    if (providerNames.has(name)) errors.push(`duplicate_provider:${name}`);
    providerNames.add(name);
  }

  const offerKeys = new Set<string>();
  for (const offer of config.offers ?? []) {
    const key = offer.key.trim();
    if (!key) errors.push('offer_key_required');
    if (offerKeys.has(key)) errors.push(`duplicate_offer:${key}`);
    offerKeys.add(key);
    if (offer.requiresBooking && !offer.bookingServiceRef) {
      errors.push(`booking_service_required:${key}`);
    }
  }

  return { ok: errors.length === 0, errors };
}

export function findOfferBinding(
  config: LifecycleEngineConfig,
  commerceProductRef: string,
): LifecycleOfferBinding | undefined {
  return config.offers?.find((offer) => offer.commerceProductRef === commerceProductRef);
}
