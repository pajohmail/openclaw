export const HEARTBEAT_TOKEN = "HEARTBEAT_OK";
export const SILENT_REPLY_TOKEN = "NO_REPLY";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

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
  // (with minimal surrounding whitespace/punctuation).
  // If there is substantial content alongside the token, the caller
  // should strip the token via stripSilentReplyToken instead.
  const stripped = stripSilentReplyToken(text, token);
  return stripped.length === 0;
}
