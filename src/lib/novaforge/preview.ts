export function compilePreviewHtml(files:Record<string,string>,storagePrefix:string,db:unknown={}):string{
 const html=files["www/index.html"]||files["index.html"]||"<!DOCTYPE html><html><body></body></html>";
 const css=[files["www/css/theme.css"]||"",files["www/css/app.css"]||""].join("\n");
 const js=[
  "window.__NF_COVER = "+JSON.stringify("data:image/svg+xml;charset=utf-8,"+encodeURIComponent(files["www/assets/cover.svg"]||""))+";",
  "window.__NF_PREVIEW_DB = "+JSON.stringify(db).replace(/</g,"\\u003c")+";",
  "window.__NF_STORAGE_PREFIX = "+JSON.stringify(storagePrefix)+";",
  files["www/js/runtime.js"]||"",files["www/js/config.js"]||"",files["www/js/custom.js"]||"",files["www/js/app.js"]||""
 ].join("\n;\n");
 let out=html.replaceAll("assets/icon.svg","data:image/svg+xml;charset=utf-8,"+encodeURIComponent(files["www/assets/icon.svg"]||""));
 out=out.replace(/<link[^>]+href="css\/[^"]+"[^>]*>/g,"").replace(/<script[^>]+src="js\/[^"]+"[^>]*><\/script>/g,"");
 const inject="<style>"+css.replace(/<\/style/gi,"<\\/style")+"</style>\n<script>"+js.replace(/<\/script/gi,"<\\/script")+"\n</script>";
 if(out.includes("</head>"))out=out.replace("</head>",inject+"\n</head>");else out+=inject;
 return out;
}
export function fileTree(files:Record<string,string>):string[]{return Object.keys(files).sort();}
