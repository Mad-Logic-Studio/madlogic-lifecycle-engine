import test from 'node:test';
import assert from 'node:assert/strict';
import { reconcileSubject, summarizeFindings } from '../packages/core/src/reconciliation.js';

test('reconciliation detects paid-but-not-booked and missing CRM state', () => {
  const findings = reconcileSubject({
    subjectId: 'subject-1',
    commerce: { paid: true },
    crm: { exists: false },
    booking: {},
    expected: { requiresBooking: true, crmGroups: ['purchaser'] },
  });
  const codes = findings.map((item) => item.code).sort();
  assert.deepEqual(codes, ['crm_group_drift', 'paid_missing_crm', 'paid_not_booked']);
  assert.equal(findings.find((item) => item.code === 'paid_missing_crm')?.repairSafety, 'safe_idempotent');
});

test('reconciliation marks booked-without-required-payment for review', () => {
  const findings = reconcileSubject({
    subjectId: 'subject-2',
    commerce: { paid: false },
    crm: { exists: true },
    booking: { appointmentId: 'appt-1' },
    expected: { requiresPayment: true },
  });
  assert.equal(findings[0]?.code, 'booked_payment_missing');
  assert.equal(findings[0]?.severity, 'critical');
  assert.equal(findings[0]?.repairSafety, 'review_required');
});

test('finding summary counts codes', () => {
  const findings = reconcileSubject({
    subjectId: 'subject-3',
    commerce: { paid: true },
    crm: { exists: false },
    expected: {},
  });
  assert.deepEqual(summarizeFindings(findings), { paid_missing_crm: 1 });
});
