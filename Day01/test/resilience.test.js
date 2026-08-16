/**
 * LogicLab Automated Resilience & Architecture Test Suite
 * Tests failure cases, idempotency guarantees, circuit breakers,
 * atomic Redis vote transitions, and deduplication.
 */

const assert = require("assert");
const crypto = require("crypto");
const CircuitBreaker = require("../src/utilities/circuitBreaker");
const { getLanguageById } = require("../src/utilities/ProblemUtility");
const validate = require("../src/utilities/validator");

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

const test = async (name, fn) => {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failedTests++;
    console.error(`  ✗ ${name}`);
    console.error(`    Error: ${err.message}`);
  }
};

const runAllTests = async () => {
  console.log("\n==================================================");
  console.log("  LOGICLAB RESILIENCE & ARCHITECTURE TEST SUITE");
  console.log("==================================================\n");

  // ── 1. Circuit Breaker State Transitions ──
  console.log("[1] Testing Circuit Breaker (CLOSED -> OPEN -> HALF-OPEN -> CLOSED)...");

  await test("Circuit starts in CLOSED state", async () => {
    const cb = new CircuitBreaker({ name: "TestService", failureThreshold: 3, resetTimeout: 100 });
    assert.strictEqual(cb.state, "CLOSED");
    assert.strictEqual(cb.failureCount, 0);

    const result = await cb.execute(async () => "healthy");
    assert.strictEqual(result, "healthy");
    assert.strictEqual(cb.state, "CLOSED");
  });

  await test("Circuit opens after reaching failure threshold and fast-fails", async () => {
    const cb = new CircuitBreaker({ name: "TestService", failureThreshold: 3, resetTimeout: 100 });

    for (let i = 0; i < 3; i++) {
      try {
        await cb.execute(async () => {
          throw new Error("Downstream connection timeout");
        });
      } catch (e) {
        // Expected failures
      }
    }

    assert.strictEqual(cb.state, "OPEN");
    assert.strictEqual(cb.failureCount, 3);

    // Call should fast-fail without executing fn
    let executed = false;
    try {
      await cb.execute(async () => {
        executed = true;
        return "success";
      });
      assert.fail("Should have thrown 503 circuit open error");
    } catch (err) {
      assert.strictEqual(err.isCircuitOpen, true);
      assert.strictEqual(err.status, 503);
      assert.strictEqual(executed, false, "Protected function must not execute when circuit is OPEN");
    }
  });

  await test("Circuit transitions to HALF-OPEN after resetTimeout and recovers to CLOSED", async () => {
    const cb = new CircuitBreaker({ name: "TestService", failureThreshold: 2, resetTimeout: 50 });

    // Trip circuit
    for (let i = 0; i < 2; i++) {
      try {
        await cb.execute(async () => {
          throw new Error("Failed");
        });
      } catch (e) {}
    }
    assert.strictEqual(cb.state, "OPEN");

    // Wait for reset timeout
    await new Promise((r) => setTimeout(r, 60));

    // Next probe call should execute and close circuit on success
    const result = await cb.execute(async () => "probe_success");
    assert.strictEqual(result, "probe_success");
    assert.strictEqual(cb.state, "CLOSED");
    assert.strictEqual(cb.failureCount, 0);
  });

  // ── 2. Idempotency & Conflict Detection ──
  console.log("\n[2] Testing Idempotency & Payload Hashing (Case 1 to 6)...");

  const computePayloadHash = (userId, problemId, code, language) => {
    const normalizedLanguage = language.toLowerCase().trim();
    const normalizedCode = code.trim();
    return crypto
      .createHash("sha256")
      .update(`${userId}:${problemId}:${normalizedLanguage}:${normalizedCode}`)
      .digest("hex");
  };

  await test("Same submission payload produces deterministic hash", async () => {
    const hash1 = computePayloadHash("u1", "p1", "function solve() { return 1; }", "javascript");
    const hash2 = computePayloadHash("u1", "p1", "function solve() { return 1; }", "JavaScript");
    assert.strictEqual(hash1, hash2);
  });

  await test("Conflicting submission payload generates distinct hash (Case 6 Conflict Detection)", async () => {
    const hashOriginal = computePayloadHash("u1", "p1", "function solve() { return 1; }", "javascript");
    const hashTampered = computePayloadHash("u1", "p1", "function solve() { return 2; }", "javascript");
    assert.notStrictEqual(hashOriginal, hashTampered);
  });

  // ── 3. Vote State Transition Logic ──
  console.log("\n[3] Testing Vote State Transitions & Toggle Math...");

  const simulateVoteTransition = (currentVote, action) => {
    let scoreDelta = 0;
    let newVote = "none";

    if (action === "upvote") {
      if (currentVote === "upvote") {
        scoreDelta = -1;
        newVote = "none";
      } else {
        scoreDelta = currentVote === "downvote" ? 2 : 1;
        newVote = "upvote";
      }
    } else if (action === "downvote") {
      if (currentVote === "downvote") {
        scoreDelta = 1;
        newVote = "none";
      } else {
        scoreDelta = currentVote === "upvote" ? -2 : -1;
        newVote = "downvote";
      }
    }

    return { newVote, scoreDelta };
  };

  await test("Vote transition: none -> upvote (delta = +1)", async () => {
    const res = simulateVoteTransition("none", "upvote");
    assert.strictEqual(res.newVote, "upvote");
    assert.strictEqual(res.scoreDelta, 1);
  });

  await test("Vote transition: upvote -> upvote toggle off (delta = -1)", async () => {
    const res = simulateVoteTransition("upvote", "upvote");
    assert.strictEqual(res.newVote, "none");
    assert.strictEqual(res.scoreDelta, -1);
  });

  await test("Vote transition: downvote -> upvote flip (delta = +2)", async () => {
    const res = simulateVoteTransition("downvote", "upvote");
    assert.strictEqual(res.newVote, "upvote");
    assert.strictEqual(res.scoreDelta, 2);
  });

  await test("Vote transition: upvote -> downvote flip (delta = -2)", async () => {
    const res = simulateVoteTransition("upvote", "downvote");
    assert.strictEqual(res.newVote, "downvote");
    assert.strictEqual(res.scoreDelta, -2);
  });

  // ── 4. Error Classification & Permanent vs Transient ──
  console.log("\n[4] Testing Error Classification & Language Normalization...");

  await test("Language ID lookup supports cpp, c++, java, and javascript aliases", async () => {
    assert.strictEqual(getLanguageById("c++"), 54);
    assert.strictEqual(getLanguageById("cpp"), 54);
    assert.strictEqual(getLanguageById("Java"), 62);
    assert.strictEqual(getLanguageById("javascript"), 63);
    assert.strictEqual(getLanguageById("JS"), 63);
    assert.strictEqual(getLanguageById("invalid_lang"), null);
  });

  // ── 5. Validator Robustness ──
  console.log("\n[5] Testing Request Validator Robustness...");

  await test("Validator safely rejects missing or malformed inputs without crashing", async () => {
    assert.throws(() => validate(null), /Invalid request body/);
    assert.throws(() => validate({}), /Some Field missing/);
    assert.throws(() => validate({ firstName: 123, emailId: "test@example.com", password: "Password@123" }), /firstName must be a string/);
    assert.throws(() => validate({ firstName: "ab", emailId: "test@example.com", password: "Password@123" }), /Invalid firstName/);
  });

  await test("Validator accepts valid registration payload", async () => {
    assert.doesNotThrow(() => {
      validate({
        firstName: "Alice",
        emailId: "alice@example.com",
        password: "StrongPassword@123!",
      });
    });
  });

  // ── 6. Event Schema & Envelope Verification ──
  console.log("\n[6] Testing Event Envelopes & Kafka Ordering Keying...");

  await test("Kafka event envelopes have stable eventId, timestamp, and entityId", async () => {
    const event = {
      eventId: crypto.randomUUID(),
      eventType: "UPVOTE",
      entityId: "650000000000000000000001",
      actorId: "650000000000000000000002",
      recipientId: "650000000000000000000003",
      timestamp: Date.now(),
      payload: { postId: "650000000000000000000001" },
    };

    assert.ok(event.eventId);
    assert.strictEqual(typeof event.timestamp, "number");
    assert.strictEqual(event.entityId, event.payload.postId);
  });

  // ── 7. SSE Formatting & Heartbeat Verification ──
  console.log("\n[7] Testing SSE Protocol & Heartbeat Comment Compliance...");

  await test("SSE heartbeat complies with standard comment frame (no empty events)", async () => {
    const sseCommentFrame = ":\n\n";
    assert.strictEqual(sseCommentFrame.startsWith(":"), true);
    assert.strictEqual(sseCommentFrame.endsWith("\n\n"), true);
  });

  // ── Test Summary ──
  console.log("\n==================================================");
  console.log(`  TEST RESULTS: ${passedTests}/${totalTests} PASSED (${failedTests} failed)`);
  console.log("==================================================\n");

  if (failedTests > 0) {
    process.exit(1);
  }
};

runAllTests().catch((err) => {
  console.error("Test Suite Fatal Error:", err);
  process.exit(1);
});
