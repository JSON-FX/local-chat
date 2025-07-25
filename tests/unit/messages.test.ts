import { getDatabase } from '../../lib/database';
import { MessageService } from '../../lib/messages';

jest.mock('../../lib/database');

// Set up mocked database interface
const mockDb = {
  get: jest.fn(),
  run: jest.fn(),
};
(getDatabase as jest.Mock).mockReturnValue(mockDb);

// Test case 1: Insert a text-only message
it('should successfully insert a text-only message', async () => {
  // Arrange
  const messageData = {
    sender_id: 1,
    recipient_id: 2,
    content: 'Hello',
    message_type: 'text',
  };

  const expectedMessage = {
    id: 1,
    ...messageData,
    group_id: null,
    file_path: null,
    file_name: null,
    file_size: null,
  };

  mockDb.run.mockResolvedValue({ lastID: 1 });
  mockDb.get.mockResolvedValue(expectedMessage);

  // Act
  const message = await MessageService.sendMessage(messageData);

  // Assert
  expect(mockDb.run).toHaveBeenCalledWith(expect.any(String), expect.any(Array)); // Insert query
  expect(message).toEqual(expectedMessage);
});

// Test case 2: Insert a message with a file_name
it('should successfully insert a message with file_name', async () => {
  // Arrange
  const messageData = {
    sender_id: 1,
    recipient_id: 2,
    content: 'File attached',
    message_type: 'text',
    file_name: 'document.pdf',
    file_path: '/uploads/document.pdf',
    file_size: 1024,
  };

  const expectedMessage = {
    id: 2,
    ...messageData,
    group_id: null,
  };

  mockDb.run.mockResolvedValue({ lastID: 2 });
  mockDb.get.mockResolvedValue(expectedMessage);

  // Act
  const message = await MessageService.sendMessage(messageData);

  // Assert
  expect(mockDb.run).toHaveBeenCalledWith(expect.any(String), expect.any(Array)); // Insert query
  expect(message).toEqual(expectedMessage);
});
