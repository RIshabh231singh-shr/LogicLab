const redisclient = require("../config/redis");

const WINDOW_SECONDS = 60 * 60; // 1 hour
const MAX_REQUESTS = 50;

/**
 * Sliding Window Rate Limiter (Redis Sorted Set)
 *
 * Per user, keyed as  rate:submit:<userId>
 * Each allowed submission stores its timestamp (ms) as both score and value.
 *
 * Flow per request:
 *  1. ZREMRANGEBYSCORE  → purge entries outside the 1-hr window
 *  2. ZCARD             → count submissions inside the window
 *  3. If count >= 50    → reject 429  (no entry is added)
 *  4. Else              → ZADD current ts + EXPIRE key → allow
 */
const submissionRateLimiter = async (req, res, next) => {
  try {
    const userId = req.result._id.toString(); // populated by userMiddleware
    const key = `rate:submit:${userId}`;
    const now = Date.now();
    const windowStart = now - WINDOW_SECONDS * 1000;

    // Step 1 & 2 – purge stale entries then count valid ones (single pipeline)
    const cleanPipeline = redisclient.multi();
    cleanPipeline.zRemRangeByScore(key, "-inf", windowStart);
    cleanPipeline.zCard(key);
    const [, currentCount] = await cleanPipeline.exec();

    if (currentCount >= MAX_REQUESTS) {
      // Tell the user how long until the oldest entry expires
      const oldest = await redisclient.zRange(key, 0, 0); // lowest score = oldest
      let retryAfterSeconds = WINDOW_SECONDS;
      if (oldest.length) {
        const oldestScore = await redisclient.zScore(key, oldest[0]);
        retryAfterSeconds = Math.ceil(
          (Number(oldestScore) + WINDOW_SECONDS * 1000 - now) / 1000
        );
      }

      res.set("Retry-After", Math.max(1, retryAfterSeconds));
      return res.status(429).json({
        message: `Rate limit exceeded. Max ${MAX_REQUESTS} submissions per hour. Retry after ${Math.max(1, retryAfterSeconds)}s.`,
        retryAfter: Math.max(1, retryAfterSeconds),
        limit: MAX_REQUESTS,
        remaining: 0,
      });
    }

    // Step 4 – record this submission and refresh the TTL
    const addPipeline = redisclient.multi();
    addPipeline.zAdd(key, [{ score: now, value: `${now}` }]);
    addPipeline.expire(key, WINDOW_SECONDS);
    await addPipeline.exec();

    // Expose headers so the frontend can show "X submissions left"
    res.set({
      "X-RateLimit-Limit": String(MAX_REQUESTS),
      "X-RateLimit-Remaining": String(MAX_REQUESTS - currentCount - 1),
      "X-RateLimit-Window": `${WINDOW_SECONDS}s`,
    });

    next();
  } catch (err) {
    // Fail open – if Redis is unavailable, don't block legitimate users
    console.error("[RateLimiter] Redis error, skipping rate limit:", err.message);
    next();
  }
};

module.exports = submissionRateLimiter;
