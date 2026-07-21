import type { Metadata } from 'next';
import Link from 'next/link';
import { PRODUCTION_SITE_HOST } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Daywinner bot — Privacy Policy',
  description: 'Privacy policy for the Daywinner bot web app.',
};

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

export default function PrivacyPage() {
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
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Daywinner bot — Privacy Policy</h1>
      <p style={{ color: '#64748b', marginBottom: 32 }}>Last updated: July 21, 2026</p>

      <p>
        Daywinner bot (&ldquo;the App&rdquo;) is a productivity web application. This policy describes what we store
        when you use the service.
      </p>

      <h2 style={{ fontSize: 18, marginTop: 28 }}>What we store on our servers</h2>
      <ul>
        <li>Your account email and authentication credentials (via Supabase Auth)</li>
        <li>Your subscription status and Stripe customer ID (via Stripe)</li>
        <li>Display name on your profile, if you provide one</li>
      </ul>

      <h2 style={{ fontSize: 18, marginTop: 28 }}>What stays on your device</h2>
      <p>
        Your projects, tasks, notes, work sessions, timer history, infractions, and most app settings are saved in your
        browser&apos;s local storage on the device you use. We do not sync this data to our servers unless a future
        feature explicitly says otherwise.
      </p>
      <p>
        Clearing browser data or switching devices may remove this information. You are responsible for backing up
        anything important to you.
      </p>

      <h2 style={{ fontSize: 18, marginTop: 28 }}>Chrome extension</h2>
      <p>
        If you use the Daywinner bot Chrome extension, see the{' '}
        <Link href="/privacy/focus-extension" style={{ color: '#1d4ed8' }}>
          extension privacy policy
        </Link>
        .
      </p>

      <h2 style={{ fontSize: 18, marginTop: 28 }}>Email</h2>
      <p>
        End-of-day reports are composed in your browser and opened in your email client. We do not receive the contents
        of those emails unless you send them yourself.
      </p>

      <h2 style={{ fontSize: 18, marginTop: 28 }}>Contact</h2>
      <p>
        Questions: reach out through the contact email listed on{' '}
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
