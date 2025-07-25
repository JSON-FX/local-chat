const fetch = require('node-fetch');

// Base URL of the application
const BASE_URL = 'http://localhost:3000';

// Test credentials
const TEST_USER = {
  username: 'admin',
  password: 'admin123'
};

let authToken = '';
let userId = null;

// Helper function to make authenticated requests
async function makeRequest(endpoint, options = {}) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authToken ? `Bearer ${authToken}` : '',
        ...options.headers
      }
    });
    
    const contentType = response.headers.get('content-type');
    let data;
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }
    
    return { response, data };
  } catch (error) {
    console.error('Request failed:', error);
    return { response: { ok: false }, data: { error: error.message } };
  }
}

// Test 1: Login
async function testLogin() {
  console.log('🔐 Testing login...');
  
  const { response, data } = await makeRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(TEST_USER)
  });
  
  if (response.ok && data.data && data.data.token) {
    authToken = data.data.token;
    userId = data.data.user.id;
    console.log('✅ Login successful');
    return true;
  } else {
    console.error('❌ Login failed:', data.error || data);
    return false;
  }
}

// Test 2: Send text-only message
async function testSendTextMessage() {
  console.log('\n📝 Testing text-only message...');
  
  const messageData = {
    recipient_id: 2, // Assuming there's a user with id 2
    content: 'Test message - text only',
    message_type: 'text'
  };
  
  const { response, data } = await makeRequest('/api/messages/send', {
    method: 'POST',
    body: JSON.stringify(messageData)
  });
  
  if (response.ok && data.success) {
    console.log('✅ Text message sent successfully');
    console.log('   Message ID:', data.data.id);
    console.log('   Content:', data.data.content);
    console.log('   File name:', data.data.file_name || 'None');
    return true;
  } else {
    console.error('❌ Failed to send text message:', data.error || data);
    return false;
  }
}

// Test 3: Send message with file
async function testSendFileMessage() {
  console.log('\n📎 Testing message with file...');
  
  // First, simulate a file upload (in real UI, this would be done through file upload)
  const messageData = {
    recipient_id: 2,
    content: 'Test message with file attachment',
    message_type: 'text',
    file_path: '/uploads/test-document.pdf',
    file_name: 'test-document.pdf',
    file_size: 1024
  };
  
  const { response, data } = await makeRequest('/api/messages/send', {
    method: 'POST',
    body: JSON.stringify(messageData)
  });
  
  if (response.ok && data.success) {
    console.log('✅ File message sent successfully');
    console.log('   Message ID:', data.data.id);
    console.log('   Content:', data.data.content);
    console.log('   File name:', data.data.file_name);
    console.log('   File path:', data.data.file_path);
    console.log('   File size:', data.data.file_size);
    return true;
  } else {
    console.error('❌ Failed to send file message:', data.error || data);
    return false;
  }
}

// Test 4: Verify messages in database
async function testGetMessages() {
  console.log('\n📊 Verifying messages in database...');
  
  const { response, data } = await makeRequest('/api/messages/direct/2', {
    method: 'GET'
  });
  
  if (response.ok && data.success && data.data) {
    console.log('✅ Retrieved messages successfully');
    console.log('   Total messages:', data.data.length);
    
    // Look for our test messages
    const textMessage = data.data.find(msg => 
      msg.content && msg.content.includes('Test message - text only') && !msg.file_name
    );
    const fileMessage = data.data.find(msg => 
      msg.content && msg.content.includes('Test message with file attachment') && msg.file_name === 'test-document.pdf'
    );
    
    console.log('   Found text-only message:', textMessage ? '✅' : '❌');
    console.log('   Found file message with correct file_name:', fileMessage ? '✅' : '❌');
    
    if (!fileMessage && data.data.length > 0) {
      console.log('   Latest message file info:', {
        file_name: data.data[0].file_name,
        file_path: data.data[0].file_path,
        file_size: data.data[0].file_size
      });
    }
    
    return !!textMessage && !!fileMessage;
  } else {
    console.error('❌ Failed to get messages:', data.error || data);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting manual UI regression tests...\n');
  
  try {
    // Run tests in sequence
    const loginSuccess = await testLogin();
    if (!loginSuccess) {
      console.error('\n❌ Login failed, cannot continue tests');
      process.exit(1);
    }
    
    const textMessageSuccess = await testSendTextMessage();
    const fileMessageSuccess = await testSendFileMessage();
    const verificationSuccess = await testGetMessages();
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📋 Test Summary:');
    console.log('   Login: ✅');
    console.log('   Text message:', textMessageSuccess ? '✅' : '❌');
    console.log('   File message:', fileMessageSuccess ? '✅' : '❌');
    console.log('   Database verification:', verificationSuccess ? '✅' : '❌');
    
    const allPassed = textMessageSuccess && fileMessageSuccess && verificationSuccess;
    console.log('\nOverall:', allPassed ? '✅ All tests passed!' : '❌ Some tests failed');
    console.log('='.repeat(50));
    
    process.exit(allPassed ? 0 : 1);
  } catch (error) {
    console.error('\n❌ Test execution error:', error);
    process.exit(1);
  }
}

// Run the tests
runTests();
