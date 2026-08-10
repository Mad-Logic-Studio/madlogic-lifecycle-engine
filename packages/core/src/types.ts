export type Provider = string;

export type LifecycleEventStatus =
  | 'received'
  | 'processing'
  | 'processed'
  | 'failed'
  | 'dead_letter';

export interface LifecycleEvent<TPayload = unknown> {
  eventId: string;
  provider: Provider;
  eventType: string;
  providerEventId: string;
  subjectId?: string;
  occurredAt: string;
  receivedAt: string;
  correlationId: string;
  status: LifecycleEventStatus;
  payload: TPayload;
}

export interface ProviderIdentity {
  subjectId: string;
  provider: Provider;
  providerIdentityType: string;
  providerIdentityId: string;
  normalizedEmail?: string;
  normalizedPhone?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IdentityResolutionInput {
  provider: Provider;
  providerIdentityType: string;
  providerIdentityId: string;
  email?: string;
  phone?: string;
}

export interface IdentityResolutionResult {
  subjectId: string;
  matchedBy: 'provider_identity' | 'email' | 'phone' | 'new_subject';
}
