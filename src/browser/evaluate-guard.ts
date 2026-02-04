/**
 * Input validation for browser-context eval via Playwright.
 * The eval runs inside the browser sandbox (not Node), but we add a size
 * guard to prevent extremely large payloads from being sent.
 */

const MAX_EVALUATE_INPUT_BYTES = 50 * 1024; // 50 KB

export type EvaluateGuardResult =
  | { ok: true }
  | { ok: false; reason: string };

/**
 * Validates a function body string before it is passed to `new Function()` +
 * `page.evaluate()`. Returns an error result if the input exceeds the
 * configured size limit.
 */
export function validateEvaluateInput(
  fnText: string,
  maxBytes = MAX_EVALUATE_INPUT_BYTES,
): EvaluateGuardResult {
  if (!fnText) {
    return { ok: false, reason: "evaluate input is empty" };
  }
  const byteLength = new TextEncoder().encode(fnText).byteLength;
  if (byteLength > maxBytes) {
    return {
      ok: false,
      reason: `evaluate input too large: ${byteLength} bytes (max ${maxBytes})`,
    };
  }
  return { ok: true };
}
