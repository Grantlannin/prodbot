#!/usr/bin/env node
import { loadEnvLocal } from './load-env-local.mjs';

loadEnvLocal();

const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'NEXT_PUBLIC_APP_URL',
];

const optional = ['STRIPE_PRICE_ID', 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', 'ANTHROPIC_API_KEY'];

console.log('\nProduc billing env check\n');

let missing = 0;
for (const key of required) {
  const ok = !!process.env[key]?.trim();
  console.log(`${ok ? '✓' : '✗'} ${key}`);
  if (!ok) missing += 1;
}

for (const key of optional) {
  const ok = !!process.env[key]?.trim();
  console.log(`${ok ? '✓' : '○'} ${key} (optional)`);
}

const paywallOff =
  process.env.DISABLE_PAYWALL === 'true' || process.env.NEXT_PUBLIC_DISABLE_PAYWALL === 'true';
const billingReady =
  !!process.env.STRIPE_SECRET_KEY &&
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
  !paywallOff;

console.log('\nPaywall active when deployed:', billingReady ? 'YES' : 'NO');
if (missing > 0) {
  console.log(`\n${missing} required value(s) missing. Copy .env.local.example → .env.local and fill in.\n`);
  process.exit(1);
}

console.log('\nAll required env vars present.\n');
