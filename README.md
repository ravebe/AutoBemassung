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

## Was du manuell erledigen musst

1. **Bei Trimble registrieren**: Im [Trimble Developer Portal](https://developer.trimble.com/)
   ein Konto/App anlegen, die Extension registrieren (Manifest-URL hinterlegen, benötigte APIs
   freischalten — hier mindestens „Workspace API").
2. **Deployen**: Ein Vercel-Projekt für diesen Ordner anlegen (`vercel` CLI oder GitHub-Verknüpfung),
   deployen. Die echte Vercel-URL danach in `public/manifest.json` eintragen (`url`, `icon`,
   `infoUrl` aktuell nur Platzhalter `https://autobemassung.vercel.app`).
3. **In Trimble Connect einbinden**: Im gewünschten Projekt unter „Project Settings → Extensions"
   die deployte Manifest-URL hinzufügen.
4. **Git/GitHub** (optional): `git init`, Remote-Repo anlegen und pushen, falls gewünscht.

## Nächste Schritte für das Feature selbst

- Klären, ob/wie sich berechnete Maße als sichtbare Linien im 3D-Viewer darstellen lassen
  (aktuell nur Text im Seitenpanel) — ggf. weitere Recherche zur Workspace API nötig
  (`activateTool`, `addIcon` o.ä.), oder alternative Darstellung (2D-Overlay im Panel).
- Bounding-Box-Achsen sind Modell-Koordinaten, nicht objekt-lokal — bei gedrehten Objekten
  ungenau. Für exakte objekt-lokale Maße gibt es aktuell keine passende API.
