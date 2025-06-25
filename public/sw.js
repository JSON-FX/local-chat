// Service Worker for LocalChat notifications
// This provides better system-level notification support

const CACHE_NAME = 'localchat-v1';

// Install event
self.addEventListener('install', (event) => {
  console.log('LocalChat Service Worker installed');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('LocalChat Service Worker activated');
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
        client.url.includes('/chat') || client.url.includes('localhost:3000')
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
    const { title, body, icon, data } = event.data.payload;
    
    self.registration.showNotification(title, {
      body,
      icon: icon || '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'localchat-message',
      requireInteraction: false,
      silent: false,
      data: data || {},
      actions: [
        {
          action: 'view',
          title: 'Open Chat'
        }
      ]
    });
  }
}); 