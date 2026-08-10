export type OperatorPermissionMode =
  | 'read_only'
  | 'ask_before_writes'
  | 'review_important_actions'
  | 'full_access';

export type ToolRisk = 'read' | 'low_write' | 'important_write' | 'destructive_write';

export interface ToolPolicy {
  toolName: string;
  risk: ToolRisk;
  confirmationToken?: string;
  retry: 'safe' | 'never';
}

export interface ToolAuthorizationRequest {
  policy: ToolPolicy;
  permissionMode: OperatorPermissionMode;
  suppliedConfirmation?: string;
}

export interface ToolAuthorizationDecision {
  allowed: boolean;
  requiresInteractiveReview: boolean;
  reason: string;
}

export function authorizeTool(request: ToolAuthorizationRequest): ToolAuthorizationDecision {
  const { policy, permissionMode, suppliedConfirmation } = request;

  if (policy.confirmationToken && suppliedConfirmation !== policy.confirmationToken) {
    return {
      allowed: false,
      requiresInteractiveReview: true,
      reason: 'confirmation_required',
    };
  }

  if (policy.risk === 'read') {
    return { allowed: true, requiresInteractiveReview: false, reason: 'read_allowed' };
  }

  if (permissionMode === 'read_only') {
    return { allowed: false, requiresInteractiveReview: true, reason: 'writes_disabled' };
  }

  if (permissionMode === 'ask_before_writes') {
    return { allowed: false, requiresInteractiveReview: true, reason: 'write_review_required' };
  }

  if (permissionMode === 'review_important_actions') {
    if (policy.risk === 'low_write') {
      return { allowed: true, requiresInteractiveReview: false, reason: 'low_risk_write_allowed' };
    }
    return { allowed: false, requiresInteractiveReview: true, reason: 'important_review_required' };
  }

  if (permissionMode === 'full_access' && policy.risk !== 'destructive_write') {
    return { allowed: true, requiresInteractiveReview: false, reason: 'full_access' };
  }

  return { allowed: false, requiresInteractiveReview: true, reason: 'destructive_review_required' };
}

export function mayRetryTool(policy: ToolPolicy): boolean {
  return policy.risk === 'read' && policy.retry === 'safe';
}
