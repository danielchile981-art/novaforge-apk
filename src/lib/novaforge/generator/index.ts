import { APP_CSS } from "./app-css.ts";
import { buildExportExtras } from "./independent-export.ts";
import {brandSvg} from "../branding.ts";
import {scopeIssues} from "../capabilities.ts";
import { RUNTIME_JS } from "./runtime-js.ts";
import { interpretPrompt, specSummary } from "../spec.ts";
import type { AppSpec, GenerateResult } from "../types.ts";
import { validateProject } from "./validate.ts";

function configJs(spec: AppSpec): string {
  return `window.NF_APP = ${JSON.stringify(spec, null, 2).replace(/</g, "\\u003c")};\n`;
}

function customJs(spec: AppSpec): string {
  const lines = [
    "/* Extensões específicas deste aplicativo. Ajuste aqui sem reescrever o motor. */",
    "window.NF_HOOKS = window.NF_HOOKS || {};",
    "window.NF_HOOKS.afterSave = function (payload) {",
    "  // Ganchos extras (além dos definidos em spec.hooks) podem entrar aqui.",
    "  if (!payload || !payload.row) return;",
    "};",
  ];
  if (spec.category === "calculadora" || spec.category === "ferramentas") {
    lines.push("/* Calculadora usa o motor NF.evalExpr — as contas são reais. */");
  }
  return lines.join("\n") + "\n";
}

function indexHtml(spec: AppSpec): string {
  const theme = spec.theme?.primary || "#0f766e";
  return `<!DOCTYPE html>
<html lang="${spec.locale || "pt-BR"}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="${theme}">
  <meta name="description" content="${escapeHtml(spec.description)}">
  <title>${escapeHtml(spec.name)}</title>
  <link rel="stylesheet" href="css/app.css">
</head>
<body>
  <aside id="brand-splash" style="position:fixed;inset:0;z-index:999;background:#0b0e17;display:grid;place-content:center;justify-items:center;color:white;text-align:center;padding:32px"><img alt="" src="assets/icon.svg" width="100" height="100"><h1>${escapeHtml(spec.name)}</h1><p>Seu espaço. Seus dados.</p></aside>
  <div id="app"></div>
  <script src="js/runtime.js"></script>
  <script src="js/config.js"></script>
  <script src="js/custom.js"></script>
  <script src="js/app.js"></script>
</body>
</html>
`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function themeCss(spec: AppSpec): string {
  return `:root {
  --p: ${spec.theme.primary};
  --pfg: ${spec.theme.primaryFg};
}
html { color-scheme: ${spec.theme.mode}; }
`;
}

function appJs(): string {
  return `document.addEventListener("DOMContentLoaded", function () {
  if (!window.NF || typeof window.NF.boot !== "function") {
    document.getElementById("app").innerHTML = "<main class='page'><p>Não foi possível iniciar. Restaure a última versão.</p></main>";
    return;
  }
  window.NF.boot(window.NF_APP);
  setTimeout(function(){document.getElementById("brand-splash")?.remove();},700);
});
`;
}

export function generateFiles(spec: AppSpec): Record<string, string> {
  const www: Record<string, string> = {
    "www/index.html": indexHtml(spec),
    "www/css/app.css": `${themeCss(spec)}\n${APP_CSS}\n.app-cover{width:100%;border-radius:20px;margin:4px 0 18px;display:block}.tabbar{display:flex;overflow-x:auto;justify-content:safe center}.tabbar .tab{flex:1 0 64px;min-width:64px;max-width:110px}.btn{min-height:48px}.page{padding-bottom:100px}.kpis{grid-template-columns:repeat(auto-fit,minmax(130px,1fr))}`,
    "www/css/theme.css": themeCss(spec),
    "www/js/runtime.js": RUNTIME_JS,
    "www/js/config.js": configJs(spec),
    "www/js/custom.js": customJs(spec),
    "www/js/app.js": appJs(),
    "www/assets/icon.svg":brandSvg(spec),
    "www/assets/cover.svg":brandSvg(spec,true),
  };
  return { ...www, ...buildExportExtras(spec) };
}

export function generateFromSpec(spec: AppSpec, provider: GenerateResult["provider"] = "local"): GenerateResult {
  const files = generateFiles(spec);
  const issues = validateProject(spec, files);
  return {
    ok: !issues.some((i) => i.level === "error"),
    spec,
    files,
    issues,
    provider,
    summary: specSummary(spec),
  };
}

export function generateFromPrompt(prompt: string): GenerateResult {
  const spec = interpretPrompt(prompt);
  const result=generateFromSpec(spec,"local");const missing=scopeIssues(prompt,spec);
  if(missing.length){result.ok=false;result.issues.push(...missing.map(message=>({level:"error" as const,message})));}
  return result;
}
