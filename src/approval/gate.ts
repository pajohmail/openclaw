/**
 * Approval gate for skill installation and plugin auto-enable.
 *
 * When enabled (the default), skills cannot be installed and plugins cannot be
 * auto-enabled without explicit user consent. This prevents the bot from
 * acquiring new capabilities autonomously.
 */

import type { OpenClawConfig } from "../config/config.js";

export type ApprovalKind = "skill-install" | "plugin-auto-enable";

export type ApprovalRequest = {
  kind: ApprovalKind;
  /** Identifier for the skill or plugin. */
  id: string;
  /** Human-readable description of what is being requested. */
  description: string;
  /** Where this capability comes from (package name, URL, etc.). */
  source?: string;
};

export type ApprovalResult = {
  approved: boolean;
  reason?: string;
};

/**
 * Callback invoked when an approval decision is needed. The default handler
 * rejects everything; callers should supply an interactive handler when running
 * in a context that supports user interaction.
 */
export type ApprovalHandler = (request: ApprovalRequest) => Promise<ApprovalResult> | ApprovalResult;

/** Default handler: block all unapproved actions. */
export const defaultApprovalHandler: ApprovalHandler = (request) => ({
  approved: false,
  reason: `${request.kind} requires explicit approval: ${request.description}`,
});

// In-memory set of items approved during this session.
const sessionApprovals = new Set<string>();

function approvalKey(kind: string, id: string): string {
  return `${kind}:${id}`;
}

export function isAlreadyApproved(kind: string, id: string): boolean {
  return sessionApprovals.has(approvalKey(kind, id));
}

export function markApproved(kind: string, id: string): void {
  sessionApprovals.add(approvalKey(kind, id));
}

export function clearSessionApprovals(): void {
  sessionApprovals.clear();
}

/**
 * Check whether the given approval kind requires user consent based on config.
 * Defaults to `true` (require approval) for both skill installs and plugin
 * auto-enables.
 */
export function resolveApprovalRequired(
  config: OpenClawConfig | undefined,
  kind: ApprovalKind,
): boolean {
  const approvals = config?.approvals;
  switch (kind) {
    case "skill-install":
      return approvals?.skillInstall?.requireApproval ?? config?.skills?.requireInstallApproval ?? true;
    case "plugin-auto-enable":
      return approvals?.pluginAutoEnable?.requireApproval ?? true;
    default:
      return true;
  }
}
