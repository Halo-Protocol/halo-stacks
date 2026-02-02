/**
 * Strip HTML tags from a string.
 */
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, "");
}

/**
 * Sanitize a string: trim, remove null bytes, limit length.
 */
export function sanitizeString(input: string, maxLength: number = 1000): string {
  return input.replace(/\0/g, "").trim().slice(0, maxLength);
}

/**
 * Validate a Stacks transaction ID (0x + 64 hex chars).
 */
export function isValidTxId(txId: string): boolean {
  return /^0x[0-9a-f]{64}$/i.test(txId);
}
