# Tagespfad

Eigenständiger Bereich für `/applikationen/tagespfad/`. Nach Eingabe des
vereinbarten Passworts startet die Flutter-App bildschirmfüllend in dieser Seite.
Bestehende Seiten und globale Website-Einstellungen werden nicht geändert.

## Betrieb

Den gesamten Ordner mit der bestehenden statischen Website veröffentlichen.
HTTPS ist erforderlich; für lokale Tests funktioniert auch `localhost`.
Es werden JavaScript, Web Crypto und Service Worker benötigt.

Die App-Dateien unter `protected/` sind mit AES-256-GCM verschlüsselt.
Der Schlüssel wird mit PBKDF2-SHA-256 und 600.000 Iterationen abgeleitet.
Das Passwort und ein unverschlüsselter Build werden nicht ausgeliefert.
Der eigene Service Worker gilt ausschließlich für diesen Unterordner und
entschlüsselt App-Dateien bei Bedarf. Der Flutter-Service-Worker wird beim
Paketieren entfernt, damit er keine entschlüsselten App-Dateien offline speichert.
CanvasKit und die vorhandenen Ersatzschriftarten werden lokal geladen.

Der Schlüssel bleibt nur im Speicher einer geöffneten, entsperrten Tagespfad-Seite.
Neuladen fordert erneut das Passwort an. Weitere App-Aufrufe im selben
Browserprofil können einen noch geöffneten, entsperrten Tab verwenden.
Die App kann ihre eigenen Nutzerdaten weiterhin im Browser speichern;
die Zugangssperre verschlüsselt diese Daten nicht zusätzlich.

Das ist ein verschlüsselter Zugang für statisches Hosting, keine serverseitige
Benutzerverwaltung. Das vereinbarte kurze Passwort lässt sich durch Raten
ermitteln; für vertrauliche Inhalte ist ein stärkeres Passwort bzw. ein
serverseitiger Zugangsschutz erforderlich.

## Build aktualisieren

Der bei der Einrichtung vorgefundene Build liegt unter:

`C:\Users\Adrian\Documents\17 Lebenskompass\Projekt_Tagespfad\build\web`

Mit Python und dem Paket `cryptography`:

```powershell
python package_build.py "C:\Users\Adrian\Documents\17 Lebenskompass\Projekt_Tagespfad\build\web"
```

Das Skript fragt das Passwort verdeckt ab und erzeugt die verschlüsselten
Dateien samt Manifest. Anschließend den vollständigen Ordner veröffentlichen.
Den unverschlüsselten Flutter-Build nicht zusätzlich in die Website kopieren.
