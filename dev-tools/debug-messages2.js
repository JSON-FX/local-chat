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
  
  // Send text message
  console.log('Sending text message...');
  const textRes = await fetch(`${BASE_URL}/api/messages/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      recipient_id: 2,
      content: 'Test message - text only',
      message_type: 'text'
    })
  });
  const textData = await textRes.json();
  console.log('Text message response:', JSON.stringify(textData, null, 2));
  
  // Send file message
  console.log('\nSending file message...');
  const fileRes = await fetch(`${BASE_URL}/api/messages/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      recipient_id: 2,
      content: 'Test message with file attachment',
      message_type: 'text',
      file_path: '/uploads/test-document.pdf',
      file_name: 'test-document.pdf',
      file_size: 1024
    })
  });
  const fileData = await fileRes.json();
  console.log('File message response:', JSON.stringify(fileData, null, 2));
  
  // Get messages
  console.log('\nGetting messages...');
  const msgRes = await fetch(`${BASE_URL}/api/messages/direct/2`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const messages = await msgRes.json();
  console.log('Messages:', JSON.stringify(messages.data.slice(0, 2), null, 2));
}

debug();
