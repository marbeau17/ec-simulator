// ============================================================
// Simple in-memory rate limiter for Gemini API calls
// Uses a sliding window counter approach
// ============================================================

type ModelType = "flash" | "pro";

interface RateLimitConfig {
  maxRequests: number; // Maximum requests per window
  windowMs: number; // Window size in milliseconds
}

interface RateLimitCheck {
  allowed: boolean;
  retryAfterMs?: number;
}

// Rate limit configuration per model
const RATE_LIMITS: Record<ModelType, RateLimitConfig> = {
  flash: { maxRequests: 15, windowMs: 60_000 }, // 15 requests per minute
  pro: { maxRequests: 2, windowMs: 60_000 }, // 2 requests per minute
};

// In-memory storage of timestamps for each model
const usageTimestamps: Record<ModelType, number[]> = {
  flash: [],
  pro: [],
};

/**
 * Remove expired timestamps outside the current sliding window.
 */
function pruneExpired(model: ModelType): void {
  const config = RATE_LIMITS[model];
  const cutoff = Date.now() - config.windowMs;
  usageTimestamps[model] = usageTimestamps[model].filter((ts) => ts > cutoff);
}

/**
 * Check whether a request to the given model is allowed under the rate limit.
 *
 * @param model - The model type to check ("flash" or "pro")
 * @returns An object indicating whether the request is allowed, and if not,
 *          how many milliseconds to wait before retrying.
 */
export function checkRateLimit(model: ModelType): RateLimitCheck {
  pruneExpired(model);

  const config = RATE_LIMITS[model];
  const timestamps = usageTimestamps[model];

  if (timestamps.length < config.maxRequests) {
    return { allowed: true };
  }

  // The oldest timestamp in the window determines when the next slot opens
  const oldestInWindow = timestamps[0];
  const retryAfterMs = oldestInWindow + config.windowMs - Date.now();

  return {
    allowed: false,
    retryAfterMs: Math.max(0, retryAfterMs),
  };
}

/**
 * Record a usage event for the given model.
 * Call this immediately before (or after) making an API request.
 *
 * @param model - The model type to record usage for ("flash" or "pro")
 */
export function recordUsage(model: ModelType): void {
  pruneExpired(model);
  usageTimestamps[model].push(Date.now());
}

/**
 * Reset all usage data. Useful for testing.
 */
export function resetUsage(): void {
  usageTimestamps.flash = [];
  usageTimestamps.pro = [];
}
