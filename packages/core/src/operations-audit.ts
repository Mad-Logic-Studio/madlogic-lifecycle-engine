import type { ReconciliationFinding } from './reconciliation.js';

export interface ProviderHealth {
  provider: string;
  status: 'ok' | 'degraded' | 'down' | 'unknown';
  checkedAt: string;
  detail?: string;
}

export interface RecentWriteAudit {
  toolName: string;
  status: 'attempt' | 'success' | 'failure';
  occurredAt: string;
  resourceId?: string;
  errorCode?: string;
}

export interface OperationsAuditInput {
  generatedAt: string;
  providerHealth: readonly ProviderHealth[];
  findings: readonly ReconciliationFinding[];
  eventFailures?: readonly { eventId: string; provider: string; eventType: string; errorCode?: string }[];
  recentWrites?: readonly RecentWriteAudit[];
}

export interface OperationsAuditReport {
  generatedAt: string;
  overall: 'healthy' | 'attention' | 'critical';
  counts: {
    critical: number;
    warnings: number;
    eventFailures: number;
    providerProblems: number;
  };
  providerHealth: readonly ProviderHealth[];
  findings: readonly ReconciliationFinding[];
  eventFailures: readonly { eventId: string; provider: string; eventType: string; errorCode?: string }[];
  recentWrites: readonly RecentWriteAudit[];
}

export function buildOperationsAudit(input: OperationsAuditInput): OperationsAuditReport {
  const critical = input.findings.filter((item) => item.severity === 'critical').length;
  const warnings = input.findings.filter((item) => item.severity === 'warning').length;
  const eventFailures = input.eventFailures ?? [];
  const providerProblems = input.providerHealth.filter((item) => item.status === 'degraded' || item.status === 'down').length;

  const overall = critical > 0 || input.providerHealth.some((item) => item.status === 'down')
    ? 'critical'
    : warnings > 0 || eventFailures.length > 0 || providerProblems > 0
      ? 'attention'
      : 'healthy';

  return {
    generatedAt: input.generatedAt,
    overall,
    counts: {
      critical,
      warnings,
      eventFailures: eventFailures.length,
      providerProblems,
    },
    providerHealth: input.providerHealth,
    findings: input.findings,
    eventFailures,
    recentWrites: input.recentWrites ?? [],
  };
}
