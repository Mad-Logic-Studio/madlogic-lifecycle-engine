import { randomUUID } from 'node:crypto';
import { ingestEvent, type EventLedgerStore } from './event-ledger.js';
import type { LifecycleEvent } from './types.js';
import type { IngestedWebhook } from './webhook.js';
import { planWorkflow, type LifecycleContext, type PlannedWorkflow, type WorkflowRule } from './workflow.js';

export interface ProcessWebhookInput {
  webhook: IngestedWebhook;
  eventId?: string;
  subjectId?: string;
  context?: LifecycleContext;
}

export interface ProcessWebhookResult {
  accepted: boolean;
  duplicate: boolean;
  eventId: string;
  correlationId: string;
  plan?: PlannedWorkflow;
}

export async function processIngestedWebhook(
  store: EventLedgerStore,
  input: ProcessWebhookInput,
  rules: readonly WorkflowRule[] = [],
): Promise<ProcessWebhookResult> {
  const eventId = input.eventId ?? randomUUID();
  const result = await ingestEvent(store, {
    eventId,
    provider: input.webhook.provider,
    eventType: input.webhook.eventType,
    providerEventId: input.webhook.providerEventId,
    subjectId: input.subjectId,
    occurredAt: input.webhook.occurredAt,
    receivedAt: input.webhook.receivedAt,
    payload: input.webhook.payload,
  });

  if (!result.accepted) {
    return {
      accepted: false,
      duplicate: result.duplicate,
      eventId,
      correlationId: result.correlationId,
    };
  }

  const event: LifecycleEvent = {
    eventId,
    provider: input.webhook.provider,
    eventType: input.webhook.eventType,
    providerEventId: input.webhook.providerEventId,
    subjectId: input.subjectId,
    occurredAt: input.webhook.occurredAt,
    receivedAt: input.webhook.receivedAt,
    correlationId: result.correlationId,
    status: 'received',
    payload: input.webhook.payload,
  };

  return {
    accepted: true,
    duplicate: false,
    eventId,
    correlationId: result.correlationId,
    plan: planWorkflow(event, input.context ?? {}, rules),
  };
}
