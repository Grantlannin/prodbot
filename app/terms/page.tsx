import type { Metadata } from 'next';
import Link from 'next/link';
import { PRODUCTION_SITE_HOST } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Daywinner bot — Terms of Service',
  description: 'Terms of service for the Daywinner bot web app.',
};

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

export default function TermsPage() {
  return (
    <main
      style={{
        maxWidth: 680,
        margin: '0 auto',
        padding: '48px 24px 64px',
        fontFamily: font,
        color: '#0f172a',
        lineHeight: 1.6,
      }}
    >
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Daywinner bot — Terms of Service</h1>
      <p style={{ color: '#64748b', marginBottom: 32 }}>Last updated: July 21, 2026</p>

      <p>
        By using Daywinner bot (&ldquo;the App&rdquo;), you agree to these terms. If you do not agree, do not use the
        App.
      </p>

      <h2 style={{ fontSize: 18, marginTop: 28 }}>The service</h2>
      <p>
        Daywinner bot is a personal productivity tool: work timer, projects, notes, wind-down flows, and related
        features. The App is provided as-is. We may change or discontinue features at any time.
      </p>

      <h2 style={{ fontSize: 18, marginTop: 28 }}>Accounts and billing</h2>
      <p>
        Paid access is billed monthly through Stripe. You may cancel anytime via the billing portal. Refunds are handled
        at our discretion unless required by law.
      </p>

      <h2 style={{ fontSize: 18, marginTop: 28 }}>Your data</h2>
      <p>
        Most work data is stored locally in your browser. You are responsible for your account credentials and for
        maintaining backups of anything important. See our{' '}
        <Link href="/privacy" style={{ color: '#1d4ed8' }}>
          Privacy Policy
        </Link>
        .
      </p>

      <h2 style={{ fontSize: 18, marginTop: 28 }}>Acceptable use</h2>
      <p>
        Do not abuse the service, attempt to bypass payment, reverse engineer the App for competing products, or use
        the App in violation of applicable law.
      </p>

      <h2 style={{ fontSize: 18, marginTop: 28 }}>Disclaimer</h2>
      <p>
        The App is not professional advice (medical, legal, financial, or otherwise). We are not liable for lost
        productivity, lost data, or indirect damages arising from use of the App.
      </p>

      <h2 style={{ fontSize: 18, marginTop: 28 }}>Contact</h2>
      <p>
        Questions about these terms: contact us through the email listed on{' '}
        <Link href="/" style={{ color: '#1d4ed8' }}>
          {PRODUCTION_SITE_HOST}
        </Link>
        .
      </p>

      <p style={{ marginTop: 32 }}>
        <Link href="/" style={{ color: '#1d4ed8' }}>
          ← Back to Daywinner
        </Link>
      </p>
    </main>
  );
}
