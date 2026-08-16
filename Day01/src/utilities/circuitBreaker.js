/**
 * Circuit Breaker implementation for isolating external network calls
 * (Judge0, Gemini AI, etc.) from cascading system failures.
 *
 * States:
 *  - CLOSED: Requests execute normally. Consecutive failures increment counter.
 *  - OPEN: Requests fail immediately (fail-fast) without hitting external service.
 *  - HALF_OPEN: Trial period after resetTimeout; allows a single probe call to test recovery.
 */
class CircuitBreaker {
  constructor(options = {}) {
    this.name = options.name || "DefaultService";
    this.failureThreshold = options.failureThreshold || 5; // failures before opening
    this.resetTimeout = options.resetTimeout || 30000; // ms to wait before attempting recovery (30s)
    this.state = "CLOSED"; // CLOSED | OPEN | HALF_OPEN
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
  }

  async execute(fn) {
    const now = Date.now();

    if (this.state === "OPEN") {
      if (now >= this.nextAttemptTime) {
        this.state = "HALF_OPEN";
        console.log(`[CircuitBreaker:${this.name}] Transitioned to HALF_OPEN. Testing recovery...`);
      } else {
        const remainingSec = Math.ceil((this.nextAttemptTime - now) / 1000);
        const error = new Error(
          `[CircuitBreaker:${this.name}] Circuit is OPEN. Service temporarily unavailable. Retry in ${remainingSec}s.`
        );
        error.isCircuitOpen = true;
        error.status = 503;
        throw error;
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure(err);
      throw err;
    }
  }

  onSuccess() {
    if (this.state === "HALF_OPEN") {
      console.log(`[CircuitBreaker:${this.name}] Probe succeeded. Circuit is now CLOSED.`);
    }
    this.failureCount = 0;
    this.state = "CLOSED";
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
  }

  onFailure(err) {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    console.warn(
      `[CircuitBreaker:${this.name}] Failure detected (${this.failureCount}/${this.failureThreshold}): ${err.message}`
    );

    if (this.state === "HALF_OPEN" || this.failureCount >= this.failureThreshold) {
      this.state = "OPEN";
      this.nextAttemptTime = Date.now() + this.resetTimeout;
      console.error(
        `[CircuitBreaker:${this.name}] Circuit opened! Fast-failing calls for the next ${this.resetTimeout / 1000}s.`
      );
    }
  }

  getStatus() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime,
    };
  }
}

module.exports = CircuitBreaker;
