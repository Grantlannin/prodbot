/** Client-safe: paywall is live when explicitly enabled via env. */
export function isPaywallLive(): boolean {
  return process.env.NEXT_PUBLIC_DISABLE_PAYWALL === 'false';
}
