"""Package a Flutter web build for password-protected static hosting.

Requires Python and cryptography. Password is requested interactively.
Run: python package_build.py PATH_TO_BUILD_WEB
"""
import base64
import getpass
import hashlib
import json
import mimetypes
import os
from pathlib import Path
import re
import sys
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

def package(source, password):
    destination = Path(__file__).resolve().parent / 'protected'
    destination.mkdir(exist_ok=True)
    salt = os.urandom(16)
    iterations = 600_000
    cipher = AESGCM(hashlib.pbkdf2_hmac('sha256', password.encode(), salt, iterations, 32))
    manifest = {'salt': base64.b64encode(salt).decode(), 'iterations': iterations, 'files': {}}
    for path in sorted(source.rglob('*')):
        if not path.is_file() or path.name.startswith('.') or path.name == 'flutter_service_worker.js':
            continue
        relative = path.relative_to(source).as_posix()
        data = path.read_bytes()
        if relative == 'index.html':
            data = re.sub(r'<base href="[^"]*">', '<base href="/applikationen/tagespfad/app/">', data.decode()).encode()
        elif relative == 'flutter_bootstrap.js':
            script = re.sub(r'  serviceWorkerSettings: \{.*?\},\s*', '', data.decode(), flags=re.S)
            script = re.sub(r"    // Wait for the Flutter loader.*?\n    \}", '', script, flags=re.S)
            script = script.replace('_flutter.loader.load({', "_flutter.loader.load({\n  config: { canvasKitBaseUrl: new URL('canvaskit/', document.baseURI).href },")
            data = script.encode()
        iv = os.urandom(12)
        filename = hashlib.sha256(relative.encode()).hexdigest() + '.bin'
        (destination / filename).write_bytes(cipher.encrypt(iv, data, None))
        mime = {'.js': 'application/javascript', '.wasm': 'application/wasm', '.json': 'application/json', '.html': 'text/html; charset=utf-8'}.get(path.suffix) or mimetypes.guess_type(relative)[0] or 'application/octet-stream'
        manifest['files'][relative] = {'file': filename, 'iv': base64.b64encode(iv).decode(), 'type': mime}
    (destination / 'manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
    print(f"Packaged {len(manifest['files'])} encrypted files.")

if __name__ == '__main__':
    source = Path(sys.argv[1]).resolve()
    if not (source / 'index.html').is_file():
        raise SystemExit('Flutter build index.html missing')
    package(source, getpass.getpass('Passwort: '))
