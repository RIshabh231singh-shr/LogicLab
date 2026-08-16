const { createClient } = require("redis");

const redisConfig = {
  username: "default",
  password: process.env.REDIS_PASS?.replace(/"/g, ""),
  socket: {
    host: process.env.REDIS_HOST?.replace(/"/g, "") || "127.0.0.1",
    port: parseInt(process.env.REDIS_PORT) || 6379,
    reconnectStrategy: (retries) => {
      if (retries > 10) return new Error("Redis max retries reached");
      return Math.min(retries * 200, 3000); // wait up to 3s between retries
    },
  },
};

const createRedisClient = () => {
  const client = createClient(redisConfig);
  client.on("error", (err) => {
    console.error("[Redis] Connection error:", err.message);
  });
  return client;
};

const redisclient = createRedisClient();

redisclient.on("reconnecting", () => {
  console.log("[Redis] Reconnecting...");
});

/**
 * Atomic Lua script for voting (upvote/downvote transitions)
 */
const VOTE_LUA_SCRIPT = `
local currentVote = redis.call("GET", KEYS[1])
local scoreDelta = 0
local newVote = "none"

if ARGV[1] == "upvote" then
  if currentVote == "upvote" then
    redis.call("DEL", KEYS[1])
    scoreDelta = -1
    newVote = "none"
  else
    redis.call("SETEX", KEYS[1], tonumber(ARGV[2]), "upvote")
    if currentVote == "downvote" then
      scoreDelta = 2
    else
      scoreDelta = 1
    end
    newVote = "upvote"
  end
elseif ARGV[1] == "downvote" then
  if currentVote == "downvote" then
    redis.call("DEL", KEYS[1])
    scoreDelta = 1
    newVote = "none"
  else
    redis.call("SETEX", KEYS[1], tonumber(ARGV[2]), "downvote")
    if currentVote == "upvote" then
      scoreDelta = -2
    else
      scoreDelta = -1
    end
    newVote = "downvote"
  end
end

local exists = redis.call("EXISTS", KEYS[2])
if exists == 0 and ARGV[3] then
  redis.call("SET", KEYS[2], tonumber(ARGV[3]))
end

local newScore = redis.call("INCRBY", KEYS[2], scoreDelta)
redis.call("EXPIRE", KEYS[2], 604800)

return cjson.encode({
  currentVote = currentVote or "none",
  newVote = newVote,
  scoreDelta = scoreDelta,
  newScore = newScore
})
`;

/**
 * Execute atomic vote transition in Redis
 */
const executeAtomicVote = async ({ voteKey, scoreKey, targetAction, initialScore = 0, ttlSeconds = 86400 }) => {
  const rawResult = await redisclient.eval(VOTE_LUA_SCRIPT, {
    keys: [voteKey, scoreKey],
    arguments: [targetAction, String(ttlSeconds), String(initialScore)],
  });

  return JSON.parse(rawResult);
};

/**
 * Atomic Rate Limiter Script
 */
const RATE_LIMIT_LUA_SCRIPT = `
local current = redis.call("INCR", KEYS[1])
if current == 1 then
  redis.call("EXPIRE", KEYS[1], tonumber(ARGV[2]))
end
local ttl = redis.call("TTL", KEYS[1])
return { current, ttl }
`;

const executeAtomicRateLimit = async ({ key, limit, windowSeconds }) => {
  const res = await redisclient.eval(RATE_LIMIT_LUA_SCRIPT, {
    keys: [key],
    arguments: [String(limit), String(windowSeconds)],
  });
  return {
    currentCount: res[0],
    ttl: res[1],
    isBlocked: res[0] > limit,
  };
};

module.exports = redisclient;
module.exports.createRedisClient = createRedisClient;
module.exports.executeAtomicVote = executeAtomicVote;
module.exports.executeAtomicRateLimit = executeAtomicRateLimit;

