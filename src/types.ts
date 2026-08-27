// types.ts — gemeinsame Typen für AutoBemassung

export interface TcModel {
  id: string;
  name?: string;
  fileName?: string;
  state?: string;
}

export interface Vec3 { x: number; y: number; z: number; }

export interface ObjectBoundingBox {
  id: number;
  boundingBox: { min: Vec3; max: Vec3 };
}

// Ergebnis einer Bounding-Box-Bemassung: Breite/Höhe/Tiefe des ausgewählten Objekts.
// Achtung: die Achsen sind die des Modell-Koordinatensystems, nicht zwingend die
// "natürlichen" Kanten des Objekts (bei gedrehten Objekten ungenau) — siehe README.
export interface BemassungsErgebnis {
  modelId: string;
  objectRuntimeId: number;
  breite: number; // X
  hoehe: number;  // Z (Trimble Connect: Z ist meist "oben")
  tiefe: number;  // Y
}

// Markup-Datentypen der Trimble Connect Workspace API (Positionen in Millimetern).
export interface MarkupPick {
  positionX: number;
  positionY: number;
  positionZ: number;
  modelId?: string;
  objectId?: number;
  type?: "point" | "line" | "lineSegment" | "plane";
}

export interface MeasurementMarkup {
  id?: number;
  start: MarkupPick;
  end: MarkupPick;
  mainLineStart: MarkupPick;
  mainLineEnd: MarkupPick;
}

export function nsKey(key: string, projectId: string | null): string {
  return projectId ? `${key}:${projectId}` : key;
}
