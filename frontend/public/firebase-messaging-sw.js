// AutoPatch Web Push & Firebase Cloud Messaging Service Worker
// Handles background verification alerts, patch results, and review requests

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: "AutoPatch Alert", body: event.data.text() };
    }
  }

  const title = data.title || "AutoPatch Verification Alert";
  const options = {
    body: data.body || "A new autonomous patch verification event occurred.",
    icon: data.icon || "/icons/icon-192x192.png",
    badge: "/icons/badge-72x72.png",
    data: data.data || {},
    actions: [
      { action: "review", title: "Review Patch" },
      { action: "dismiss", title: "Dismiss" },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") {
    return;
  }

  const actionUrl = event.notification.data?.action_url || "/dashboard";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(actionUrl) && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(actionUrl);
      }
    })
  );
});
