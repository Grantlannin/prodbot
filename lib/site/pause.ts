/** When true, all public pages redirect to /paused (API routes still run). */
export function isSitePaused(): boolean {
  return process.env.SITE_PAUSED === 'true';
}
