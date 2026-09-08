import type { HistoryEntry, ProjectMeta, ProjectRecord, Settings, VersionSnap } from "./types.ts";

const LS_PROJECTS = "novaforge.projects";
const LS_FILES = "novaforge.files.";
const LS_LAST = "novaforge.last.";
const LS_SPEC = "novaforge.spec.";
const LS_VERSIONS = "novaforge.versions.";
const LS_HISTORY = "novaforge.history";
const LS_SETTINGS = "novaforge.settings";

type Adapter = {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
  keys(): string[];
};

function memoryAdapter(): Adapter {
  const map = new Map<string, string>();
  return {
    get: (k) => map.get(k) ?? null,
    set: (k, v) => {
      map.set(k, v);
    },
    remove: (k) => {
      map.delete(k);
    },
    keys: () => [...map.keys()],
  };
}

function localAdapter(): Adapter {
  if (typeof localStorage === "undefined") return memoryAdapter();
  return {
    get: (k) => {
      try {
        return localStorage.getItem(k);
      } catch {
        return null;
      }
    },
    set: (k, v) => {
      try {
        localStorage.setItem(k, v);
      } catch (err) {
        console.warn("[novaforge] storage write failed", err);
      }
    },
    remove: (k) => {
      try {
        localStorage.removeItem(k);
      } catch {
        /* ignore */
      }
    },
    keys: () => {
      const out: string[] = [];
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k) out.push(k);
        }
      } catch {
        /* ignore */
      }
      return out;
    },
  };
}

let adapter: Adapter = localAdapter();

/** Tests can swap in a fresh memory backend. */
export function useMemoryStorage(): void {
  adapter = memoryAdapter();
}

export function useLocalStorage(): void {
  adapter = localAdapter();
}

function readJson<T>(key: string, fallback: T): T {
  const raw = adapter.get(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  adapter.set(key, JSON.stringify(value));
}

export function listProjects(): ProjectMeta[] {
  const list = readJson<ProjectMeta[]>(LS_PROJECTS, []);
  return list.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

export function getProject(id: string): ProjectRecord | null {
  const meta = listProjects().find((p) => p.id === id);
  if (!meta) return null;
  const files = readJson<Record<string, string>>(LS_FILES + id, {});
  const lastWorkingFiles = readJson<Record<string, string>>(LS_LAST + id, files);
  const spec = readJson<ProjectRecord["spec"]>(LS_SPEC + id, null as unknown as ProjectRecord["spec"]);
  if (!spec) return null;
  return { meta, spec, files, lastWorkingFiles };
}

export function saveProject(record: ProjectRecord): void {
  const list = listProjects().filter((p) => p.id !== record.meta.id);
  list.unshift(record.meta);
  writeJson(LS_PROJECTS, list);
  writeJson(LS_FILES + record.meta.id, record.files);
  writeJson(LS_LAST + record.meta.id, record.lastWorkingFiles);
  writeJson(LS_SPEC + record.meta.id, record.spec);
}

export function deleteProject(id: string): void {
  writeJson(
    LS_PROJECTS,
    listProjects().filter((p) => p.id !== id),
  );
  adapter.remove(LS_FILES + id);
  adapter.remove(LS_LAST + id);
  adapter.remove(LS_SPEC + id);
  adapter.remove(LS_VERSIONS + id);
}

export function renameProject(id: string, name: string): ProjectMeta | null {
  const rec = getProject(id);
  if (!rec) return null;
  rec.meta.name = name;
  rec.meta.updatedAt = new Date().toISOString();
  rec.spec.name = name;
  saveProject(rec);
  return rec.meta;
}

export function listVersions(projectId: string): VersionSnap[] {
  return readJson<VersionSnap[]>(LS_VERSIONS + projectId, []).sort((a, b) =>
    a.createdAt < b.createdAt ? 1 : -1,
  );
}

export function pushVersion(snap: VersionSnap): void {
  const all = listVersions(snap.projectId);
  all.unshift(snap);
  writeJson(LS_VERSIONS + snap.projectId, all.slice(0, 12));
}

export function getVersion(projectId: string, versionId: string): VersionSnap | null {
  return listVersions(projectId).find((v) => v.id === versionId) ?? null;
}

export function listHistory(projectId?: string): HistoryEntry[] {
  const all = readJson<HistoryEntry[]>(LS_HISTORY, []);
  const filtered = projectId ? all.filter((h) => h.projectId === projectId) : all;
  return filtered.sort((a, b) => (a.at < b.at ? 1 : -1));
}

export function addHistory(entry: HistoryEntry): void {
  const all = readJson<HistoryEntry[]>(LS_HISTORY, []);
  all.unshift(entry);
  writeJson(LS_HISTORY, all.slice(0, 200));
}

export function getSettings(): Settings {
  return readJson<Settings>(LS_SETTINGS, { theme: "dark", mode: "simple" });
}

export function saveSettings(settings: Settings): void {
  writeJson(LS_SETTINGS, settings);
}

export function exportRawDump(): string {
  const keys = adapter.keys().filter((k) => k.startsWith("novaforge."));
  const dump: Record<string, string | null> = {};
  for (const k of keys) {
    if (k === LS_SETTINGS) {
      const settings = readJson<Settings>(LS_SETTINGS, { theme: "dark", mode: "simple" });
      dump[k] = JSON.stringify({ ...settings, githubToken: undefined });
    } else {
      dump[k] = adapter.get(k);
    }
  }
  return JSON.stringify(
    {
      format: "novaforge-backup",
      version: 2,
      exportedAt: new Date().toISOString(),
      data: dump,
    },
    null,
    2,
  );
}

export function importRawDump(raw: string): { projects: number; history: number } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("O arquivo de backup não contém um JSON válido.");
  }

  const envelope = parsed as { format?: string; data?: Record<string, unknown> };
  const data = envelope?.format === "novaforge-backup" ? envelope.data : (parsed as Record<string, unknown>);
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Este arquivo não é um backup do NovaForge.");
  }

  const entries = Object.entries(data).filter(([key, value]) => key.startsWith("novaforge.") && (typeof value === "string" || value === null));
  if (!entries.some(([key]) => key === LS_PROJECTS)) {
    throw new Error("O backup não contém a lista de projetos.");
  }

  for (const key of adapter.keys().filter((key) => key.startsWith("novaforge."))) {
    if (key !== LS_SETTINGS) adapter.remove(key);
  }
  for (const [key, value] of entries) {
    if (key === LS_SETTINGS || typeof value !== "string") continue;
    adapter.set(key, value);
  }

  const projects = listProjects().length;
  const history = listHistory().length;
  return { projects, history };
}
