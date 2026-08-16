const { executeAtomicRateLimit } = require("../config/redis");

/**
 * Application-layer rate limiter backed by Redis.
 * Uses atomic Lua script to guarantee atomic INCR + EXPIRE.
 * Implements fail-open semantics to protect system availability in case of Redis outages.
 */
const rateLimiter = (action, limit, windowSeconds) => {
  return async (req, res, next) => {
    try {
      // Use email if provided (for login), user ID if authenticated, else client IP address
      const identifier =
        req.body?.emailId ||
        req.result?._id?.toString() ||
        req.ip ||
        req.headers["x-forwarded-for"] ||
        "anonymous";

      const key = `ratelimit:${action}:${identifier}`;

      const { currentCount, ttl, isBlocked } = await executeAtomicRateLimit({
        key,
        limit,
        windowSeconds,
      });

      res.setHeader("X-RateLimit-Limit", limit);
      res.setHeader("X-RateLimit-Remaining", Math.max(0, limit - currentCount));

      if (isBlocked) {
        res.setHeader("Retry-After", Math.max(1, ttl));
        return res.status(429).json({
          message: `Too many requests for ${action}. Application-layer rate limit reached. Please retry in ${Math.max(1, ttl)}s.`,
          retryAfter: Math.max(1, ttl),
        });
      }

      next();
    } catch (err) {
      console.error(`[RateLimiter:FailOpen] Transient error for ${action}:`, err.message);
      // Fail-open: allow request to proceed so Redis transient failure does not bring down application
      next();
    }
  };
};

module.exports = rateLimiter;

