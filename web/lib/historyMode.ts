/**
 * Hybrid history (default):
 * - Live VAPI rows appear right after a call (so Pull/deploy delay is OK)
 * - Permanent archive wins on the same call id (one row, archive audio)
 *
 * Set HISTORY_INCLUDE_VAPI=0 to force archive-only (demos / offline).
 */
export function includeLiveVapi(): boolean {
  return process.env.HISTORY_INCLUDE_VAPI !== "0";
}
