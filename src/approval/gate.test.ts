import { afterEach, describe, expect, it } from "vitest";
import type { OpenClawConfig } from "../config/config.js";
import {
  clearSessionApprovals,
  defaultApprovalHandler,
  isAlreadyApproved,
  markApproved,
  resolveApprovalRequired,
} from "./gate.js";

describe("defaultApprovalHandler", () => {
  it("rejects all requests", () => {
    const result = defaultApprovalHandler({
      kind: "skill-install",
      id: "git",
      description: "Install git skill",
    });
    expect(result).toEqual({
      approved: false,
      reason: expect.stringContaining("requires explicit approval"),
    });
  });
});

describe("session approvals", () => {
  afterEach(() => clearSessionApprovals());

  it("returns false for unknown items", () => {
    expect(isAlreadyApproved("skill-install", "git")).toBe(false);
  });

  it("returns true after marking approved", () => {
    markApproved("skill-install", "git");
    expect(isAlreadyApproved("skill-install", "git")).toBe(true);
  });

  it("distinguishes between kinds", () => {
    markApproved("skill-install", "git");
    expect(isAlreadyApproved("plugin-auto-enable", "git")).toBe(false);
  });

  it("clears all approvals", () => {
    markApproved("skill-install", "git");
    markApproved("plugin-auto-enable", "discord");
    clearSessionApprovals();
    expect(isAlreadyApproved("skill-install", "git")).toBe(false);
    expect(isAlreadyApproved("plugin-auto-enable", "discord")).toBe(false);
  });
});

describe("resolveApprovalRequired", () => {
  it("defaults to true for skill-install", () => {
    expect(resolveApprovalRequired(undefined, "skill-install")).toBe(true);
    expect(resolveApprovalRequired({}, "skill-install")).toBe(true);
  });

  it("defaults to true for plugin-auto-enable", () => {
    expect(resolveApprovalRequired(undefined, "plugin-auto-enable")).toBe(true);
    expect(resolveApprovalRequired({}, "plugin-auto-enable")).toBe(true);
  });

  it("respects skills.requireInstallApproval = false", () => {
    const config: OpenClawConfig = { skills: { requireInstallApproval: false } };
    expect(resolveApprovalRequired(config, "skill-install")).toBe(false);
  });

  it("respects approvals.skillInstall.requireApproval = false", () => {
    const config: OpenClawConfig = {
      approvals: { skillInstall: { requireApproval: false } },
    };
    expect(resolveApprovalRequired(config, "skill-install")).toBe(false);
  });

  it("approvals.skillInstall takes precedence over skills.requireInstallApproval", () => {
    const config: OpenClawConfig = {
      skills: { requireInstallApproval: true },
      approvals: { skillInstall: { requireApproval: false } },
    };
    expect(resolveApprovalRequired(config, "skill-install")).toBe(false);
  });

  it("respects approvals.pluginAutoEnable.requireApproval = false", () => {
    const config: OpenClawConfig = {
      approvals: { pluginAutoEnable: { requireApproval: false } },
    };
    expect(resolveApprovalRequired(config, "plugin-auto-enable")).toBe(false);
  });
});
