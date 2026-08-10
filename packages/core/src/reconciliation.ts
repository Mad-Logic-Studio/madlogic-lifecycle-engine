export type ReconciliationSeverity = 'info' | 'warning' | 'critical';
export type RepairSafety = 'report_only' | 'safe_idempotent' | 'review_required';

export interface ReconciliationSnapshot {
  subjectId: string;
  commerce?: {
    paid?: boolean;
    orderId?: string;
    paymentId?: string;
  };
  crm?: {
    exists?: boolean;
    subscriberId?: string;
    groups?: readonly string[];
  };
  booking?: {
    customerExists?: boolean;
    customerId?: string;
    appointmentId?: string;
    appointmentStatus?: string;
  };
  expected?: {
    requiresPayment?: boolean;
    requiresBooking?: boolean;
    crmGroups?: readonly string[];
  };
}

export interface ReconciliationFinding {
  code: string;
  subjectId: string;
  severity: ReconciliationSeverity;
  repairSafety: RepairSafety;
  message: string;
  details?: Readonly<Record<string, unknown>>;
}

export function reconcileSubject(snapshot: ReconciliationSnapshot): ReconciliationFinding[] {
  const findings: ReconciliationFinding[] = [];
  const expected = snapshot.expected ?? {};

  if (snapshot.commerce?.paid && snapshot.crm?.exists === false) {
    findings.push({
      code: 'paid_missing_crm',
      subjectId: snapshot.subjectId,
      severity: 'warning',
      repairSafety: 'safe_idempotent',
      message: 'Paid subject is missing from CRM.',
    });
  }

  if (expected.requiresBooking && snapshot.commerce?.paid && !snapshot.booking?.appointmentId) {
    findings.push({
      code: 'paid_not_booked',
      subjectId: snapshot.subjectId,
      severity: 'warning',
      repairSafety: 'report_only',
      message: 'Paid subject requires booking but has no appointment.',
    });
  }

  if (expected.requiresPayment && snapshot.booking?.appointmentId && snapshot.commerce?.paid === false) {
    findings.push({
      code: 'booked_payment_missing',
      subjectId: snapshot.subjectId,
      severity: 'critical',
      repairSafety: 'review_required',
      message: 'Appointment exists but expected payment is missing.',
    });
  }

  if (snapshot.booking?.appointmentId && snapshot.crm?.exists === false) {
    findings.push({
      code: 'booked_missing_crm',
      subjectId: snapshot.subjectId,
      severity: 'warning',
      repairSafety: 'safe_idempotent',
      message: 'Booked subject is missing from CRM.',
    });
  }

  const actualGroups = new Set(snapshot.crm?.groups ?? []);
  for (const expectedGroup of expected.crmGroups ?? []) {
    if (!actualGroups.has(expectedGroup)) {
      findings.push({
        code: 'crm_group_drift',
        subjectId: snapshot.subjectId,
        severity: 'info',
        repairSafety: 'safe_idempotent',
        message: 'Expected CRM group assignment is missing.',
        details: { group: expectedGroup },
      });
    }
  }

  return findings;
}

export function summarizeFindings(findings: readonly ReconciliationFinding[]): Record<string, number> {
  return findings.reduce<Record<string, number>>((summary, finding) => {
    summary[finding.code] = (summary[finding.code] ?? 0) + 1;
    return summary;
  }, {});
}
