// Minimaler Service Worker.
// Zweck: erfüllt Chromes Installierbarkeits-Kriterien (Manifest + Service
// Worker mit fetch-Handler), damit Android den "App installieren"-Banner zeigt.
// Bewusst OHNE Caching: alle Requests laufen normal ans Netzwerk, damit die
// Live-App (Supabase) nie in einer veralteten Version hängen bleibt.

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', () => {
  // Absichtlich leer – kein respondWith(), Requests gehen direkt ans Netzwerk.
})
