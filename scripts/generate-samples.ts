import {mkdirSync,writeFileSync} from "node:fs";
import {dirname,join} from "node:path";
import {CATEGORIES,specFromCategory} from "../src/lib/novaforge/spec.ts";
import {generateFromSpec} from "../src/lib/novaforge/generator/index.ts";
const names:Record<string,string>={tarefas:"Dia Certo","vendas-estoque":"Estoque Livre",financas:"Bolso Claro"};
for(const category of CATEGORIES){
 const spec=specFromCategory(category.id,category.blurb,names[category.id]||category.label);
 spec.appId="app.novaforge.demo."+category.id.replace(/-/g,"");
 if(category.id==="tarefas")spec.theme.primary="#6d28d9";
 if(category.id==="financas")spec.theme.primary="#2563eb";
 const result=generateFromSpec(spec);if(!result.ok)throw Error(JSON.stringify(result.issues));
 for(const [path,data] of Object.entries(result.files)){const full=join("demo-apps",category.id,path);mkdirSync(dirname(full),{recursive:true});writeFileSync(full,data);}
}
console.log("15 projetos independentes gerados.");
