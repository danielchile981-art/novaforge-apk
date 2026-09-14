import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { evalExpr } from "./calc.ts";
import {
  createBlank,
  createFromIdea,
  createFromTemplate,
  duplicateProject,
  modifyProject,
  restoreWorking,
  saveCodeEdit,
} from "./engine.ts";
import { generateFromPrompt, generateFromSpec } from "./generator/index.ts";
import { isProjectRunnable, validateProject } from "./generator/validate.ts";
import { compilePreviewHtml } from "./preview.ts";
import { interpretPrompt, specFromCategory } from "./spec.ts";
import { getProject, listProjects, useMemoryStorage } from "./storage.ts";
import { zipProject } from "./zip.ts";

beforeEach(() => {
  useMemoryStorage();
});

afterEach(() => {
  useMemoryStorage();
});

describe("interpretPrompt", () => {
  it("maps stock+sales to a working shop spec", () => {
    const spec = interpretPrompt(
      "Crie um aplicativo para registrar minhas vendas, cadastrar produtos, controlar estoque, mostrar lucro mensal e gerar relatórios",
    );
    assert.equal(spec.category, "vendas-estoque");
    assert.ok(spec.entities.some((e) => e.key === "products"));
    assert.ok(spec.entities.some((e) => e.key === "sales"));
    assert.ok(spec.screens.some((s) => s.type === "dashboard"));
    assert.ok(spec.screens.some((s) => s.type === "report"));
    assert.ok(spec.calculations.length >= 2);
    assert.ok(spec.hooks.some((h) => h.action === "decrement"));
  });

  it("maps calculator prompts", () => {
    const spec = interpretPrompt("Quero uma calculadora");
    assert.equal(spec.category, "calculadora");
    assert.ok(spec.screens.some((s) => s.type === "calculator"));
  });

  it("maps habits prompts", () => {
    const spec = interpretPrompt("hábitos diários com histórico");
    assert.equal(spec.category, "habitos");
  });
});

describe("evalExpr", () => {
  it("computes sale totals", () => {
    assert.equal(evalExpr("qty * unitPrice", { qty: 3, unitPrice: 10 }), 30);
    assert.equal(evalExpr("qty * (unitPrice - costPrice)", { qty: 2, unitPrice: 10, costPrice: 4 }), 12);
  });
  it("rejects unsafe expressions", () => {
    assert.equal(evalExpr("process.exit()", { qty: 1 }), 0);
  });
});

describe("generation", () => {
  it("creates a runnable multi-file project", () => {
    const result = generateFromPrompt("controle de estoque com entrada e saída");
    assert.equal(result.ok, true);
    assert.ok(result.files["www/index.html"]?.includes("<html"));
    assert.ok(result.files["www/js/runtime.js"]?.includes("NF.boot"));
    assert.ok(result.files["www/js/config.js"]?.includes("NF_APP"));
    assert.ok(result.files["www/js/app.js"]);
    assert.ok(result.files["www/css/app.css"]);
    assert.ok(result.files["capacitor.config.json"]);
    assert.ok(result.files["package.json"]);
    assert.ok(result.files[".github/workflows/android-apk.yml"]);
    const cap = JSON.parse(result.files["capacitor.config.json"]!);
    assert.equal(cap.webDir, "dist");
    assert.ok(isProjectRunnable(validateProject(result.spec, result.files)));
  });

  it("preview html executes as a single document", () => {
    const result = generateFromSpec(specFromCategory("calculadora", "calculadora"));
    const html = compilePreviewHtml(result.files, "nf_test_");
    assert.ok(html.includes("NF.boot"));
    assert.ok(html.includes("__NF_STORAGE_PREFIX"));
    assert.ok(html.includes("<style>"));
  });
});

describe("persistence", () => {
  it("saves and recovers projects", () => {
    const rec = createFromIdea("lista de tarefas com prazo");
    assert.ok(rec.project.meta.id);
    const loaded = getProject(rec.project.meta.id);
    assert.ok(loaded);
    assert.equal(loaded?.meta.name, rec.project.meta.name);
    assert.ok(Object.keys(loaded?.files || {}).length > 3);
    assert.equal(listProjects().length, 1);
  });

  it("modifies color without dropping entities", () => {
    const rec = createFromTemplate("clientes", "Clientes");
    const after = modifyProject(rec.meta.id, "Troque a cor principal para azul.");
    assert.equal(after.spec.theme.primary, "#2563eb");
    assert.ok(after.spec.entities.some((e) => e.key === "clients"));
  });

  it("restores last working files after a bad edit", () => {
    const rec = createBlank("Notas");
    const broken = { ...rec.files, "www/js/app.js": "function (" };
    const bad = saveCodeEdit(rec.meta.id, broken);
    assert.equal(bad.meta.status, "error");
    const restored = restoreWorking(rec.meta.id);
    assert.equal(restored.meta.status, "ready");
    assert.ok(restored.files["www/js/app.js"]?.includes("NF.boot"));
  });

  it("duplicates a project", () => {
    const rec = createFromTemplate("agenda", "Agenda");
    const copy = duplicateProject(rec.meta.id);
    assert.notEqual(copy.meta.id, rec.meta.id);
    assert.equal(listProjects().length, 2);
  });
});

describe("export", () => {
  it("zips source including capacitor webDir contract", async () => {
    const rec = createFromTemplate("financas", "Finanças");
    const blob = await zipProject(rec.meta.name, rec.files);
    assert.ok(blob.size > 1000);
    const buf = Buffer.from(await blob.arrayBuffer());
    assert.ok(buf.length > 1000);
  });
});

describe("independent identity and recovery",()=>{
 it("keeps identity on rename and separates copies with the same name",()=>{
  const original=createFromTemplate("tarefas","Meu Dia"),second=createFromTemplate("tarefas","Meu Dia");
  assert.notEqual(original.spec.appId,second.spec.appId);
  const renamed=modifyProject(original.meta.id,"nome para Dia Certo");
  assert.equal(renamed.spec.appId,original.spec.appId);assert.equal(renamed.spec.versionCode,2);
  assert.equal(JSON.parse(renamed.files["capacitor.config.json"]).appId,original.spec.appId);
  assert.ok(renamed.files["www/assets/cover.svg"].includes("Dia Certo"));
 });
 it("rejects unsupported generation without saving a fake app",()=>{
  assert.throws(()=>createFromIdea("Crie um gerador de imagens por IA"));
  assert.throws(()=>createFromIdea("Crie um aplicativo para pagamento com cartão"));
  assert.equal(listProjects().length,0);
 });
 it("escapes script and XML text and produces valid JavaScript",()=>{
  const spec=specFromCategory("notas","","Teste </script> & 'nome'");
  const result=generateFromSpec(spec);assert.equal(result.ok,true);
  assert.ok(!result.files["www/js/config.js"].includes("</script>"));
  assert.ok(result.files["www/assets/cover.svg"].includes("&lt;/script&gt;"));
  new Function(result.files["www/js/runtime.js"]);
  new Function(result.files["scripts/prepare-android.mjs"].replace(/^import .*;\n/gm,""));
 });
 it("imports a ZIP as a new independent project",async()=>{
  const {importProjectZip}=await import("./import-project.ts");
  const original=createFromTemplate("financas","Bolso Claro");
  const imported=await importProjectZip(await zipProject(original.meta.name,original.files));
  assert.notEqual(imported.spec.appId,original.spec.appId);
  assert.equal(imported.spec.name,original.spec.name);assert.equal(listProjects().length,2);
 });
 it("rejects malformed backup before clearing existing projects",async()=>{
  const {importRawDump,exportRawDump}=await import("./storage.ts");
  createFromTemplate("tarefas","Preservado");const before=exportRawDump();
  assert.throws(()=>importRawDump(JSON.stringify({format:"novaforge-backup",data:{"novaforge.projects":"[{}]"}})));
  assert.equal(listProjects()[0].name,"Preservado");
  assert.deepEqual(JSON.parse(exportRawDump()).data,JSON.parse(before).data);
 });
 it("never persists a GitHub token or includes it in backup",async()=>{
  const {saveSettings,getSettings,exportRawDump}=await import("./storage.ts");
  saveSettings({theme:"dark",mode:"simple",githubToken:"private-test-token",githubUser:"tester"});
  assert.equal(getSettings().githubToken,undefined);assert.ok(!exportRawDump().includes("private-test-token"));
 });
});
