// useApi.ts — Verbindung zur Trimble Connect Workspace API (gleiches Muster wie bauablaufsimulation-beta)
import { useEffect, useState } from "react";
import type { TcModel, ObjectBoundingBox, MeasurementMarkup } from "../types";

export interface TcSelectionEvent {
  data?: { modelId?: string; objectRuntimeIds?: number[] }[];
}

export interface ApiInstance {
  viewer: {
    getModels: (state?: "loaded" | "unloaded") => Promise<TcModel[]>;
    getObjectBoundingBoxes: (modelId: string, objectRuntimeIds: number[]) => Promise<ObjectBoundingBox[]>;
    getObjectProperties: (modelId: string, ids: number[]) => Promise<unknown[]>;
    setSelection: (ids: number[]) => Promise<void>;
    getCamera: () => Promise<{ position?: { x: number; y: number; z: number } }>;
  };
  markup: {
    addMeasurementMarkups: (measurements: MeasurementMarkup[]) => Promise<MeasurementMarkup[]>;
    removeMarkups: (ids: number[] | undefined) => Promise<void>;
  };
  extension: {
    requestPermission: (type: string) => Promise<string>;
  };
  project: { getProject: () => Promise<{ id: string; name: string }>; };
}

interface UseApiReturn {
  api: ApiInstance | null;
  ready: boolean;
  fehler: string | null;
  aktivesModellId: string | null;
  projectId: string | null;
  // aktuell ausgewählte Objekte: {modelId}:::{objectRuntimeId}
  selektion: { modelId: string; objectRuntimeId: number }[];
}

export function useApi(): UseApiReturn {
  const [api, setApi] = useState<ApiInstance | null>(null);
  const [ready, setReady] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [aktivesModellId, setAktivesModellId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [selektion, setSelektion] = useState<{ modelId: string; objectRuntimeId: number }[]>([]);

  useEffect(() => {
    let apiInst: ApiInstance | null = null;

    async function init() {
      try {
        let wapi = (window as any).TrimbleConnectWorkspace;
        if (!wapi) {
          await new Promise(r => setTimeout(r, 1500));
          wapi = (window as any).TrimbleConnectWorkspace;
        }
        if (!wapi) {
          setFehler("TC Workspace API nicht gefunden");
          return;
        }

        // Events (u.a. Selektion) kommen über den onEvent-Callback von connect(),
        // nicht über ein .addListener() auf der API-Oberfläche.
        const onEvent = (event: string, data: unknown) => {
          if (event !== "viewer.onSelectionChanged") return;
          const items: { modelId: string; objectRuntimeId: number }[] = [];
          const entries = (data as TcSelectionEvent)?.data;
          if (Array.isArray(entries)) {
            for (const entry of entries) {
              const mid = entry?.modelId;
              if (!mid) continue;
              setAktivesModellId(mid);
              for (const rId of entry?.objectRuntimeIds ?? []) items.push({ modelId: mid, objectRuntimeId: rId });
            }
          }
          setSelektion(items);
        };

        apiInst = (await wapi.connect(window.parent, onEvent)) as ApiInstance;
        setApi(apiInst);

        const projPromise = apiInst.project.getProject()
          .then(proj => { if (proj?.id) setProjectId(proj.id); return proj; })
          .catch(() => null);
        await Promise.race([projPromise, new Promise(r => setTimeout(r, 2500))]);

        setReady(true);
        setFehler(null);

        (async () => {
          for (let i = 0; i < 8; i++) {
            try {
              const geladen = await apiInst!.viewer.getModels("loaded");
              if (geladen.length > 0) { setAktivesModellId(geladen[0].id); return; }
            } catch { /* ignore */ }
            await new Promise(r => setTimeout(r, i === 0 ? 0 : 100));
          }
        })();
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[useApi] Init Fehler:", e);
        setFehler(`API Init Fehler: ${msg}`);
      }
    }

    init();
  }, []);

  return { api, ready, fehler, aktivesModellId, projectId, selektion };
}
