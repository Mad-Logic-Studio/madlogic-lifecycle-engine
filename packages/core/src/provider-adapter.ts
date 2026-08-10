import type { IdentityResolutionInput, LifecycleEvent } from './types.js';
import type { WebhookNormalizer, WebhookVerifier } from './webhook.js';

export type ProviderCapability =
  | 'customers.read'
  | 'customers.write'
  | 'orders.read'
  | 'payments.read'
  | 'appointments.read'
  | 'appointments.write'
  | 'crm.read'
  | 'crm.write'
  | 'webhooks.verify'
  | 'webhooks.normalize';

export interface ProviderReadClient {
  getCustomer?(providerCustomerId: string): Promise<unknown>;
  getOrder?(providerOrderId: string): Promise<unknown>;
  getPayment?(providerPaymentId: string): Promise<unknown>;
  getAppointment?(providerAppointmentId: string): Promise<unknown>;
  getSubscriber?(providerSubscriberId: string): Promise<unknown>;
}

export interface ProviderWriteClient {
  ensureCustomer?(input: Record<string, unknown>): Promise<{ id: string }>;
  createAppointment?(input: Record<string, unknown>): Promise<{ id: string }>;
  cancelAppointment?(id: string): Promise<void>;
  upsertSubscriber?(input: Record<string, unknown>): Promise<{ id: string }>;
  assignGroup?(subscriberId: string, groupId: string): Promise<void>;
  removeGroup?(subscriberId: string, groupId: string): Promise<void>;
}

export interface ProviderAdapter<TPayload = unknown> {
  name: string;
  capabilities: ReadonlySet<ProviderCapability>;
  verifier?: WebhookVerifier;
  normalizer?: WebhookNormalizer<TPayload>;
  reads?: ProviderReadClient;
  writes?: ProviderWriteClient;
  identityFromEvent?(event: LifecycleEvent<TPayload>): IdentityResolutionInput | undefined;
}

export function assertCapability(
  adapter: ProviderAdapter,
  capability: ProviderCapability,
): void {
  if (!adapter.capabilities.has(capability)) {
    throw new Error(`provider_capability_missing:${adapter.name}:${capability}`);
  }
}
