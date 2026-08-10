import type { LifecycleEventStatus } from './types.js';

const allowedEventTransitions: Record<LifecycleEventStatus, ReadonlySet<LifecycleEventStatus>> = {
  received: new Set(['processing', 'failed', 'dead_letter']),
  processing: new Set(['processed', 'failed', 'dead_letter']),
  processed: new Set(),
  failed: new Set(['processing', 'dead_letter']),
  dead_letter: new Set(['processing']),
};

export function canTransitionEventStatus(
  from: LifecycleEventStatus,
  to: LifecycleEventStatus,
): boolean {
  return from === to || allowedEventTransitions[from].has(to);
}

export function assertEventStatusTransition(
  from: LifecycleEventStatus,
  to: LifecycleEventStatus,
): void {
  if (!canTransitionEventStatus(from, to)) {
    throw new Error(`Invalid event status transition: ${from} -> ${to}`);
  }
}
