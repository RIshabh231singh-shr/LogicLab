const redisclient = require("../config/redis");

/**
 * Creates a rate limiter middleware
 * @param {string} action - The action name for the key (e.g., 'login', 'submission')
 * @param {number} limit - Max number of requests allowed
 * @param {number} windowSeconds - Time window in seconds
 */
const rateLimiter = (action, limit, windowSeconds) => {
  return async (req, res, next) => {
    try {
      // Use email if provided (for login), user ID if authenticated, else use IP address
      const identifier = req.body?.emailId || req.result?._id || req.ip;
      const key = `ratelimit:${action}:${identifier}`;

      // Increment the counter
      const currentCount = await redisclient.incr(key);

      if (currentCount === 1) {
        // First request, set the expiration window
        await redisclient.expire(key, windowSeconds);
      }

      if (currentCount > limit) {
        return res.status(429).json({
          message: `Too many requests for ${action}. Please try again after some time.`,
        });
      }

      next();
    } catch (err) {
      console.error(`[RateLimiter] Error:`, err.message);
      // In case of Redis failure, allow the request to pass to prevent system outage
      next();
    }
  };
};

module.exports = rateLimiter;
