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

// ---- Push-Benachrichtigungen ----
// Payload kommt von lib/push/send.ts: { title, body, url, tag }.
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data ? event.data.text() : '' }
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'ClassHaven', {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.tag,
      data: { url: data.url || '/' },
    })
  )
})

// Tippen auf die Benachrichtigung: offenes App-Fenster nach vorne holen und
// dorthin navigieren, sonst ein neues öffnen.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin).href
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const w = windows.find((c) => c.url.startsWith(self.location.origin))
      if (!w) return self.clients.openWindow(url)
      // navigate() geht nur bei Fenstern, die dieser Worker steuert;
      // sonst lieber ein neues Fenster als gar keine Reaktion.
      return w.focus().then(() => w.navigate(url)).catch(() => self.clients.openWindow(url))
    })
  )
})
