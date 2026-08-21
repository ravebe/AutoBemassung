// types.ts — gemeinsame Typen für AutoBemassung

export interface TcModel {
  id: string;
  name?: string;
  fileName?: string;
  state?: string;
}

export interface Vec3 { x: number; y: number; z: number; }

export interface ObjectBoundingBox {
  modelId?: string;
  objectRuntimeId?: number;
  min: Vec3;
  max: Vec3;
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

export function nsKey(key: string, projectId: string | null): string {
  return projectId ? `${key}:${projectId}` : key;
}
