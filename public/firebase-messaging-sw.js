/* Kyvro: shows offer notifications when the website is closed.
   The Firebase config comes in the "?c=" part of this file's address (set by src/push.js). */
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

var cfg = {};
try { cfg = JSON.parse(new URL(self.location.href).searchParams.get('c') || '{}'); } catch (e) { cfg = {}; }

if (cfg && cfg.projectId) {
  firebase.initializeApp(cfg);
  var messaging = firebase.messaging();
  // The server sends "data-only" messages: title, body, link, icon
  messaging.onBackgroundMessage(function (payload) {
    var d = (payload && payload.data) || {};
    self.registration.showNotification(d.title || 'Kyvro', {
      body: d.body || '',
      icon: d.icon || '/kyvro-icon.png',
      badge: '/kyvro-icon.png',
      data: { link: d.link || '/' },
    });
  });
}

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var link = (event.notification.data && event.notification.data.link) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
      for (var i = 0; i < list.length; i++) {
        if ('focus' in list[i]) { list[i].navigate(link); return list[i].focus(); }
      }
      return self.clients.openWindow(link);
    })
  );
});
