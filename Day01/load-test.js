const autocannon = require('autocannon');
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const TEST_USER = {
  firstName: 'TestUser',
  lastName: 'User',
  emailId: `testuser_${Date.now()}@example.com`,
  password: 'Password@123'
};

async function getAuthCookie() {
  console.log('Registering/Logging in test user...');
  try {
    const res = await axios.post(`${BASE_URL}/user/register`, TEST_USER);
    const cookie = res.headers['set-cookie'][0];
    console.log('Successfully authenticated.');
    return cookie;
  } catch (err) {
    console.log(`Registration failed: ${err.response?.data || err.message}, trying login...`);
    try {
      const res = await axios.post(`${BASE_URL}/user/login`, {
        emailId: TEST_USER.emailId,
        password: TEST_USER.password
      });
      return res.headers['set-cookie'][0];
    } catch (loginErr) {
      console.error('Authentication failed:', loginErr.response?.data || loginErr.message);
      return null;
    }
  }
}


async function runTest(name, path, cookie, options = {}) {
  const { connections = 10, method = 'GET', body = null } = options;
  console.log(`\nTesting ${name} (${method} ${path}) with ${connections} connections...`);
  
  const headers = {};
  if (cookie) {
    headers['Cookie'] = cookie;
  }
  if (body) {
    headers['Content-Type'] = 'application/json';
  }

  const result = await autocannon({
    url: `${BASE_URL}${path}`,
    method: method,
    body: body ? JSON.stringify(body) : undefined,
    connections: connections,
    duration: 5,
    headers: headers
  });

  return {
    name,
    method,
    path,
    rps: result.requests.average.toFixed(1),
    latency: result.latency.average.toFixed(2),
    errors: result.errors + result.timeouts,
    conns: connections
  };
}

async function start() {
  const cookie = await getAuthCookie();
  const problemId = '69c2d1befc37d8502f41f5db'; 
  
  // Elevate to admin for problem management tests
  console.log('Elevating test user to admin...');
  try {
    const mongoose = require('mongoose');
    const User = require('./src/models/user');
    require('dotenv').config();
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.DB_CONNECT_STRING);
    }
    const email = TEST_USER.emailId;
    await User.findOneAndUpdate({ emailId: email }, { role: 'admin' });
    console.log('User elevated to admin.');
  } catch (err) {
    console.error('Failed to elevate user:', err.message);
  }

  const scenarios = [
    { name: 'Health Check', path: '/health' },
    { name: 'Get Profile (Auth)', path: '/user/getprofile', auth: true },
    { name: 'Get Public Profile', path: `/user/profile/${problemId}`, auth: true }, // Using problemId as a mock user ID for path testing
    { name: 'Submit Code (Async Queue)', path: `/submission/submit/${problemId}`, method: 'POST', body: { language: 'JavaScript', code: 'console.log("hello")' }, auth: true },
    { name: 'AI Chat (Gemini)', path: '/ai/chat', method: 'POST', body: { messages: [{ role: 'user', parts: [{ text: 'Give me a hint' }] }], code: 'function x(){}', problemId: problemId }, auth: true },
    { name: 'Problem Create (Admin)', path: '/problem/create', method: 'POST', body: { title: 'Test Prob', description: 'desc', difficulty: 'easy', tags: ['array'], visibletestCase: [], hiddentestCase: [], startCode: [] }, auth: true },
    { name: 'Problem Update (Admin)', path: `/problem/update/${problemId}`, method: 'PUT', body: { title: 'Updated Prob' }, auth: true },
  ];

  const results = [];
  for (const s of scenarios) {
    const cookieToUse = s.auth ? cookie : null;
    const res = await runTest(s.name, s.path, cookieToUse, { 
      method: s.method || 'GET', 
      body: s.body,
      connections: 1000
    });
    results.push(res);
  }

  console.log('\n--- Final Exhaustive Benchmarks ---');
  console.table(results);
  
  return results;
}

start().catch(console.error);



