// Service Worker for LGU-Chat notifications
// This provides better system-level notification support

const CACHE_NAME = 'lgu-chat-v1';

// Install event
self.addEventListener('install', (event) => {
  console.log('LGU-Chat Service Worker installed');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('LGU-Chat Service Worker activated');
  event.waitUntil(self.clients.claim());
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event.notification.data);
  
  event.notification.close();
  
  // Focus or open the app window
  event.waitUntil(
    self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clients) => {
      // If app is already open, focus it
      const appClient = clients.find(client => 
        client.url.includes('/chat') || client.url.includes('/')
      );
      
      if (appClient) {
        return appClient.focus();
      }
      
      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow('/chat');
      }
    })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event.notification.data);
});

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    
    // Set default options for better system integration
    const notificationOptions = {
      ...options,
      icon: options.icon || '/lgu-seal.png',
      badge: '/lgu-seal.png',
      tag: 'lgu-chat-message',
      requireInteraction: false,
      silent: false,
      data: options.data || {},
      actions: [
        {
          action: 'view',
          title: 'Open Chat'
        }
      ]
    };
    
    self.registration.showNotification(title, notificationOptions);
  }
});

// Handle notification action clicks
self.addEventListener('notificationclick', (event) => {
  const action = event.action;
  const notification = event.notification;
  
  if (action === 'view') {
    // Same behavior as clicking the notification
    event.notification.close();
    
    event.waitUntil(
      self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true
      }).then((clients) => {
        for (const client of clients) {
          if (client.url.includes('/chat') || client.url.includes('/')) {
            return client.focus();
          }
        }
        
        if (self.clients.openWindow) {
          return self.clients.openWindow('/chat');
        }
      })
    );
  }
  
  notification.close();
}); 