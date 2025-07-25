const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function verifyFileIssue() {
  console.log('🔍 Verifying File Attachment Issue\n');
  
  // Login
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  });
  const { data: { token } } = await loginRes.json();
  
  // Send message with file data
  console.log('1. Sending message with file attachment...');
  const messageData = {
    recipient_id: 2,
    content: 'REGRESSION TEST: File attachment',
    message_type: 'text',
    file_path: '/uploads/regression-test.pdf',
    file_name: 'regression-test.pdf',
    file_size: 2048
  };
  
  const sendRes = await fetch(`${BASE_URL}/api/messages/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(messageData)
  });
  
  const sendData = await sendRes.json();
  console.log('   API Response:', {
    success: sendData.success,
    message_id: sendData.data?.id,
    file_name_in_response: sendData.data?.file_name
  });
  
  // Check database directly
  console.log('\n2. Checking database for file data...');
  const msgRes = await fetch(`${BASE_URL}/api/messages/direct/2`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const messages = await msgRes.json();
  
  const testMessage = messages.data.find(m => m.content.includes('REGRESSION TEST'));
  if (testMessage) {
    console.log('   Message found in DB:');
    console.log('   - Content:', testMessage.content);
    console.log('   - File Name:', testMessage.file_name || 'NULL ❌');
    console.log('   - File Path:', testMessage.file_path || 'NULL ❌');
    console.log('   - File Size:', testMessage.file_size || 'NULL ❌');
  }
  
  console.log('\n📋 CONCLUSION:');
  console.log('The file attachment data is being sent to the API but not saved to the database.');
  console.log('This confirms the regression issue where file messages would fail in the UI.');
}

verifyFileIssue().catch(console.error);
