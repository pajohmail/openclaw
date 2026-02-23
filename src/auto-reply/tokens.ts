import { escapeRegExp } from "../utils.js";

export const HEARTBEAT_TOKEN = "HEARTBEAT_OK";
export const SILENT_REPLY_TOKEN = "NO_REPLY";

/**
 * Strip the silent-reply token from the beginning or end of text.
 * Returns the cleaned text (may be empty if the text was purely the token).
 */
export function stripSilentReplyToken(text: string, token: string = SILENT_REPLY_TOKEN): string {
  const escaped = escapeRegExp(token);
  // Strip token at end (most common: model appends NO_REPLY after real content)
  const suffix = new RegExp(`\\b${escaped}\\b\\W*$`);
  let result = text.replace(suffix, "");
  // Strip token at start
  const prefix = new RegExp(`^\\s*${escaped}(?=$|\\W)\\s*`);
  result = result.replace(prefix, "");
  return result.trim();
}

export function isSilentReplyText(
  text: string | undefined,
  token: string = SILENT_REPLY_TOKEN,
): boolean {
  if (!text) {
    return false;
  }
  // Only treat as silent if the text is effectively JUST the token
  const stripped = stripSilentReplyToken(text, token);
  return stripped.length === 0;
}

export function isSilentReplyPrefixText(
  text: string | undefined,
  token: string = SILENT_REPLY_TOKEN,
): boolean {
  if (!text) {
    return false;
  }
  const normalized = text.trimStart().toUpperCase();
  if (!normalized) {
    return false;
  }
  if (!normalized.includes("_")) {
    return false;
  }
  if (/[^A-Z_]/.test(normalized)) {
    return false;
  }
  return token.toUpperCase().startsWith(normalized);
}
