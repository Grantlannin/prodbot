import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Daywinner bot — Privacy Policy',
  description: 'Privacy policy for the Daywinner bot Chrome extension.',
};

export default function FocusExtensionPrivacyPage() {
  return (
    <main
      style={{
        maxWidth: 680,
        margin: '0 auto',
        padding: '48px 24px 64px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: '#0f172a',
        lineHeight: 1.6,
      }}
    >
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Daywinner bot — Privacy Policy</h1>
      <p style={{ color: '#64748b', marginBottom: 32 }}>Last updated: June 9, 2026</p>

      <p>
        Daywinner bot (&ldquo;the Extension&rdquo;) is a browser companion for the Daywinner productivity web app. It blocks
        websites you choose while a focus session is active.
      </p>

      <h2 style={{ fontSize: 18, marginTop: 28 }}>Data we collect</h2>
      <p>
        The Extension does not collect, transmit, or sell personal data. We do not run analytics or advertising inside
        the Extension.
      </p>

      <h2 style={{ fontSize: 18, marginTop: 28 }}>Data stored on your device</h2>
      <p>The Extension uses Chrome&apos;s local storage (<code>chrome.storage.local</code>) to save:</p>
      <ul>
        <li>Your blocklist and session state (whether blocking is active, session end time)</li>
        <li>
          Temporary records when a blocked site is visited (domain and timestamp), until synced into the Produc web app
        </li>
      </ul>

      <h2 style={{ fontSize: 18, marginTop: 28 }}>Communication</h2>
      <p>The Extension communicates only with:</p>
      <ul>
        <li>
          The Daywinner web app tab (<a href="https://daywinnerbot.com">daywinnerbot.com</a>), via an in-page
          message bridge
        </li>
        <li>Chrome APIs required for site blocking</li>
      </ul>
      <p>
        The Extension does <strong>not</strong> send data to our servers or third parties. The Produc web app is a
        separate product with its own data practices.
      </p>

      <h2 style={{ fontSize: 18, marginTop: 28 }}>Permissions</h2>
      <p>
        Host and network permissions are used solely to redirect blocked sites during focus sessions you start in
        Produc. Blocking applies only to domains you enable in Produc while a session is active.
      </p>

      <h2 style={{ fontSize: 18, marginTop: 28 }}>Children</h2>
      <p>The Extension is not directed at children under 13.</p>

      <h2 style={{ fontSize: 18, marginTop: 28 }}>Changes</h2>
      <p>We may update this policy. The &ldquo;Last updated&rdquo; date at the top will change when we do.</p>

      <h2 style={{ fontSize: 18, marginTop: 28 }}>Contact</h2>
      <p>
        Questions about this policy: contact the Produc team through the email listed on{' '}
        <a href="https://daywinnerbot.com" style={{ color: '#1d4ed8' }}>
          daywinnerbot.com
        </a>
        .
      </p>

      <p style={{ marginTop: 32 }}>
        <a href="https://daywinnerbot.com" style={{ color: '#1d4ed8' }}>
          ← Back to Daywinner
        </a>
      </p>
    </main>
  );
}
