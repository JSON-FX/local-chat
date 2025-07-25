import { MessageService } from '../lib/messages';
import { getDatabase } from '../lib/database';

async function testDirectly() {
  console.log('Testing MessageService directly...\n');
  
  const messageData = {
    sender_id: 1,
    recipient_id: 2,
    content: 'Direct test with file',
    message_type: 'text' as const,
    file_path: '/uploads/direct-test.pdf',
    file_name: 'direct-test.pdf',
    file_size: 3072
  };
  
  console.log('Input data:', messageData);
  
  try {
    const result = await MessageService.sendMessage(messageData);
    console.log('\nResult:', result);
    
    // Check database directly
    const db = await getDatabase();
    const dbResult = await db.get(
      'SELECT * FROM messages WHERE id = ?',
      [result.id]
    );
    console.log('\nDatabase row:', dbResult);
  } catch (error) {
    console.error('Error:', error);
  }
  
  process.exit(0);
}

testDirectly();
