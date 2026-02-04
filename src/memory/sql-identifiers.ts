/**
 * Defense-in-depth: validate SQL identifiers before interpolation into queries.
 * The table/column names used in this project are internal constants, but this
 * guard prevents accidental injection if those values ever come from config.
 */

const SAFE_IDENTIFIER_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

/**
 * Throws if `name` is not a safe SQL identifier (letters, digits, underscores,
 * must start with a letter or underscore).
 */
export function assertSafeIdentifier(name: string, context: string): string {
  if (!name || !SAFE_IDENTIFIER_RE.test(name)) {
    throw new Error(`Unsafe SQL identifier in ${context}: ${JSON.stringify(name)}`);
  }
  return name;
}
