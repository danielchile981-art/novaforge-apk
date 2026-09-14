import {Capacitor,registerPlugin} from "@capacitor/core";
export const Delivery=registerPlugin<{
 saveFile(options:{name:string;mime:string;base64:string}):Promise<{saved:boolean}>;
 githubArtifact(options:{url:string;token:string}):Promise<{base64:string}>;
}>("Delivery");
export async function saveNative(blob:Blob,name:string):Promise<boolean>{
 if(!Capacitor.isNativePlatform())return false;
 const bytes=new Uint8Array(await blob.arrayBuffer());let bin="";
 for(let i=0;i<bytes.length;i+=8192)bin+=String.fromCharCode(...bytes.subarray(i,i+8192));
 await Delivery.saveFile({name,mime:blob.type||"application/octet-stream",base64:btoa(bin)});return true;
}
