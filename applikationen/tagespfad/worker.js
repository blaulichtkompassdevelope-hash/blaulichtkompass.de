'use strict';
const base = new URL('./', self.location).pathname;
const decode = value => Uint8Array.from(atob(value), char => char.charCodeAt(0));
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
async function sessionKey() {
  const windows = await self.clients.matchAll({ type: 'window' });
  const candidates = windows.filter(client => {
    const path = new URL(client.url).pathname;
    return path === base || path === base + 'index.html';
  });
  const keys = await Promise.all(candidates.map(client => new Promise(resolve => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => { channel.port1.close(); resolve(null); }, 2000);
    channel.port1.onmessage = event => {
      clearTimeout(timer); channel.port1.close(); resolve(event.data);
    };
    client.postMessage('tagespfad-key', [channel.port2]);
  })));
  return keys.find(Boolean);
}
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(base + 'app/')) return;
  event.respondWith((async () => {
    const key = await sessionKey();
    if (!key) {
      if (event.request.mode === 'navigate') return Response.redirect(new URL(base, self.location.origin).href);
      return new Response('Passwort erforderlich', { status: 401 });
    }
    try {
      const response = await fetch(base + 'protected/manifest.json', { cache: 'no-cache' });
      if (!response.ok) throw new Error('manifest');
      const manifest = await response.json();
      const path = decodeURIComponent(url.pathname.slice((base + 'app/').length)) || 'index.html';
      const entry = Object.hasOwn(manifest.files, path) ? manifest.files[path] : null;
      if (!entry) return new Response('Nicht gefunden', { status: 404 });
      const encrypted = await fetch(base + 'protected/' + entry.file);
      if (!encrypted.ok) throw new Error('asset');
      const data = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: decode(entry.iv) }, key, await encrypted.arrayBuffer());
      return new Response(data, { headers: { 'Content-Type': entry.type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
    } catch {
      return new Response('Tagespfad konnte nicht geladen werden. Bitte die Seite neu öffnen.', { status: 503 });
    }
  })());
});
