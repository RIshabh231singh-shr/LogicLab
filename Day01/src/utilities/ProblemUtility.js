const axios = require("axios");
const CircuitBreaker = require("./circuitBreaker");

const judge0CircuitBreaker = new CircuitBreaker({
  name: "Judge0",
  failureThreshold: 5,
  resetTimeout: 20000, // 20s
});

const getLanguageById = (lang) => {
  if (!lang) return null;
  const normalized = lang.toString().toLowerCase().trim();
  const language = {
    "c++": 54,
    "cpp": 54,
    "java": 62,
    "javascript": 63,
    "js": 63,
  };

  return language[normalized] || null;
};

const getApiKey = () => {
  return (
    process.env.JUDGE0_KEY ||
    process.env.RAPIDAPI_KEY ||
    "ab99c6ec42mshfd636ec7c6687efp1b9043jsna684835b0591"
  );
};

const submitBatch = async (submissions) => {
  if (!submissions || !Array.isArray(submissions) || submissions.length === 0) {
    const err = new Error("Invalid submission batch payload");
    err.isPermanent = true;
    throw err;
  }

  const options = {
    method: "POST",
    url: "https://judge0-ce.p.rapidapi.com/submissions/batch",
    params: {
      base64_encoded: "false",
    },
    headers: {
      "x-rapidapi-key": getApiKey(),
      "x-rapidapi-host": "judge0-ce.p.rapidapi.com",
      "Content-Type": "application/json",
    },
    data: {
      submissions,
    },
    timeout: 10000, // 10s timeout
  };

  return await judge0CircuitBreaker.execute(async () => {
    try {
      const response = await axios.request(options);
      return response.data; // Array of objects containing tokens
    } catch (error) {
      console.error("[Judge0] submitBatch API Error:", error.response?.data || error.message);
      const isRetryable =
        !error.response ||
        error.response.status === 429 ||
        error.response.status >= 500 ||
        error.code === "ECONNABORTED" ||
        error.code === "ETIMEDOUT";

      const err = new Error(
        error.response?.data?.message || error.message || "Failed to submit batch to Judge0"
      );
      err.isRetryable = isRetryable;
      err.isPermanent = !isRetryable;
      err.statusCode = error.response?.status;
      throw err;
    }
  });
};

const waiting = (timer) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(1);
    }, timer);
  });
};

const submitToken = async (resultToken) => {
  if (!resultToken || resultToken.length === 0) return [];

  const options = {
    method: "GET",
    url: "https://judge0-ce.p.rapidapi.com/submissions/batch",
    params: {
      tokens: resultToken.join(","),
      base64_encoded: "false",
      fields: "*",
    },
    headers: {
      "x-rapidapi-key": getApiKey(),
      "x-rapidapi-host": "judge0-ce.p.rapidapi.com",
    },
    timeout: 10000,
  };

  async function fetchData() {
    try {
      const response = await axios.request(options);
      return response.data;
    } catch (error) {
      console.error("[Judge0] submitToken API Error:", error.response?.data || error.message);
      return null;
    }
  }

  return await judge0CircuitBreaker.execute(async () => {
    let retries = 15; // Max 15 seconds waiting
    while (retries > 0) {
      const result = await fetchData();

      if (!result || !result.submissions || !Array.isArray(result.submissions)) {
        // API error or rate limit hit, keep waiting and retrying
        await waiting(1000);
        retries--;
        continue;
      }

      const isResultObtained = result.submissions.every((r) => r.status_id > 2);

      if (isResultObtained) {
        return result.submissions;
      }

      await waiting(1000);
      retries--;
    }

    const timeoutErr = new Error("Timeout waiting for Judge0 results");
    timeoutErr.isRetryable = true;
    throw timeoutErr;
  });
};

module.exports = {
  getLanguageById,
  submitBatch,
  submitToken,
  judge0CircuitBreaker,
};

