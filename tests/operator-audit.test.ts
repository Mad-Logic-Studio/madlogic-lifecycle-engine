import test from 'node:test';
import assert from 'node:assert/strict';
import { authorizeTool, mayRetryTool } from '../packages/core/src/mcp-policy.js';
import { buildOperationsAudit } from '../packages/core/src/operations-audit.js';

test('MCP policy allows low-risk writes in review-important mode but gates important writes', () => {
  const low = authorizeTool({
    permissionMode: 'review_important_actions',
    policy: { toolName: 'crm_upsert', risk: 'low_write', retry: 'never' },
  });
  assert.equal(low.allowed, true);
  const important = authorizeTool({
    permissionMode: 'review_important_actions',
    policy: { toolName: 'cancel_appointment', risk: 'important_write', retry: 'never', confirmationToken: 'CANCEL' },
    suppliedConfirmation: 'CANCEL',
  });
  assert.equal(important.allowed, false);
  assert.equal(important.requiresInteractiveReview, true);
});

test('non-idempotent write policies never qualify for blind retry', () => {
  assert.equal(mayRetryTool({ toolName: 'create_customer', risk: 'low_write', retry: 'never' }), false);
  assert.equal(mayRetryTool({ toolName: 'list_customers', risk: 'read', retry: 'safe' }), true);
});

test('operations audit raises overall status from findings and provider health', () => {
  const report = buildOperationsAudit({
    generatedAt: '2026-08-10T12:00:00Z',
    providerHealth: [{ provider: 'square', status: 'ok', checkedAt: '2026-08-10T12:00:00Z' }],
    findings: [{
      code: 'paid_not_booked',
      subjectId: 'subject-1',
      severity: 'warning',
      repairSafety: 'report_only',
      message: 'Paid subject requires booking.',
    }],
  });
  assert.equal(report.overall, 'attention');
  assert.equal(report.counts.warnings, 1);
});
