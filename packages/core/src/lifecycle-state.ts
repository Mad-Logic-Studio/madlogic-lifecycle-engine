export type LifecycleStage =
  | 'lead'
  | 'prospect'
  | 'purchaser'
  | 'needs_fulfillment'
  | 'booked'
  | 'completed'
  | 'follow_up'
  | 'returning_customer';

export interface LifecycleState {
  subjectId: string;
  stage: LifecycleStage;
  changedAt: string;
  sourceEventId?: string;
}

const allowedTransitions: Record<LifecycleStage, ReadonlySet<LifecycleStage>> = {
  lead: new Set(['prospect', 'purchaser']),
  prospect: new Set(['purchaser']),
  purchaser: new Set(['needs_fulfillment', 'booked', 'completed']),
  needs_fulfillment: new Set(['booked', 'completed']),
  booked: new Set(['needs_fulfillment', 'completed']),
  completed: new Set(['follow_up', 'returning_customer']),
  follow_up: new Set(['returning_customer', 'purchaser']),
  returning_customer: new Set(['purchaser', 'booked', 'completed']),
};

export function canTransitionLifecycleStage(from: LifecycleStage, to: LifecycleStage): boolean {
  return from === to || allowedTransitions[from].has(to);
}

export function assertLifecycleTransition(from: LifecycleStage, to: LifecycleStage): void {
  if (!canTransitionLifecycleStage(from, to)) {
    throw new Error(`Invalid lifecycle transition: ${from} -> ${to}`);
  }
}
