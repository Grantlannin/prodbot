#!/usr/bin/env node
/**
 * Creates Stripe product/price/webhook for Produc.
 * Requires STRIPE_SECRET_KEY + NEXT_PUBLIC_APP_URL in .env.local
 *
 * Usage: npm run setup:billing
 */
import Stripe from 'stripe';
import { loadEnvLocal } from './load-env-local.mjs';

loadEnvLocal();

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://daywinnerbot.com').replace(/\/$/, '');
const WEBHOOK_URL = `${APP_URL}/api/stripe/webhook`;
const PRODUCT_NAME = 'Produc';
const PRICE_USD = 499; // $4.99

const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
if (!secretKey) {
  console.error('\nMissing STRIPE_SECRET_KEY in .env.local\n');
  console.error('Get it from Stripe Dashboard → Developers → API keys (use test key first: sk_test_...)\n');
  process.exit(1);
}

const stripe = new Stripe(secretKey);

const WEBHOOK_EVENTS = [
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
];

async function findOrCreateProduct() {
  const existing = await stripe.products.list({ limit: 100, active: true });
  const match = existing.data.find(p => p.name === PRODUCT_NAME);
  if (match) {
    console.log(`✓ Product exists: ${match.id}`);
    return match;
  }
  const product = await stripe.products.create({
    name: PRODUCT_NAME,
    description: 'Produc — projects, timer, build my day, chat',
  });
  console.log(`✓ Created product: ${product.id}`);
  return product;
}

async function findOrCreatePrice(productId) {
  const prices = await stripe.prices.list({ product: productId, active: true, limit: 100 });
  const match = prices.data.find(
    p => p.recurring?.interval === 'month' && p.unit_amount === PRICE_USD && p.currency === 'usd'
  );
  if (match) {
    console.log(`✓ Price exists: ${match.id}`);
    return match;
  }
  const price = await stripe.prices.create({
    product: productId,
    unit_amount: PRICE_USD,
    currency: 'usd',
    recurring: { interval: 'month' },
  });
  console.log(`✓ Created price: ${price.id} ($4.99/month)`);
  return price;
}

async function findOrCreateWebhook() {
  const endpoints = await stripe.webhookEndpoints.list({ limit: 100 });
  const match = endpoints.data.find(e => e.url === WEBHOOK_URL && !e.disabled);
  if (match) {
    console.log(`✓ Webhook endpoint exists: ${match.id}`);
    console.log('  (Signing secret is only shown when created — use existing whsec_ from Stripe Dashboard if needed)');
    return { endpoint: match, secret: process.env.STRIPE_WEBHOOK_SECRET?.trim() || null };
  }

  const endpoint = await stripe.webhookEndpoints.create({
    url: WEBHOOK_URL,
    enabled_events: WEBHOOK_EVENTS,
    description: 'Produc subscription billing',
  });
  console.log(`✓ Created webhook: ${endpoint.id}`);
  console.log(`  URL: ${WEBHOOK_URL}`);
  return { endpoint, secret: endpoint.secret };
}

async function enableCustomerPortal() {
  try {
    const config = await stripe.billingPortal.configurations.list({ limit: 1 });
    if (config.data.length > 0) {
      console.log('✓ Customer portal already configured');
      return;
    }
  } catch {
    /* list may fail on new accounts */
  }

  await stripe.billingPortal.configurations.create({
    business_profile: {
      headline: 'Manage your Produc subscription',
    },
    features: {
      payment_method_update: { enabled: true },
      invoice_history: { enabled: true },
      subscription_cancel: { enabled: true },
    },
  });
  console.log('✓ Customer portal configured');
}

async function main() {
  console.log('\nProduc Stripe setup\n');
  console.log(`App URL: ${APP_URL}`);
  console.log(`Mode: ${secretKey.startsWith('sk_live_') ? 'LIVE ⚠️' : 'test'}\n`);

  const product = await findOrCreateProduct();
  const price = await findOrCreatePrice(product.id);
  const { secret: webhookSecret } = await findOrCreateWebhook();
  await enableCustomerPortal();

  const publishableKey =
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ||
    (secretKey.startsWith('sk_test_')
      ? '(your pk_test_... from Stripe Dashboard → API keys)'
      : '(your pk_live_... from Stripe Dashboard → API keys)');

  console.log('\n--- Add these to .env.local AND Vercel ---\n');
  console.log(`STRIPE_PRICE_ID=${price.id}`);
  if (webhookSecret) {
    console.log(`STRIPE_WEBHOOK_SECRET=${webhookSecret}`);
  } else {
    console.log('STRIPE_WEBHOOK_SECRET=whsec_...  # Stripe Dashboard → Webhooks → your endpoint → Signing secret');
  }
  console.log(`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${publishableKey.startsWith('(') ? publishableKey : publishableKey}`);
  console.log(`NEXT_PUBLIC_APP_URL=${APP_URL}`);
  console.log('\nThen run: npm run check:billing');
  console.log('Then add ALL vars from .env.local to Vercel → Settings → Environment Variables → Redeploy\n');
}

main().catch(err => {
  console.error('\nSetup failed:', err.message || err);
  process.exit(1);
});
