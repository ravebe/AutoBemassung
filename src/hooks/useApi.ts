// useApi.ts — Verbindung zur Trimble Connect Workspace API (gleiches Muster wie bauablaufsimulation-beta)
import { useEffect, useRef, useState } from "react";
import type { TcModel, ObjectBoundingBox } from "../types";

export interface TcSelectionEvent {
  data?: { modelId?: string; objectRuntimeIds?: number[] }[];
}

export interface ApiInstance {
  viewer: {
    getModels: () => Promise<TcModel[]>;
    getLoadedModel: () => Promise<TcModel[]>;
    getObjectBoundingBoxes: (modelId: string, objectRuntimeIds: number[]) => Promise<ObjectBoundingBox[]>;
    getObjectProperties: (modelId: string, ids: number[]) => Promise<unknown[]>;
    setSelection: (ids: number[]) => Promise<void>;
    onSelectionChanged: {
      addListener: (cb: (event: TcSelectionEvent) => void) => void;
      removeListener: (cb: (event: TcSelectionEvent) => void) => void;
    };
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
  const selCbRef = useRef<((e: TcSelectionEvent) => void) | null>(null);

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

        apiInst = (await wapi.connect(window.parent, () => {})) as ApiInstance;
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
              const geladen = await apiInst!.viewer.getLoadedModel() as any;
              const arr = Array.isArray(geladen) ? geladen : geladen ? [geladen] : [];
              if (arr.length > 0) { setAktivesModellId(arr[0].id || arr[0].modelId); return; }
            } catch { /* ignore */ }
            await new Promise(r => setTimeout(r, i === 0 ? 0 : 100));
          }
        })();

        try {
          const cb = (event: TcSelectionEvent) => {
            const items: { modelId: string; objectRuntimeId: number }[] = [];
            const data = event?.data;
            if (Array.isArray(data)) {
              for (const entry of data) {
                const mid = entry?.modelId;
                if (!mid) continue;
                setAktivesModellId(mid);
                for (const rId of entry?.objectRuntimeIds ?? []) items.push({ modelId: mid, objectRuntimeId: rId });
              }
            }
            setSelektion(items);
          };
          selCbRef.current = cb;
          apiInst.viewer.onSelectionChanged.addListener(cb);
        } catch (e) { console.error("[useApi] onSelectionChanged-Listener fehlgeschlagen:", e); }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[useApi] Init Fehler:", e);
        setFehler(`API Init Fehler: ${msg}`);
      }
    }

    init();

    return () => {
      if (apiInst && selCbRef.current) {
        try { apiInst.viewer.onSelectionChanged.removeListener(selCbRef.current); } catch { /* ignore */ }
      }
    };
  }, []);

  return { api, ready, fehler, aktivesModellId, projectId, selektion };
}
