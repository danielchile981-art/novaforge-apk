import { generateFiles, generateFromPrompt, generateFromSpec } from "./generator/index.ts";
import { applySpecPatch, interpretPrompt, specFromCategory, specSummary } from "./spec.ts";
import {
  addHistory,
  deleteProject,
  getProject,
  listHistory,
  listProjects,
  listVersions,
  pushVersion,
  getVersion,
  saveProject,
} from "./storage.ts";
import { projectThumbnail } from "./thumbnail.ts";
import type { AppSpec, Category, GenerateResult, HistoryEntry, ProjectMeta, ProjectRecord, VersionSnap } from "./types.ts";
import { uid } from "./id.ts";
import { isProjectRunnable, validateProject } from "./generator/validate.ts";

function now(): string {
  return new Date().toISOString();
}

function metaFrom(spec: AppSpec, id: string, source: ProjectMeta["source"], status: ProjectMeta["status"] = "ready"): ProjectMeta {
  return {
    id,
    name: spec.name,
    description: spec.description,
    category: spec.category,
    createdAt: now(),
    updatedAt: now(),
    status,
    thumbnail: projectThumbnail(spec.name, spec.theme.primary),
    source,
  };
}

function snapshot(projectId: string, spec: AppSpec, files: Record<string, string>, label: string): VersionSnap {
  return { id: uid("v"), projectId, createdAt: now(), label, files: { ...files }, spec };
}

function hist(partial: Omit<HistoryEntry, "id" | "at">): void {
  addHistory({ id: uid("h"), at: now(), ...partial });
}

export function persistGenerated(
  spec: AppSpec,
  files: Record<string, string>,
  source: ProjectMeta["source"],
  existingId?: string,
): ProjectRecord {
  const prev = existingId ? getProject(existingId) : null;
  const id = existingId ?? uid("p");
  const meta: ProjectMeta = prev
    ? {
        ...prev.meta,
        name: spec.name,
        description: spec.description,
        category: spec.category,
        updatedAt: now(),
        status: "ready",
        thumbnail: projectThumbnail(spec.name, spec.theme.primary),
        lastError: undefined,
        source,
      }
    : metaFrom(spec, id, source);
  if (prev) meta.createdAt = prev.meta.createdAt;
  const record: ProjectRecord = {
    meta,
    spec,
    files,
    lastWorkingFiles: files,
  };
  saveProject(record);
  pushVersion(snapshot(id, spec, files, source === "edit" ? "Alteração" : "Geração"));
  return record;
}

export function createFromIdea(prompt: string): GenerateResult & { project: ProjectRecord } {
  const result = generateFromPrompt(prompt);
  if (!result.ok) {
    hist({ kind: "error", title: "Geração falhou", detail: result.issues.map((i) => i.message).join("; ") });
    throw new Error(result.issues.find((i) => i.level === "error")?.message || "Falha ao gerar");
  }
  const project = persistGenerated(result.spec, result.files, "ai");
  hist({
    kind: "generate",
    projectId: project.meta.id,
    title: `Criado: ${project.meta.name}`,
    detail: specSummary(result.spec),
  });
  return { ...result, project };
}

export function createFromTemplate(category: Category, name?: string): ProjectRecord {
  const spec = specFromCategory(category, name ?? "", name);
  const result = generateFromSpec(spec, "local");
  const project = persistGenerated(result.spec, result.files, "template");
  hist({ kind: "create", projectId: project.meta.id, title: `Modelo: ${project.meta.name}` });
  return project;
}

export function createBlank(name = "Novo aplicativo"): ProjectRecord {
  return createFromTemplate("notas", name);
}

export function modifyProject(id: string, instruction: string, nextSpec?: AppSpec): ProjectRecord {
  const rec = getProject(id);
  if (!rec) throw new Error("Projeto não encontrado");
  const spec = nextSpec ?? applySpecPatch(rec.spec, instruction);
  const files = generateFiles(spec);
  const issues = validateProject(spec, files);
  if (!isProjectRunnable(issues)) {
    rec.meta.status = "error";
    rec.meta.lastError = issues.filter((i) => i.level === "error").map((i) => i.message).join("; ");
    rec.meta.updatedAt = now();
    saveProject(rec);
    hist({ kind: "error", projectId: id, title: "Alteração com erro", detail: rec.meta.lastError });
    throw new Error(rec.meta.lastError);
  }
  const updated = persistGenerated(spec, files, "edit", id);
  updated.meta.createdAt = rec.meta.createdAt;
  saveProject(updated);
  hist({ kind: "modify", projectId: id, title: "Alteração aplicada", detail: instruction });
  return updated;
}

export function saveCodeEdit(id: string, files: Record<string, string>): ProjectRecord {
  const rec = getProject(id);
  if (!rec) throw new Error("Projeto não encontrado");
  const issues = validateProject(rec.spec, files);
  rec.files = files;
  rec.meta.updatedAt = now();
  if (!isProjectRunnable(issues)) {
    rec.meta.status = "error";
    rec.meta.lastError = issues.filter((i) => i.level === "error").map((i) => i.message).join("; ");
    saveProject(rec);
    hist({ kind: "error", projectId: id, title: "Código com erro", detail: rec.meta.lastError });
    return rec;
  }
  rec.lastWorkingFiles = files;
  rec.meta.status = "ready";
  rec.meta.lastError = undefined;
  saveProject(rec);
  pushVersion(snapshot(id, rec.spec, files, "Edição de código"));
  hist({ kind: "edit", projectId: id, title: "Código atualizado" });
  return rec;
}

export function restoreWorking(id: string): ProjectRecord {
  const rec = getProject(id);
  if (!rec) throw new Error("Projeto não encontrado");
  rec.files = { ...rec.lastWorkingFiles };
  rec.meta.status = "ready";
  rec.meta.lastError = undefined;
  rec.meta.updatedAt = now();
  saveProject(rec);
  hist({ kind: "restore", projectId: id, title: "Última versão funcional restaurada" });
  return rec;
}

export function restoreVersion(id: string, versionId: string): ProjectRecord {
  const rec = getProject(id);
  const ver = getVersion(id, versionId);
  if (!rec || !ver) throw new Error("Versão não encontrada");
  rec.spec = ver.spec;
  rec.files = { ...ver.files };
  rec.lastWorkingFiles = { ...ver.files };
  rec.meta.name = ver.spec.name;
  rec.meta.status = "ready";
  rec.meta.lastError = undefined;
  rec.meta.updatedAt = now();
  saveProject(rec);
  hist({ kind: "restore", projectId: id, title: `Versão restaurada: ${ver.label}` });
  return rec;
}

export function duplicateProject(id: string): ProjectRecord {
  const rec = getProject(id);
  if (!rec) throw new Error("Projeto não encontrado");
  const copySpec = { ...rec.spec, name: `${rec.spec.name} (cópia)`, slug: `${rec.spec.slug}-copia` };
  const files = generateFiles(copySpec);
  const project = persistGenerated(copySpec, files, rec.meta.source);
  hist({ kind: "duplicate", projectId: project.meta.id, title: `Duplicado: ${project.meta.name}` });
  return project;
}

export function removeProject(id: string): void {
  const rec = getProject(id);
  deleteProject(id);
  if (rec) hist({ kind: "error", projectId: id, title: `Excluído: ${rec.meta.name}` });
}

export { listProjects, getProject, listHistory, listVersions, interpretPrompt, specSummary };
