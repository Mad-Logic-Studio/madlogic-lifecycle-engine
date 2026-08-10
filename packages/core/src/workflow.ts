import type { LifecycleEvent } from './types.js';

export type ActionRisk = 'read' | 'low' | 'important' | 'destructive';

export interface LifecycleContext {
  subjectId?: string;
  currentStage?: string;
  providerState?: Readonly<Record<string, unknown>>;
}

export interface WorkflowAction {
  id: string;
  kind: string;
  risk: ActionRisk;
  idempotencyKey?: string;
  input: Readonly<Record<string, unknown>>;
}

export interface WorkflowRule<TPayload = unknown> {
  id: string;
  description?: string;
  matches(event: LifecycleEvent<TPayload>, context: LifecycleContext): boolean;
  plan(event: LifecycleEvent<TPayload>, context: LifecycleContext): readonly WorkflowAction[];
}

export interface PlannedWorkflow {
  matchedRuleIds: string[];
  automatic: WorkflowAction[];
  reviewRequired: WorkflowAction[];
}

export function planWorkflow(
  event: LifecycleEvent,
  context: LifecycleContext,
  rules: readonly WorkflowRule[],
): PlannedWorkflow {
  const result: PlannedWorkflow = {
    matchedRuleIds: [],
    automatic: [],
    reviewRequired: [],
  };

  const seenIdempotency = new Set<string>();

  for (const rule of rules) {
    if (!rule.matches(event, context)) continue;
    result.matchedRuleIds.push(rule.id);

    for (const action of rule.plan(event, context)) {
      if (action.idempotencyKey) {
        if (seenIdempotency.has(action.idempotencyKey)) continue;
        seenIdempotency.add(action.idempotencyKey);
      }

      if (action.risk === 'read' || action.risk === 'low') {
        result.automatic.push(action);
      } else {
        result.reviewRequired.push(action);
      }
    }
  }

  return result;
}

export function requireConfirmation(action: WorkflowAction): boolean {
  return action.risk === 'important' || action.risk === 'destructive';
}
