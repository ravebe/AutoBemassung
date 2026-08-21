# AutoBemassung

Trimble Connect Extension für automatische Bemaßung von Bauteilen.

## Aktueller Stand (Grundgerüst)

Verbindet sich mit dem Trimble Connect 3D Viewer, liest die aktuelle Objektauswahl,
und zeigt bei genau einem ausgewählten Objekt dessen Bounding-Box-Maße (Breite/Tiefe/Höhe) an.

**Wichtige Einschränkung** (siehe Recherche): Die Trimble Connect Workspace API bietet kein
Face-Picking (welche Fläche wurde angeklickt) und keine Geometrie-Abfrage (Kanten/Ecken einer
Fläche) — nur `getObjectBoundingBoxes` für die gesamte Bounding Box eines Objekts. Das
ursprünglich gewünschte "Fläche anklicken → alle Kanten automatisch vermaßen" ist damit nicht
direkt umsetzbar. Dieses Grundgerüst implementiert stattdessen die Bounding-Box-Variante als
Startpunkt.

## Setup (lokal)

```bash
npm install
npm run dev
```

`npm run dev` startet Vite lokal — die Extension lässt sich aber nur sinnvoll testen, wenn sie
tatsächlich in Trimble Connect als Extension eingebunden ist (siehe unten), da sie auf
`window.parent` postMessage mit dem echten Trimble-Connect-Fenster angewiesen ist.

## Was automatisch erledigt ist

- Komplettes Vite+React+TypeScript-Projekt, buildfertig (`npm run build`)
- Anbindung an die Trimble Connect Workspace API (`src/hooks/useApi.ts`)
- Grundlegendes UI-Panel, das die Objektauswahl verfolgt und Bounding-Box-Maße anzeigt
- `public/manifest.json` als Vorlage für die Extension-Registrierung
- `vercel.json` für Deployment auf Vercel (SPA-Rewrite)

## Was du manuell erledigen musst — Schritt für Schritt

Kein Trimble-Developer-Portal nötig: Für eine private Extension im eigenen Projekt reicht es,
die Manifest-URL direkt in den Projekteinstellungen von Trimble Connect einzutragen (Punkt 4).
Das Developer Portal bräuchte man nur, um die Extension öffentlich im Trimble-Marketplace zu
veröffentlichen — nicht für den eigenen Gebrauch.

### 1. GitHub-Repo anlegen
1. Auf [github.com/new](https://github.com/new) ein neues Repo erstellen, z.B. Name `AutoBemassung`
   (privat oder öffentlich, egal). **Kein** README/„.gitignore" beim Anlegen mitanhaken — beides
   existiert hier schon lokal.
2. Im Terminal in diesem Ordner:
   ```bash
   git remote add origin https://github.com/<dein-username>/AutoBemassung.git
   git branch -M main
   git push -u origin main
   ```
   (lokales Repo + erster Commit sind schon vorhanden, das macht nur den Remote-Link + Push)

### 2. Vercel-Projekt anlegen und deployen
1. Auf [vercel.com](https://vercel.com) mit dem GitHub-Account einloggen.
2. „Add New…" → „Project" → das gerade gepushte `AutoBemassung`-Repo auswählen → „Import".
3. Vercel erkennt Vite automatisch (Build Command `npm run build`, Output-Ordner `dist`) —
   nichts ändern, direkt „Deploy" klicken.
4. Nach ca. 30 Sekunden bekommst du eine URL, z.B. `https://auto-bemassung.vercel.app`
   (der genaue Name hängt vom Repo-Namen ab, ggf. mit Zufalls-Suffix).

### 3. Manifest mit der echten URL aktualisieren
1. In `public/manifest.json` alle drei Platzhalter-URLs
   (`https://autobemassung.vercel.app`) durch deine echte Vercel-URL aus Schritt 2 ersetzen.
2. Commit + Push:
   ```bash
   git add public/manifest.json
   git commit -m "manifest: echte Vercel-URL eintragen"
   git push
   ```
   Vercel deployed automatisch neu (dauert ~30 Sek.).

### 4. Extension in Trimble Connect hinzufügen
1. Im Browser das gewünschte Trimble-Connect-Projekt öffnen.
2. Zahnrad-/Einstellungen-Icon → „Project Settings" → Reiter „Extensions".
3. „Add Extension" (oder „+") klicken.
4. Als URL die Manifest-Datei eintragen: `https://<deine-vercel-url>/manifest.json`.
5. Speichern.

### 5. Testen
1. In den 3D-Viewer des Projekts wechseln.
2. „AutoBemassung" sollte jetzt als neues Icon/Tab in der linken Seitenleiste erscheinen (wie
   bei der 4D-Simulation-Extension) — anklicken öffnet das Panel.
3. Ein Bauteil im Modell anklicken → im Panel sollten Breite/Tiefe/Höhe erscheinen.

### Danach: mit mir weitercoden
Sobald das läuft, einfach im Chat weitermachen — z.B. "die Bemaßung soll auch als Linie im
Viewer sichtbar sein" oder neue Anforderungen. Ich habe dann direkten Zugriff auf den Code in
diesem Ordner.

## Nächste Schritte für das Feature selbst

- Klären, ob/wie sich berechnete Maße als sichtbare Linien im 3D-Viewer darstellen lassen
  (aktuell nur Text im Seitenpanel) — ggf. weitere Recherche zur Workspace API nötig
  (`activateTool`, `addIcon` o.ä.), oder alternative Darstellung (2D-Overlay im Panel).
- Bounding-Box-Achsen sind Modell-Koordinaten, nicht objekt-lokal — bei gedrehten Objekten
  ungenau. Für exakte objekt-lokale Maße gibt es aktuell keine passende API.
