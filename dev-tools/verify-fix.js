const fetch = require('node-fetch');

async function verifyFix() {
  console.log('🔍 Detailed Fix Verification\n');
  
  // Login
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  });
  const { data: { token } } = await loginRes.json();
  
  // Test 1: Send with file data
  console.log('1. Sending message WITH file data...');
  const withFileRes = await fetch('http://localhost:3000/api/messages/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      recipient_id: 2,
      content: 'FIX TEST: With file',
      message_type: 'text',
      file_path: '/uploads/fix-test.pdf',
      file_name: 'fix-test.pdf',
      file_size: 4096
    })
  });
  const withFileData = await withFileRes.json();
  console.log('   Response file_name:', withFileData.data?.file_name || 'NULL ❌');
  console.log('   Response file_path:', withFileData.data?.file_path || 'NULL ❌');
  console.log('   Response file_size:', withFileData.data?.file_size || 'NULL ❌');
  
  // Test 2: Send without file data
  console.log('\n2. Sending message WITHOUT file data...');
  const withoutFileRes = await fetch('http://localhost:3000/api/messages/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      recipient_id: 2,
      content: 'FIX TEST: No file',
      message_type: 'text'
    })
  });
  const withoutFileData = await withoutFileRes.json();
  console.log('   Response file_name:', withoutFileData.data?.file_name === null ? 'NULL ✅' : withoutFileData.data?.file_name);
  
  // Check database
  console.log('\n3. Checking database...');
  const dbRes = await fetch(`http://localhost:3000/api/messages/direct/2?limit=5`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const messages = await dbRes.json();
  
  const fixTests = messages.data.filter(m => m.content.includes('FIX TEST'));
  fixTests.forEach(msg => {
    console.log(`\n   Message: "${msg.content}"`);
    console.log(`   - file_name: ${msg.file_name || 'NULL'}`);
    console.log(`   - file_path: ${msg.file_path || 'NULL'}`);
    console.log(`   - file_size: ${msg.file_size || 'NULL'}`);
  });
}

verifyFix().catch(console.error);
