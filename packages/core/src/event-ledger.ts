import { makeCorrelationId, makeDedupeKey } from './normalize.js';
import type { LifecycleEvent } from './types.js';

export interface EventLedgerStore {
  hasDedupeKey(key: string): Promise<boolean>;
  insert<TPayload>(event: LifecycleEvent<TPayload>, dedupeKey: string): Promise<void>;
}

export interface IngestEventInput<TPayload = unknown> {
  eventId: string;
  provider: string;
  eventType: string;
  providerEventId: string;
  subjectId?: string;
  occurredAt: string;
  receivedAt: string;
  payload: TPayload;
}

export interface IngestEventResult {
  accepted: boolean;
  duplicate: boolean;
  correlationId: string;
}

export async function ingestEvent<TPayload>(
  store: EventLedgerStore,
  input: IngestEventInput<TPayload>,
): Promise<IngestEventResult> {
  const dedupeKey = makeDedupeKey(input.provider, input.providerEventId);
  const correlationId = makeCorrelationId(input.provider, input.providerEventId);

  if (await store.hasDedupeKey(dedupeKey)) {
    return { accepted: false, duplicate: true, correlationId };
  }

  await store.insert(
    {
      ...input,
      correlationId,
      status: 'received',
    },
    dedupeKey,
  );

  return { accepted: true, duplicate: false, correlationId };
}
