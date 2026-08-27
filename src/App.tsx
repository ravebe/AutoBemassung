// App.tsx — AutoBemassung: Bounding-Box-Bemassung + automatische Maßlinien für ein ausgewähltes Objekt.
//
// Einschränkung (siehe README): Die Workspace API bietet keine Face-Geometrie-Abfrage.
// Für die automatische Maßlinien-Fläche wird deshalb angenommen, dass das ausgewählte Objekt
// flach ist (eine Bounding-Box-Achse deutlich kürzer als die anderen zwei, z.B. eine Platte/
// Scheibe/Wand) — die sichtbare (der Kamera zugewandte) Seite entlang dieser Achse wird
// vermaßt. Bei kompakten/gedrehten Objekten ist das Ergebnis entsprechend ungenau.
import { useEffect, useState } from "react";
import { useApi } from "./hooks/useApi";
import type { ApiInstance } from "./hooks/useApi";
import type { BemassungsErgebnis, MeasurementMarkup, Vec3 } from "./types";
import "./App.css";

const M_ZU_MM = 1000;

function bildePick(p: Vec3, modelId: string, objectId: number) {
  return { positionX: p.x * M_ZU_MM, positionY: p.y * M_ZU_MM, positionZ: p.z * M_ZU_MM, modelId, objectId, type: "point" as const };
}

// Bestimmt die kamerazugewandte Fläche der Bounding Box entlang ihrer dünnsten Achse
// und liefert deren Eckpunkte + die zwei anliegenden Kanten (Breite/Höhe der Fläche).
function ermittleFlaechenKanten(min: Vec3, max: Vec3, kameraPos: Vec3 | undefined) {
  const achsen: (keyof Vec3)[] = ["x", "y", "z"];
  const groesse = achsen.map(a => max[a] - min[a]);
  let duenneAchseIdx = 0;
  for (let i = 1; i < 3; i++) if (groesse[i] < groesse[duenneAchseIdx]) duenneAchseIdx = i;
  const [uIdx, vIdx] = achsen.map((_, i) => i).filter(i => i !== duenneAchseIdx);
  const duenneAchse = achsen[duenneAchseIdx];
  const uAchse = achsen[uIdx];
  const vAchse = achsen[vIdx];

  const mitte = (min[duenneAchse] + max[duenneAchse]) / 2;
  const kameraSeite = kameraPos ? kameraPos[duenneAchse] - mitte : 1;
  const fixWert = kameraSeite >= 0 ? max[duenneAchse] : min[duenneAchse];

  const punkt = (uWert: number, vWert: number): Vec3 => {
    const p = { x: 0, y: 0, z: 0 } as Vec3;
    p[duenneAchse] = fixWert;
    p[uAchse] = uWert;
    p[vAchse] = vWert;
    return p;
  };

  const p00 = punkt(min[uAchse], min[vAchse]);
  const p10 = punkt(max[uAchse], min[vAchse]);
  const p01 = punkt(min[uAchse], max[vAchse]);

  return { breiteKante: [p00, p10] as const, hoeheKante: [p00, p01] as const };
}

async function setzeMassLinien(api: ApiInstance, modelId: string, objectRuntimeId: number, min: Vec3, max: Vec3): Promise<number[]> {
  const kamera = await api.viewer.getCamera().catch(() => null);
  const { breiteKante, hoeheKante } = ermittleFlaechenKanten(min, max, kamera?.position as Vec3 | undefined);

  const markups: MeasurementMarkup[] = [breiteKante, hoeheKante].map(([a, b]) => ({
    start: bildePick(a, modelId, objectRuntimeId),
    end: bildePick(b, modelId, objectRuntimeId),
    mainLineStart: bildePick(a, modelId, objectRuntimeId),
    mainLineEnd: bildePick(b, modelId, objectRuntimeId),
  }));

  const gesetzt = await api.markup.addMeasurementMarkups(markups);
  return gesetzt.map(m => m.id).filter((id): id is number => id != null);
}

export default function App() {
  const { api, ready, fehler, selektion } = useApi();
  const [ergebnis, setErgebnis] = useState<BemassungsErgebnis | null>(null);
  const [box, setBox] = useState<{ min: Vec3; max: Vec3 } | null>(null);
  const [ladeFehler, setLadeFehler] = useState<string | null>(null);
  const [massLinienIds, setMassLinienIds] = useState<number[] | null>(null);
  const [massLinienFehler, setMassLinienFehler] = useState<string | null>(null);
  const [setzeLaeuft, setSetzeLaeuft] = useState(false);

  useEffect(() => {
    setErgebnis(null);
    setBox(null);
    setLadeFehler(null);
    setMassLinienIds(null);
    setMassLinienFehler(null);
    if (!api || selektion.length !== 1) return;
    const { modelId, objectRuntimeId } = selektion[0];
    (async () => {
      try {
        const boxes = await api.viewer.getObjectBoundingBoxes(modelId, [objectRuntimeId]);
        const bb = boxes?.[0]?.boundingBox;
        if (!bb) { setLadeFehler("Keine Bounding Box für dieses Objekt erhalten"); return; }
        setBox(bb);
        setErgebnis({
          modelId, objectRuntimeId,
          breite: Math.abs(bb.max.x - bb.min.x),
          tiefe: Math.abs(bb.max.y - bb.min.y),
          hoehe: Math.abs(bb.max.z - bb.min.z),
        });
      } catch (e) {
        setLadeFehler(e instanceof Error ? e.message : String(e));
      }
    })();
  }, [api, selektion]);

  async function onMassLinienSetzen() {
    if (!api || !ergebnis || !box) return;
    setSetzeLaeuft(true);
    setMassLinienFehler(null);
    try {
      const ids = await setzeMassLinien(api, ergebnis.modelId, ergebnis.objectRuntimeId, box.min, box.max);
      setMassLinienIds(ids);
    } catch (e) {
      setMassLinienFehler(e instanceof Error ? e.message : String(e));
    } finally {
      setSetzeLaeuft(false);
    }
  }

  async function onMassLinienEntfernen() {
    if (!api || !massLinienIds) return;
    try {
      await api.markup.removeMarkups(massLinienIds);
    } finally {
      setMassLinienIds(null);
    }
  }

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
              {ergebnis && (
                <div className="ab-aktionen">
                  {massLinienFehler && <div className="ab-alert ab-alert-err">{massLinienFehler}</div>}
                  {!massLinienIds && (
                    <button onClick={onMassLinienSetzen} disabled={setzeLaeuft}>
                      {setzeLaeuft ? "Setze Maßlinien…" : "Maßlinien setzen"}
                    </button>
                  )}
                  {massLinienIds && (
                    <button onClick={onMassLinienEntfernen}>Maßlinien entfernen</button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
