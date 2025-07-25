const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';
const TEST_USER = { username: 'admin', password: 'admin123' };

async function debug() {
  // Login
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(TEST_USER)
  });
  const loginData = await loginRes.json();
  const token = loginData.data.token;
  
  // Get detailed messages
  const msgRes = await fetch(`${BASE_URL}/api/messages/direct/2`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const messages = await msgRes.json();
  
  console.log('Direct messages response:', JSON.stringify(messages, null, 2));
}

debug();
