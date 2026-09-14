import JSZip from "jszip";
import {newAppId} from "./branding.ts";
import {generateFromSpec} from "./generator/index.ts";
import {validateProject} from "./generator/validate.ts";
import {persistGenerated} from "./engine.ts";
import type {AppSpec} from "./types.ts";
export async function importProjectZip(file:Blob){
 if(file.size>10000000)throw new Error("ZIP acima de 10 MB.");
 const zip=await JSZip.loadAsync(await file.arrayBuffer());
 const manifest=Object.values(zip.files).find(entry=>entry.name.endsWith("novaforge.project.json"));
 if(!manifest)throw new Error("Use um ZIP de projeto exportado pelo NovaForge Livre.");
 const raw=await manifest.async("string");if(raw.length>200000)throw new Error("Manifesto grande demais.");
 const parsed=JSON.parse(raw);if(parsed.format!=="novaforge-project")throw new Error("Formato de projeto inválido.");
 const spec=parsed.spec as AppSpec;
 if(!spec||typeof spec.name!=="string"||!spec.name.trim()||spec.name.length>40||!Array.isArray(spec.entities)||!Array.isArray(spec.screens)||spec.entities.length>12||spec.screens.length>30)throw new Error("Estrutura do projeto inválida.");
 for(const entity of spec.entities){
  if(!/^[a-zA-Z][a-zA-Z0-9_]{0,45}$/.test(entity.key)||["constructor","prototype","__proto__"].includes(entity.key)||!Array.isArray(entity.fields)||entity.fields.length>30)throw new Error("Coleção inválida.");
  for(const field of entity.fields)if(!/^[a-zA-Z][a-zA-Z0-9_]{0,45}$/.test(field.key)||["constructor","prototype","__proto__"].includes(field.key))throw new Error("Campo inválido.");
 }
 if(!/^#[0-9a-f]{6}$/i.test(spec.theme?.primary))throw new Error("Cor inválida.");
 spec.appId=newAppId();spec.versionCode=1;
 const generated=generateFromSpec(spec);if(!generated.ok)throw new Error(generated.issues.map(i=>i.message).join(" "));
 const base=manifest.name.slice(0,-"novaforge.project.json".length),files={...generated.files};let total=0;
 for(const path of ["www/css/app.css","www/js/custom.js","www/js/runtime.js","www/js/app.js"]){
  const entry=zip.file(base+path);if(!entry)continue;
  const size=(entry as unknown as {_data?:{uncompressedSize?:number}})._data?.uncompressedSize;
  if(size&&size>2000000)throw new Error("Arquivo grande demais.");
  const content=await entry.async("string");total+=content.length;if(total>4000000)throw new Error("Projeto grande demais.");files[path]=content;
 }
 const issues=validateProject(spec,files);if(issues.some(i=>i.level==="error"))throw new Error("Código importado inválido. Seus projetos foram preservados.");
 return persistGenerated(spec,files,"edit");
}
