import {createServer} from "node:http";
import {readFile,stat} from "node:fs/promises";
import {resolve,extname} from "node:path";
const mime={".html":"text/html",".js":"text/javascript",".css":"text/css",".svg":"image/svg+xml",".json":"application/json",".woff2":"font/woff2",".webp":"image/webp"};
createServer(async(req,res)=>{
 try {
 const url=new URL(req.url,"http://localhost"),sample=url.pathname.startsWith("/samples/");
 const root=resolve(sample?"demo-apps":"dist"),relative=decodeURIComponent(url.pathname.slice(sample?9:1));
 let path=resolve(root,relative||"index.html");
 if(!path.startsWith(root+"/"))throw Error("path");
 if((await stat(path)).isDirectory())path+="/index.html";
 res.writeHead(200,{"content-type":mime[extname(path)]||"application/octet-stream"});res.end(await readFile(path));
 }catch{res.writeHead(404);res.end("Not found");}
}).listen(4173,"127.0.0.1");
