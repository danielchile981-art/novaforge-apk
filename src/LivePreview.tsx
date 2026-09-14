import {useEffect,useMemo,useRef} from "react";
import {compilePreviewHtml} from "./lib/novaforge/preview";
export function LivePreview({id,name,files}:{id:string;name:string;files:Record<string,string>}){
 const frame=useRef<HTMLIFrameElement>(null),key="novaforge.preview."+id;
 const html=useMemo(()=>{let db={};try{db=JSON.parse(localStorage.getItem(key)||"{}");}catch{}return compilePreviewHtml(files,"preview_"+id+"_",db);},[files,id]);
 useEffect(()=>{
  const receive=(event:MessageEvent)=>{
   if(event.source!==frame.current?.contentWindow||event.data?.type!=="nf-preview-save")return;
   const value=event.data.db;if(!value||typeof value!=="object"||Array.isArray(value))return;
   const json=JSON.stringify(value);if(json.length>1000000){frame.current?.contentWindow?.postMessage({type:"nf-preview-error"},"*");return;}
   try{localStorage.setItem(key,json);}catch{frame.current?.contentWindow?.postMessage({type:"nf-preview-error"},"*");}
  };
  window.addEventListener("message",receive);return()=>window.removeEventListener("message",receive);
 },[key]);
 return <iframe ref={frame} title={"Prévia de "+name} sandbox="allow-scripts allow-forms allow-modals allow-downloads" srcDoc={html}/>;
}
