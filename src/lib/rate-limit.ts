export interface RateLimiter {
  check(key: string, limit: number, windowMs: number): { ok: boolean; remaining: number };
}

type Bucket = { timestamps: number[] };

export class InMemoryRateLimiter implements RateLimiter {
  private buckets = new Map<string, Bucket>();

  check(key: string, limit: number, windowMs: number) {
    const now = Date.now();
    const bucket = this.buckets.get(key) ?? { timestamps: [] };
    bucket.timestamps = bucket.timestamps.filter((ts) => now - ts < windowMs);
    if (bucket.timestamps.length >= limit) {
      this.buckets.set(key, bucket);
      return { ok: false, remaining: 0 };
    }
    bucket.timestamps.push(now);
    this.buckets.set(key, bucket);
    return { ok: true, remaining: limit - bucket.timestamps.length };
  }
}

const globalForLimiter = globalThis as unknown as {
  rateLimiter?: InMemoryRateLimiter;
};

export function getRateLimiter() {
  if (!globalForLimiter.rateLimiter) {
    globalForLimiter.rateLimiter = new InMemoryRateLimiter();
  }
  return globalForLimiter.rateLimiter;
}
