type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/** Simple in-memory rate limit (per instance). Returns true if allowed. */
export function rateLimitAllow(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }
  bucket.count += 1;
  return bucket.count <= limit;
}

export function clientIpFromRequest(req: Request): string {
  // Prefer platform-set headers over client-spoofable X-Forwarded-For.
  const vercel = req.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim();
  if (vercel) return vercel;
  const real = req.headers.get('x-real-ip')?.trim();
  if (real) return real;
  const xf = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (xf) return xf;
  return 'unknown';
}
