// Service Worker for Push Notifications
self.addEventListener('push', function(event) {
  const options = {
    body: event.data ? event.data.text() : 'You have a new notification!',
    icon: '/lovable-uploads/settld-logo.png',
    badge: '/lovable-uploads/settld-logo.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View Details',
        icon: '/lovable-uploads/settld-logo.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/lovable-uploads/settld-logo.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Settld', options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  if (event.action === 'explore') {
    // Open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  } else if (event.action === 'close') {
    // Close notification
    event.notification.close();
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Install event
self.addEventListener('install', function(event) {
  console.log('Service Worker installing');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', function(event) {
  console.log('Service Worker activating');
  event.waitUntil(clients.claim());
});