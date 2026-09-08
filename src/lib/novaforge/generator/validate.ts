import type { AppSpec, ValidationIssue } from "../types.ts";

function checkJs(source: string, file: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  try {
    // Compile-only: wrap so a script body is valid inside a function.
    // eslint-disable-next-line no-new-func
    new Function(source);
  } catch (err) {
    issues.push({
      level: "error",
      file,
      message: `JavaScript inválido em ${file}: ${err instanceof Error ? err.message : String(err)}`,
      fix: "restore",
    });
  }
  return issues;
}

export function validateProject(spec: AppSpec, files: Record<string, string>): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const index = files["www/index.html"] || files["index.html"];
  if (!index || !index.includes("<html")) {
    issues.push({ level: "error", file: "www/index.html", message: "index.html ausente ou inválido." });
  }
  const required = ["www/js/runtime.js", "www/js/config.js", "www/js/app.js", "www/css/app.css"];
  for (const f of required) {
    if (!files[f] || files[f]!.trim().length < 20) {
      issues.push({ level: "error", file: f, message: `Arquivo obrigatório ausente: ${f}` });
    }
  }
  for (const [path, content] of Object.entries(files)) {
    if (path.endsWith(".js")) issues.push(...checkJs(content, path));
  }
  if (!spec.name?.trim()) issues.push({ level: "error", message: "O aplicativo está sem nome." });
  if (!spec.screens?.length) issues.push({ level: "error", message: "Nenhuma tela definida." });
  const screenIds = new Set(spec.screens.map((s) => s.id));
  for (const s of spec.screens) {
    if (s.entity && !spec.entities.some((e) => e.key === s.entity) && s.type !== "calculator") {
      issues.push({ level: "warning", message: `Tela "${s.title}" aponta para dados inexistentes (${s.entity}).` });
    }
    if (screenIds.size !== spec.screens.length) {
      issues.push({ level: "warning", message: "Há telas com o mesmo identificador." });
      break;
    }
  }
  const runtime = files["www/js/runtime.js"] || "";
  if (runtime && !runtime.includes("NF.boot")) {
    issues.push({ level: "error", file: "www/js/runtime.js", message: "Runtime sem função de inicialização." });
  }
  const config = files["www/js/config.js"] || "";
  if (config && !config.includes("NF_APP")) {
    issues.push({ level: "error", file: "www/js/config.js", message: "Configuração não expõe NF_APP." });
  }
  if (!files["package.json"]) {
    issues.push({ level: "warning", message: "package.json ausente — o build Android pode falhar." });
  }
  if (!files["capacitor.config.json"]) {
    issues.push({ level: "warning", message: "capacitor.config.json ausente." });
  }
  return issues;
}

export function isProjectRunnable(issues: ValidationIssue[]): boolean {
  return !issues.some((i) => i.level === "error");
}
