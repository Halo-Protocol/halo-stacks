import { createHash } from "crypto";

/**
 * Generate a deterministic unique ID from social auth data.
 * Returns a 0x-prefixed 64-char hex string (32 bytes).
 */
export function generateUniqueId(
  provider: string,
  socialId: string,
  email: string,
): string {
  const salt = process.env.HALO_ID_SALT;
  if (!salt) {
    throw new Error("HALO_ID_SALT environment variable is required");
  }

  const timestamp = Date.now();
  const input = [
    provider,
    socialId,
    email.toLowerCase(),
    timestamp.toString(),
    salt,
  ].join("|");

  const hash = createHash("sha256").update(input).digest("hex");
  return `0x${hash}`;
}

/**
 * Validate that a string is a valid unique ID format (0x + 64 hex chars).
 */
export function isValidUniqueId(id: string): boolean {
  return /^0x[0-9a-f]{64}$/i.test(id);
}

/**
 * Validate a Stacks wallet address format.
 * Stacks addresses start with SP (mainnet) or ST (testnet) followed by base58 chars.
 */
export function isValidStacksAddress(address: string): boolean {
  return /^(SP|ST)[0-9A-Z]{33,39}$/i.test(address);
}
