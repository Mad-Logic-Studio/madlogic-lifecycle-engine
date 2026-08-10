import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveIdentity, type IdentityStore } from '../packages/core/src/identity.js';
import type { ProviderIdentity } from '../packages/core/src/types.js';

class MemoryIdentityStore implements IdentityStore {
  identities: ProviderIdentity[] = [];
  subjectCounter = 0;

  async findByProviderIdentity(provider: string, type: string, id: string) {
    return this.identities.find((x) => x.provider === provider && x.providerIdentityType === type && x.providerIdentityId === id);
  }
  async findByEmail(email: string) {
    return this.identities.find((x) => x.normalizedEmail === email);
  }
  async findByPhone(phone: string) {
    return this.identities.find((x) => x.normalizedPhone === phone);
  }
  async createSubject() {
    this.subjectCounter += 1;
    return `subject_${this.subjectCounter}`;
  }
  async linkIdentity(identity: Omit<ProviderIdentity, 'createdAt' | 'updatedAt'>) {
    const now = '2026-08-10T00:00:00.000Z';
    const linked = { ...identity, createdAt: now, updatedAt: now };
    this.identities.push(linked);
    return linked;
  }
}

test('resolveIdentity creates a subject and reuses it through normalized email', async () => {
  const store = new MemoryIdentityStore();

  const first = await resolveIdentity(store, {
    provider: 'example-crm',
    providerIdentityType: 'subscriber',
    providerIdentityId: 'sub_1',
    email: ' PERSON@EXAMPLE.INVALID ',
  });

  const second = await resolveIdentity(store, {
    provider: 'example-booking',
    providerIdentityType: 'customer',
    providerIdentityId: 'customer_9',
    email: 'person@example.invalid',
  });

  assert.equal(first.matchedBy, 'new_subject');
  assert.equal(second.matchedBy, 'email');
  assert.equal(first.subjectId, second.subjectId);
  assert.equal(store.identities.length, 2);
});

test('provider identity is authoritative on subsequent resolution', async () => {
  const store = new MemoryIdentityStore();
  const first = await resolveIdentity(store, {
    provider: 'example-payments',
    providerIdentityType: 'customer',
    providerIdentityId: 'cust_1',
    email: 'person@example.invalid',
  });
  const second = await resolveIdentity(store, {
    provider: 'example-payments',
    providerIdentityType: 'customer',
    providerIdentityId: 'cust_1',
    email: 'changed@example.invalid',
  });

  assert.equal(second.subjectId, first.subjectId);
  assert.equal(second.matchedBy, 'provider_identity');
  assert.equal(store.identities.length, 1);
});
