'use strict';
const base = '/applikationen/tagespfad/';
if (location.pathname === base.slice(0, -1)) location.replace(base + location.search + location.hash);
let unlockedKey = null;
const status = document.getElementById('status');
const submit = document.getElementById('submit');
const decode = value => Uint8Array.from(atob(value), char => char.charCodeAt(0));
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', event => {
    if (event.data === 'tagespfad-key' && event.ports[0]) event.ports[0].postMessage(unlockedKey);
  });
}
document.getElementById('form').addEventListener('submit', async event => {
  event.preventDefault();
  submit.disabled = true;
  status.textContent = 'Tagespfad wird geöffnet …';
  try {
    if (!window.isSecureContext || !navigator.serviceWorker || !crypto.subtle) {
      throw new Error('Bitte öffne diese Seite über HTTPS in einem aktuellen Browser.');
    }
    const response = await fetch(base + 'protected/manifest.json', { cache: 'no-cache' });
    if (!response.ok) throw new Error('Die App-Dateien sind gerade nicht erreichbar. Bitte versuche es erneut.');
    const manifest = await response.json();
    const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(document.getElementById('password').value), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: decode(manifest.salt), iterations: manifest.iterations, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    const check = await fetch(base + 'protected/' + manifest.files['index.html'].file);
    if (!check.ok) throw new Error('Die App-Dateien konnten nicht geladen werden.');
    const encrypted = await check.arrayBuffer();
    try {
      await crypto.subtle.decrypt({ name: 'AES-GCM', iv: decode(manifest.files['index.html'].iv) }, key, encrypted);
    } catch {
      throw new Error('Das Passwort ist nicht richtig. Bitte versuche es erneut.');
    }
    await navigator.serviceWorker.register(base + 'worker.js', { scope: base });
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller || !navigator.serviceWorker.controller.scriptURL.endsWith(base + 'worker.js')) {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Bitte lade die Seite neu und versuche es erneut.')), 15000);
        const changed = () => {
          if (navigator.serviceWorker.controller?.scriptURL.endsWith(base + 'worker.js')) {
            clearTimeout(timer); navigator.serviceWorker.removeEventListener('controllerchange', changed); resolve();
          }
        };
        navigator.serviceWorker.addEventListener('controllerchange', changed);
        changed();
      });
    }
    unlockedKey = key;
    document.getElementById('password').value = '';
    document.getElementById('app').src = base + 'app/index.html';
    document.getElementById('app').hidden = false;
    document.getElementById('login').hidden = true;
  } catch (error) {
    status.textContent = error.message || 'Tagespfad konnte nicht geöffnet werden.';
  } finally {
    submit.disabled = false;
  }
});
