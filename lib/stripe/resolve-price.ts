import type Stripe from 'stripe';
import { MONTHLY_PRICE_CENTS } from '@/lib/billing/price';

const PRODUCT_NAME = 'Produc';

export async function resolveMonthlyPriceId(stripe: Stripe): Promise<string> {
  const products = await stripe.products.list({ active: true, limit: 100 });
  let product = products.data.find(p => p.name === PRODUCT_NAME);

  if (!product) {
    product = await stripe.products.create({
      name: PRODUCT_NAME,
      description: 'Daywinner bot — work timer, projects, and accountability',
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
