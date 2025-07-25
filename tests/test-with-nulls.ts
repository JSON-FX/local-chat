import { MessageService } from '../lib/messages';

async function testWithNulls() {
  console.log('Testing MessageService with null values...\n');
  
  const messageData = {
    sender_id: 1,
    recipient_id: 2,
    content: 'Test with explicit nulls',
    message_type: 'text' as const,
    file_path: null,
    file_name: null,
    file_size: null
  };
  
  console.log('Input data:', messageData);
  
  try {
    const result = await MessageService.sendMessage(messageData);
    console.log('\nResult file_name:', result.file_name);
  } catch (error) {
    console.error('Error:', error);
  }
  
  process.exit(0);
}

testWithNulls();
