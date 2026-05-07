const buckets = new Map<string, number[]>();

export function isRateLimited(
  key: string,
  limit: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const list = buckets.get(key) ?? [];
  const recent = list.filter((ts) => now - ts < windowMs);
  if (recent.length === 0 && buckets.has(key)) {
    buckets.delete(key);
  }
  recent.push(now);
  buckets.set(key, recent);
  for (const [k, timestamps] of Array.from(buckets.entries())) {
    if (timestamps.every((ts) => now - ts >= windowMs)) {
      buckets.delete(k);
    }
  }
  return recent.length > limit;
}

export function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}
