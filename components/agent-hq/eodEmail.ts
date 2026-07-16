import { formatReportDateLabel, localDateKey } from './eodReports';

export const ACCOUNTABILITY_PARTNER_EMAIL_KEY = 'agentHQ_accountabilityPartnerEmail';
export const ACCOUNTABILITY_SELF_EMAIL_KEY = 'agentHQ_accountabilitySelfEmail';
export const ACCOUNTABILITY_SEND_TO_SELF_KEY = 'agentHQ_accountabilitySendToSelf';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(input: string): boolean {
  return EMAIL_RE.test(input.trim());
}

export function buildEodRecipients(
  partnerEmail: string,
  selfEmail: string,
  includeSelf: boolean
): string {
  const partner = partnerEmail.trim();
  if (!includeSelf) return partner;

  const self = selfEmail.trim();
  if (!self || self.toLowerCase() === partner.toLowerCase()) return partner;
  return `${partner},${self}`;
}

export function buildEodEmailSubject(dateKey = localDateKey()): string {
  const label = formatReportDateLabel(dateKey);
  return `Daywinner EOD — ${label}`;
}

export function buildGmailComposeUrl(to: string, subject: string, body: string): string {
  const params = new URLSearchParams({
    view: 'cm',
    fs: '1',
    to: to.trim(),
    su: subject,
    body,
  });
  return `https://mail.google.com/mail/?${params.toString()}`;
}

export function buildMailtoUrl(to: string, subject: string, body: string): string {
  const params = new URLSearchParams({
    to: to.trim(),
    subject,
    body,
  });
  return `mailto:?${params.toString()}`;
}

export function openEmailDraft(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function prefillCompletedFromDoneToday(items: { text: string }[]): string {
  if (items.length === 0) return '';
  return items.map(i => i.text).join('; ');
}
