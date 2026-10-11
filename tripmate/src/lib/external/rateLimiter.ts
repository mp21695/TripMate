type RateLimitRecord = {
  timestamps: number[];
};

const userRateLimits = new Map<string, RateLimitRecord>();

/**
 * In-memory sliding window rate limiter per user.
 * @param identifier User ID or IP string
 * @param action Key prefix for the action (e.g., 'ai_generate', 'places_search')
 * @param maxRequests Maximum allowed requests in window
 * @param windowSeconds Window duration in seconds
 * @returns boolean: true if allowed, false if limit exceeded
 */
export function checkRateLimit(
  identifier: string,
  action: string,
  maxRequests = 10,
  windowSeconds = 60
): { allowed: boolean; retryAfterSeconds?: number } {
  const key = `${action}:${identifier}`;
  const now = Date.now();
  const windowMs = windowSeconds * 1000;

  const record = userRateLimits.get(key) || { timestamps: [] };
  // Remove timestamps outside window
  record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

  if (record.timestamps.length >= maxRequests) {
    const oldest = record.timestamps[0];
    const retryAfterSeconds = Math.ceil((oldest + windowMs - now) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  record.timestamps.push(now);
  userRateLimits.set(key, record);
  return { allowed: true };
}
