/**
 * Centralized Stacks network configuration.
 * All files should import from here instead of hardcoding URLs.
 */

const network = process.env.STACKS_NETWORK || process.env.NEXT_PUBLIC_STACKS_NETWORK || "mainnet";
const isMainnet = network === "mainnet";

/** Server-side Stacks API URL */
export const STACKS_API_URL =
  process.env.STACKS_API_URL ||
  (isMainnet ? "https://api.hiro.so" : "https://api.testnet.hiro.so");

/** Client-side Stacks API URL */
export const STACKS_API_URL_CLIENT =
  process.env.NEXT_PUBLIC_STACKS_API_URL ||
  (isMainnet ? "https://api.hiro.so" : "https://api.testnet.hiro.so");

/** Current network name */
export const STACKS_NETWORK = network as "mainnet" | "testnet";

/** Explorer base URL */
export const EXPLORER_BASE = "https://explorer.hiro.so";

/** Get explorer URL for a transaction */
export function getExplorerTxUrl(txId: string): string {
  const chain = isMainnet ? "" : "?chain=testnet";
  return `${EXPLORER_BASE}/txid/${txId}${chain}`;
}

/** Get explorer URL for an address */
export function getExplorerAddressUrl(address: string): string {
  const chain = isMainnet ? "" : "?chain=testnet";
  return `${EXPLORER_BASE}/address/${address}${chain}`;
}

/** Whether faucet should be visible */
export const IS_MAINNET = isMainnet;
