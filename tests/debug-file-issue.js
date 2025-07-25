const fetch = require('node-fetch');

async function debugFileIssue() {
  // Login
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  });
  const { data: { token } } = await loginRes.json();
  
  console.log('Sending message with file data...\n');
  
  const messageData = {
    recipient_id: 2,
    content: 'DEBUG TEST: File attachment',
    message_type: 'text',
    file_path: '/uploads/debug-test.pdf',
    file_name: 'debug-test.pdf',
    file_size: 2048
  };
  
  console.log('Request body:', JSON.stringify(messageData, null, 2));
  
  const sendRes = await fetch('http://localhost:3000/api/messages/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(messageData)
  });
  
  const result = await sendRes.json();
  console.log('\nAPI Response:', JSON.stringify(result, null, 2));
}

debugFileIssue().catch(console.error);
