import { getDatabase } from './database';
import { SocketService } from './socket';

// In-memory queue for pending messages (could be moved to Redis in production)
const pendingMessages = new Map<number, Array<{
  event: string;
  data: any;
  timestamp: number;
}>>();

export class MessageQueueService {
  
  // Add message to queue for offline user
  static async queueMessage(userId: number, event: string, data: any): Promise<void> {
    if (!pendingMessages.has(userId)) {
      pendingMessages.set(userId, []);
    }
    
    pendingMessages.get(userId)!.push({
      event,
      data,
      timestamp: Date.now()
    });

    // Limit queue size per user (prevent memory bloat)
    const userQueue = pendingMessages.get(userId)!;
    if (userQueue.length > 100) {
      userQueue.splice(0, userQueue.length - 100);
    }

    console.log(`📥 Queued ${event} for offline user ${userId}`);
  }

  // Send message to user (online) or queue it (offline)
  static async sendOrQueue(userId: number, event: string, data: any): Promise<boolean> {
    // Try to send to online user first
    if (SocketService.sendToUser(userId, event, data)) {
      return true; // Message sent successfully
    }

    // User is offline, queue the message
    await this.queueMessage(userId, event, data);
    return false; // Message queued for later delivery
  }

  // Deliver all pending messages to user when they come online
  static async deliverPendingMessages(userId: number): Promise<void> {
    const userQueue = pendingMessages.get(userId);
    if (!userQueue || userQueue.length === 0) {
      return;
    }

    console.log(`📤 Delivering ${userQueue.length} pending messages to user ${userId}`);

    // Send all pending messages
    for (const message of userQueue) {
      SocketService.sendToUser(userId, message.event, {
        ...message.data,
        queued: true,
        queuedAt: message.timestamp
      });
    }

    // Clear the queue
    pendingMessages.delete(userId);
  }

  // Get pending message count for user
  static getPendingCount(userId: number): number {
    const userQueue = pendingMessages.get(userId);
    return userQueue ? userQueue.length : 0;
  }

  // Clear old messages from queue (cleanup)
  static cleanupOldMessages(maxAgeMs: number = 24 * 60 * 60 * 1000): void {
    const cutoff = Date.now() - maxAgeMs;
    
    for (const [userId, messages] of pendingMessages.entries()) {
      const filteredMessages = messages.filter(msg => msg.timestamp > cutoff);
      
      if (filteredMessages.length === 0) {
        pendingMessages.delete(userId);
      } else if (filteredMessages.length !== messages.length) {
        pendingMessages.set(userId, filteredMessages);
      }
    }
  }

  // Notify about new message (with offline queueing)
  static async notifyNewMessage(recipientId: number, message: any): Promise<void> {
    await this.sendOrQueue(recipientId, 'new_message', message);
  }

  // Notify about typing indicator (online only - no need to queue)
  static async notifyTyping(recipientId: number, data: any): Promise<void> {
    SocketService.sendToUser(recipientId, 'user_typing', data);
  }

  // Get statistics
  static getQueueStats(): { totalUsers: number; totalMessages: number; userQueues: Record<number, number> } {
    const userQueues: Record<number, number> = {};
    let totalMessages = 0;

    for (const [userId, messages] of pendingMessages.entries()) {
      userQueues[userId] = messages.length;
      totalMessages += messages.length;
    }

    return {
      totalUsers: pendingMessages.size,
      totalMessages,
      userQueues
    };
  }
}

// Periodic cleanup of old messages (run every hour)
setInterval(() => {
  MessageQueueService.cleanupOldMessages();
}, 60 * 60 * 1000); 