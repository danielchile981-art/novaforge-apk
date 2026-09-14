import {useState} from "react";
import {Palette,Plus,Save} from "lucide-react";
import type {AppSpec,FieldType} from "./lib/novaforge/types";
import {BRAND_ICONS,brandSvg,appIdFor,iconKey} from "./lib/novaforge/branding";
import {slugify} from "./lib/novaforge/id";
const colors=["#6d28d9","#2563eb","#0f766e","#be123c","#b45309","#475569"];
export function Customization({spec,save}:{spec:AppSpec;save:(spec:AppSpec)=>void}){
 const [draft,setDraft]=useState<AppSpec>(()=>structuredClone({...spec,appId:appIdFor(spec)}));
 const [entityKey,setEntityKey]=useState(spec.entities[0]?.key||"");
 const [fieldName,setFieldName]=useState(""),[fieldType,setFieldType]=useState<FieldType>("text"),[collectionName,setCollectionName]=useState("");
 const entity=draft.entities.find(e=>e.key===entityKey);
 function addField(){
  if(!entity||!fieldName.trim()||entity.fields.length>=30)return;
  const key="f"+Date.now().toString(36);
  setDraft({...draft,entities:draft.entities.map(e=>e.key!==entityKey?e:{...e,fields:[...e.fields,{key,label:fieldName.trim(),type:fieldType}],search:fieldType==="text"?[...(e.search||[]),key]:e.search})});
  setFieldName("");
 }
 function addCollection(){
  const name=collectionName.trim();if(!name||draft.entities.length>=12)return;
  const key="data"+Date.now().toString(36);
  const screens=[...draft.screens],index=screens.findIndex(s=>s.type==="settings");
  screens.splice(index<0?screens.length:index,0,{id:key,title:name,type:"list",entity:key,nav:true,icon:"list"});
  setDraft({...draft,entities:[...draft.entities,{key,label:name,plural:name,icon:"list",fields:[{key:"name",label:"Nome",type:"text",required:true}],search:["name"]}],screens,features:[...draft.features,name]});
  setEntityKey(key);setCollectionName("");
 }
 return <section className="customize-tab">
  <div className="title-block compact"><p className="eyebrow">IDENTIDADE DO APP</p><h1>Deixe com a sua cara</h1><p>Nome e ícone aparecem no Android. A capa abre o seu aplicativo.</p></div>
  <img className="brand-preview" src={"data:image/svg+xml;charset=utf-8,"+encodeURIComponent(brandSvg(draft,true))} alt={"Capa de "+draft.name}/>
  <label className="field-label" htmlFor="custom-name">Nome do aplicativo</label>
  <input id="custom-name" className="text-input" maxLength={32} value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value,slug:slugify(e.target.value)})}/>
  <label className="field-label">Cor principal</label>
  <div className="color-options">{colors.map(color=><button key={color} aria-label={"Cor "+color} aria-pressed={draft.theme.primary===color} style={{background:color}} onClick={()=>setDraft({...draft,theme:{...draft.theme,primary:color,accent:color}})}/>)}</div>
  <label className="field-label">Ícone do aplicativo</label>
  <div className="icon-options">{Object.entries(BRAND_ICONS).map(([key,icon])=><button key={key} aria-pressed={iconKey(draft)===key} onClick={()=>setDraft({...draft,brandIcon:key})}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d={icon.path}/></svg>{icon.label}</button>)}</div>
  <label className="field-label">Tema inicial</label>
  <div className="segmented"><button className={draft.theme.mode==="light"?"active":""} onClick={()=>setDraft({...draft,theme:{...draft.theme,mode:"light"}})}>Claro</button><button className={draft.theme.mode==="dark"?"active":""} onClick={()=>setDraft({...draft,theme:{...draft.theme,mode:"dark"}})}>Escuro</button></div>
  <div className="custom-section"><h2><Palette size={19}/> Dados e campos</h2><label className="field-label" htmlFor="custom-entity">Coleção</label><select id="custom-entity" className="text-input" value={entityKey} onChange={e=>setEntityKey(e.target.value)}>{draft.entities.map(e=><option key={e.key} value={e.key}>{e.plural}</option>)}</select>
  {entity?.fields.map(field=><label className="custom-field" key={field.key}><span>{field.key}</span><input className="text-input" aria-label={"Rótulo "+field.key} value={field.label} maxLength={40} onChange={event=>setDraft({...draft,entities:draft.entities.map(e=>e.key!==entityKey?e:{...e,fields:e.fields.map(v=>v.key===field.key?{...v,label:event.target.value}:v)})})}/></label>)}
  <label className="field-label" htmlFor="new-field">Novo campo</label><input id="new-field" className="text-input" placeholder="Ex.: Local" maxLength={40} value={fieldName} onChange={e=>setFieldName(e.target.value)}/>
  <select className="text-input" aria-label="Tipo do novo campo" value={fieldType} onChange={e=>setFieldType(e.target.value as FieldType)}>{[["text","Texto"],["textarea","Texto longo"],["number","Número"],["money","Valor"],["date","Data"],["tel","Telefone"],["email","E-mail"],["bool","Sim ou não"]].map(([key,label])=><option key={key} value={key}>{label}</option>)}</select>
  <button className="secondary-button full" disabled={!entity||!fieldName.trim()||entity.fields.length>=30} onClick={addField}><Plus size={17}/> Adicionar campo</button>
  <label className="field-label" htmlFor="new-collection">Nova coleção</label><input id="new-collection" className="text-input" placeholder="Ex.: Fornecedores" maxLength={32} value={collectionName} onChange={e=>setCollectionName(e.target.value)}/>
  <button className="secondary-button full" disabled={!collectionName.trim()||draft.entities.length>=12} onClick={addCollection}><Plus size={17}/> Adicionar coleção</button></div>
  <p className="field-help">Aplicar recria o código com estas escolhas. Edições anteriores ficam em Versões. Os dados da prévia são preservados.</p>
  <button className="primary-button full" disabled={!draft.name.trim()||draft.entities.some(e=>e.fields.some(v=>!v.label.trim()))} onClick={()=>save({...draft,name:draft.name.trim()})}><Save size={18}/> Aplicar personalização</button>
 </section>;
}
