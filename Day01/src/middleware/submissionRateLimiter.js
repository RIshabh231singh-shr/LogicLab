const redisClient = require("../config/redis");

const WINDOW_SECONDS = 60 * 60; // 1 hour
const MAX_REQUESTS = 50;

// Simple rate limiter for submissions
// Each user can submit max 50 times in 1 hour
const submissionRateLimiter = async (req, res, next) => {
  try {
    const userId = req.result._id.toString();
    const key = `rate:submit:${userId}`;

    const now = Date.now();
    const windowStart = now - WINDOW_SECONDS * 1000;

    // remove old entries (outside 1 hr window)
    await redisClient.zRemRangeByScore(key, "-inf", windowStart);

    // count how many requests are left in window
    const currentCount = await redisClient.zCard(key);

    // if limit reached → block
    if (currentCount >= MAX_REQUESTS) {
      const oldest = await redisClient.zRange(key, 0, 0);

      let retryAfter = WINDOW_SECONDS;

      if (oldest.length) {
        const oldestTime = await redisClient.zScore(key, oldest[0]);

        retryAfter = Math.ceil(
          (Number(oldestTime) + WINDOW_SECONDS * 1000 - now) / 1000
        );
      }

      res.set("Retry-After", Math.max(1, retryAfter));

      return res.status(429).json({
        message: "Too many requests. Try again later.",
        retryAfter,
      });
    }

    // add current request timestamp
    await redisClient.zAdd(key, [{ score: now, value: `${now}` }]);

    // set expiry so Redis cleans up automatically
    await redisClient.expire(key, WINDOW_SECONDS);

    // optional headers
    res.set({
      "X-RateLimit-Limit": MAX_REQUESTS,
      "X-RateLimit-Remaining": MAX_REQUESTS - currentCount - 1,
    });

    next();
  } catch (err) {
    console.log("Rate limiter error:", err.message);

    // don't block user if redis fails
    next();
  }
};

module.exports = submissionRateLimiter;
