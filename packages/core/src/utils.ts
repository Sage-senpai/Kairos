/** Small shared helpers for formatting Sui values and identifiers. */

const MIST_PER_SUI = 1_000_000_000n;

/**
 * Format a MIST amount as a human-readable SUI decimal string.
 * `formatSui('4230000000')` → `'4.2300'`.
 */
export function formatSui(mist: string | number | bigint, decimals = 4): string {
  const value = BigInt(typeof mist === 'number' ? Math.trunc(mist) : mist);
  const whole = value / MIST_PER_SUI;
  const frac = (value % MIST_PER_SUI).toString().padStart(9, '0').slice(0, decimals);
  return decimals > 0 ? `${whole}.${frac}` : `${whole}`;
}

/** Convert a decimal SUI amount to MIST. `suiToMist(0.1)` → `100000000n`. */
export function suiToMist(sui: number): bigint {
  return BigInt(Math.round(sui * Number(MIST_PER_SUI)));
}

/**
 * Truncate a Sui address for display: first 6 and last 4 characters.
 * `truncateAddress('0x1234...abcd')` → `'0x1234...abcd'`.
 */
export function truncateAddress(address: string): string {
  return address.length > 12 ? `${address.slice(0, 6)}...${address.slice(-4)}` : address;
}

/** Generate a unique id for a memory record. */
export function generateId(): string {
  return globalThis.crypto.randomUUID();
}
