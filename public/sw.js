// MediBridge Service Worker for Push Notifications (Like Facebook & Telegram)
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle incoming push notification
self.addEventListener("push", (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: "MediBridge Alert", body: event.data.text() };
    }
  }

  const title = data.title || "🔔 MediBridge Notification";
  const options = {
    body: data.body || "New medical admission update received.",
    icon: data.icon || "/icons/icon-192x192.png",
    badge: data.badge || "/icons/icon-192x192.png",
    vibrate: [200, 100, 200],
    tag: data.tag || `mb_push_${Date.now()}`,
    renotify: true,
    requireInteraction: data.priority === "CRITICAL" || data.priority === "HIGH",
    data: {
      url: data.url || data.actionUrl || "/",
      id: data.id,
      timestamp: Date.now()
    },
    actions: [
      { action: "open", title: "Open App 🚀" },
      { action: "dismiss", title: "Dismiss" }
    ]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle user clicking on the notification on phone/desktop
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") {
    return;
  }

  const targetUrl = (event.notification.data && event.notification.data.url) ? event.notification.data.url : "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          if (targetUrl && client.url) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
