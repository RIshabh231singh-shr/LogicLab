const axios = require("axios");
const getLanguageById = (lang) => {
  const language = {
    "c++": 54,
    java: 62,
    javascript: 63,
  };

  return language[lang.toLowerCase()];
};

const submitBatch = async (submissions) => {
  const options = {
    method: "POST",
    url: "https://judge0-ce.p.rapidapi.com/submissions/batch",
    params: {
      base64_encoded: "false",
    },
    headers: {
      "x-rapidapi-key": "ab99c6ec42mshfd636ec7c6687efp1b9043jsna684835b0591",
      "x-rapidapi-host": "judge0-ce.p.rapidapi.com",
      "Content-Type": "application/json",
    },
    data: {
      submissions,
    },
  };

  try {
    const response = await axios.request(options);
    return response.data; // This is usually an array of objects containing tokens
  } catch (error) {
    console.error("submitBatch API Error:", error.response?.data || error.message);
    throw new Error("Failed to submit batch to Judge0");
  }
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
      "x-rapidapi-key": "ab99c6ec42mshfd636ec7c6687efp1b9043jsna684835b0591",
      "x-rapidapi-host": "judge0-ce.p.rapidapi.com",
    },
  };

  async function fetchData() {
    try {
      const response = await axios.request(options);
      return response.data;
    } catch (error) {
      console.error("submitToken API Error:", error.response?.data || error.message);
      return null;
    }
  }

  let retries = 15; // Max 15 seconds waiting
  while (retries > 0) {
    const result = await fetchData();

    if (!result || !result.submissions || !Array.isArray(result.submissions)) {
      // API error or rate limit hit, keep waiting and retrying
      await waiting(1000);
      retries--;
      continue;
    }

    const IsResultObtained = result.submissions.every((r) => r.status_id > 2);

    if (IsResultObtained) {
       return result.submissions;
    }

    await waiting(1000);
    retries--;
  }
  
  throw new Error("Timeout waiting for Judge0 results");
};

module.exports = { getLanguageById, submitBatch, submitToken };
