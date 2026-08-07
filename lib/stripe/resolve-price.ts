import type Stripe from 'stripe';
import { COURSE_PRICE_CENTS, COURSE_PRODUCT_NAME, MONTHLY_PRICE_CENTS } from '@/lib/billing/price';
import { getStripePriceId } from '@/lib/stripe/config';

const PRODUCT_NAME = 'Daywinner bot';

export async function resolveMonthlyPriceId(stripe: Stripe): Promise<string> {
  // Prefer explicit price from Vercel (points at the real Daywinner bot product).
  const configured = getStripePriceId();
  if (configured) {
    const price = await stripe.prices.retrieve(configured);
    if (price.active) return price.id;
  }

  const products = await stripe.products.list({ active: true, limit: 100 });
  let product = products.data.find(p => p.name === PRODUCT_NAME);

  if (!product) {
    product = await stripe.products.create({
      name: PRODUCT_NAME,
      description: 'Work timer, projects, and accountability. Billed monthly.',
    });
  }

  const prices = await stripe.prices.list({ product: product.id, active: true, limit: 100 });
  const match = prices.data.find(
    p =>
      p.recurring?.interval === 'month' &&
      p.unit_amount === MONTHLY_PRICE_CENTS &&
      p.currency === 'usd'
  );
  if (match) return match.id;

  const created = await stripe.prices.create({
    product: product.id,
    unit_amount: MONTHLY_PRICE_CENTS,
    currency: 'usd',
    recurring: { interval: 'month' },
  });
  return created.id;
}

export async function resolveCoursePriceId(stripe: Stripe): Promise<string> {
  const products = await stripe.products.list({ active: true, limit: 100 });
  let product = products.data.find(p => p.name === COURSE_PRODUCT_NAME);

  if (!product) {
    product = await stripe.products.create({
      name: COURSE_PRODUCT_NAME,
      description: 'Daywinner course — one-time purchase',
    });
  }

  const prices = await stripe.prices.list({ product: product.id, active: true, limit: 100 });
  const match = prices.data.find(
    p => !p.recurring && p.unit_amount === COURSE_PRICE_CENTS && p.currency === 'usd'
  );
  if (match) return match.id;

  const created = await stripe.prices.create({
    product: product.id,
    unit_amount: COURSE_PRICE_CENTS,
    currency: 'usd',
  });
  return created.id;
}
