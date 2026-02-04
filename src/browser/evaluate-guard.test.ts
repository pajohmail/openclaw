import { describe, expect, it } from "vitest";
import { validateEvaluateInput } from "./evaluate-guard.js";

describe("validateEvaluateInput", () => {
  it("accepts valid function bodies", () => {
    expect(validateEvaluateInput("() => document.title")).toEqual({ ok: true });
    expect(validateEvaluateInput("(el) => el.textContent")).toEqual({ ok: true });
  });

  it("rejects empty input", () => {
    const result = validateEvaluateInput("");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("empty");
    }
  });

  it("rejects oversized input", () => {
    const large = "x".repeat(60_000);
    const result = validateEvaluateInput(large);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("too large");
    }
  });

  it("accepts input just under the limit", () => {
    const justUnder = "x".repeat(50 * 1024 - 1);
    expect(validateEvaluateInput(justUnder)).toEqual({ ok: true });
  });

  it("respects custom max bytes", () => {
    const result = validateEvaluateInput("hello", 3);
    expect(result.ok).toBe(false);
  });

  it("handles multi-byte characters correctly", () => {
    // Each emoji is 4 bytes in UTF-8
    const emojis = "\u{1F600}".repeat(13_000); // ~52KB
    const result = validateEvaluateInput(emojis);
    expect(result.ok).toBe(false);
  });
});
