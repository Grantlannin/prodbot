/** Comma-separated allowlist, e.g. "you@daywinner.bot,grant@…" */
export function getOpsAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isOpsAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const allow = getOpsAdminEmails();
  if (!allow.length) return false;
  return allow.includes(email.trim().toLowerCase());
}
