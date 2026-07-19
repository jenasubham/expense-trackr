// Expense Tracker PWA Service Worker

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  self.clients.claim();
});

// A simple fetch event handler to satisfy Chrome's PWA installability requirements
self.addEventListener('fetch', (event) => {
  // Pass through all requests directly to the network
  event.respondWith(fetch(event.request));
});
