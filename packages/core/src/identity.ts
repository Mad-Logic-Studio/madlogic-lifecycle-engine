import { normalizeEmail, normalizePhone } from './normalize.js';
import type { IdentityResolutionInput, IdentityResolutionResult, ProviderIdentity } from './types.js';

export interface IdentityStore {
  findByProviderIdentity(provider: string, type: string, id: string): Promise<ProviderIdentity | undefined>;
  findByEmail(email: string): Promise<ProviderIdentity | undefined>;
  findByPhone(phone: string): Promise<ProviderIdentity | undefined>;
  createSubject(): Promise<string>;
  linkIdentity(identity: Omit<ProviderIdentity, 'createdAt' | 'updatedAt'>): Promise<ProviderIdentity>;
}

export async function resolveIdentity(
  store: IdentityStore,
  input: IdentityResolutionInput,
): Promise<IdentityResolutionResult> {
  const direct = await store.findByProviderIdentity(
    input.provider,
    input.providerIdentityType,
    input.providerIdentityId,
  );
  if (direct) return { subjectId: direct.subjectId, matchedBy: 'provider_identity' };

  const email = normalizeEmail(input.email);
  if (email) {
    const emailMatch = await store.findByEmail(email);
    if (emailMatch) {
      await store.linkIdentity({
        subjectId: emailMatch.subjectId,
        provider: input.provider,
        providerIdentityType: input.providerIdentityType,
        providerIdentityId: input.providerIdentityId,
        normalizedEmail: email,
        normalizedPhone: normalizePhone(input.phone),
      });
      return { subjectId: emailMatch.subjectId, matchedBy: 'email' };
    }
  }

  const phone = normalizePhone(input.phone);
  if (phone) {
    const phoneMatch = await store.findByPhone(phone);
    if (phoneMatch) {
      await store.linkIdentity({
        subjectId: phoneMatch.subjectId,
        provider: input.provider,
        providerIdentityType: input.providerIdentityType,
        providerIdentityId: input.providerIdentityId,
        normalizedEmail: email,
        normalizedPhone: phone,
      });
      return { subjectId: phoneMatch.subjectId, matchedBy: 'phone' };
    }
  }

  const subjectId = await store.createSubject();
  await store.linkIdentity({
    subjectId,
    provider: input.provider,
    providerIdentityType: input.providerIdentityType,
    providerIdentityId: input.providerIdentityId,
    normalizedEmail: email,
    normalizedPhone: phone,
  });
  return { subjectId, matchedBy: 'new_subject' };
}
