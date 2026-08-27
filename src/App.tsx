// App.tsx — AutoBemassung: Grundgerüst mit Bounding-Box-Bemassung für ein ausgewähltes Objekt.
//
// TODO (nächste Schritte, siehe README):
// - Prüfen, ob sich die berechneten Maße auch als sichtbare Bemaßungslinien im 3D-Viewer
//   darstellen lassen (aktuell nur als Zahlen im Panel, da die Workspace API kein bestätigtes
//   "Linie/Markup in 3D zeichnen"-API hat — ggf. über addIcon/activateTool recherchieren).
// - Bounding-Box-Achsen sind Modell-Koordinaten, nicht objekt-lokal (bei gedrehten Objekten
//   ungenau) — für exaktere Maße bräuchte es eine objekt-lokale Bounding Box, die die
//   Workspace API aktuell nicht liefert.
import { useEffect, useState } from "react";
import { useApi } from "./hooks/useApi";
import type { BemassungsErgebnis } from "./types";
import "./App.css";

export default function App() {
  const { api, ready, fehler, selektion } = useApi();
  const [ergebnis, setErgebnis] = useState<BemassungsErgebnis | null>(null);
  const [ladeFehler, setLadeFehler] = useState<string | null>(null);

  useEffect(() => {
    setErgebnis(null);
    setLadeFehler(null);
    if (!api || selektion.length !== 1) return;
    const { modelId, objectRuntimeId } = selektion[0];
    (async () => {
      try {
        const boxes = await api.viewer.getObjectBoundingBoxes(modelId, [objectRuntimeId]);
        const box = boxes?.[0]?.boundingBox;
        if (!box) { setLadeFehler("Keine Bounding Box für dieses Objekt erhalten"); return; }
        setErgebnis({
          modelId, objectRuntimeId,
          breite: Math.abs(box.max.x - box.min.x),
          tiefe: Math.abs(box.max.y - box.min.y),
          hoehe: Math.abs(box.max.z - box.min.z),
        });
      } catch (e) {
        setLadeFehler(e instanceof Error ? e.message : String(e));
      }
    })();
  }, [api, selektion]);

  return (
    <div className="ab-app">
      <div className="ab-header">
        <span className="ab-logo">📐</span> AutoBemassung
      </div>

      {fehler && <div className="ab-alert ab-alert-err">{fehler}</div>}
      {!fehler && !ready && <div className="ab-alert ab-alert-info">Verbinde mit Trimble Connect…</div>}

      {ready && (
        <div className="ab-content">
          {selektion.length === 0 && (
            <div className="ab-empty">↑ Objekt im Viewer anklicken</div>
          )}
          {selektion.length > 1 && (
            <div className="ab-empty">{selektion.length} Objekte ausgewählt — bitte nur eines für die Bemaßung</div>
          )}
          {selektion.length === 1 && (
            <div className="ab-panel">
              {ladeFehler && <div className="ab-alert ab-alert-err">{ladeFehler}</div>}
              {!ladeFehler && !ergebnis && <div className="ab-alert ab-alert-info">Berechne Maße…</div>}
              {ergebnis && (
                <div className="ab-mass-liste">
                  <div className="ab-mass-zeile"><span>Breite (X)</span><b>{ergebnis.breite.toFixed(3)} m</b></div>
                  <div className="ab-mass-zeile"><span>Tiefe (Y)</span><b>{ergebnis.tiefe.toFixed(3)} m</b></div>
                  <div className="ab-mass-zeile"><span>Höhe (Z)</span><b>{ergebnis.hoehe.toFixed(3)} m</b></div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
