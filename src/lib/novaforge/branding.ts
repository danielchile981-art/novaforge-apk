import type { AppSpec } from "./types.ts";
import { uid } from "./id.ts";
export const BRAND_ICONS: Record<string, {label:string;path:string}> = {
 spark:{label:"Centelha",path:"M12 2 15 9 22 12 15 15 12 22 9 15 2 12 9 9Z"},
 check:{label:"Tarefas",path:"M5 12 10 17 20 6"},
 box:{label:"Estoque",path:"M3 7 12 3 21 7 21 17 12 21 3 17Z M3 7 12 12 21 7 M12 12 12 21"},
 wallet:{label:"Finanças",path:"M4 7 20 7 20 20 4 20Z M4 7 4 4 18 4 M15 12 21 12 21 16 15 16Z"},
 calendar:{label:"Agenda",path:"M4 6 20 6 20 21 4 21Z M4 10 20 10 M8 3 8 8 M16 3 16 8 M8 14 10 14 M14 14 16 14"},
 users:{label:"Pessoas",path:"M7 9A5 5 0 1 0 17 9A5 5 0 1 0 7 9 M3 22Q3 15 12 15Q21 15 21 22"},
 note:{label:"Notas",path:"M5 3 15 3 20 8 20 21 5 21Z M14 3 14 9 20 9 M8 13 16 13 M8 17 14 17"}
};
export function newAppId():string{return "app.novaforge.generated."+uid("p").replace(/[^a-z0-9]/g,"");}
export function appIdFor(spec:AppSpec):string{
 if(spec.appId && /^([a-z][a-z0-9]*\.)+[a-z][a-z0-9]*$/.test(spec.appId))return spec.appId;
 let hash=2166136261;for(const c of spec.slug)hash=Math.imul(hash^c.charCodeAt(0),16777619);
 return "app.novaforge.generated.p"+(hash>>>0).toString(36);
}
export function iconKey(spec:AppSpec):string{
 if(spec.brandIcon&&BRAND_ICONS[spec.brandIcon])return spec.brandIcon;
 if(/estoque|vendas|catalogo|delivery/.test(spec.category))return "box";
 if(/financas|orcamento/.test(spec.category))return "wallet";
 if(/tarefas|habitos|produtividade/.test(spec.category))return "check";
 if(spec.category==="agenda")return "calendar";if(spec.category==="clientes")return "users";
 if(/notas|formulario/.test(spec.category))return "note";return "spark";
}
export function escapeXml(value:string):string{return value.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;");}
export function brandSvg(spec:AppSpec,cover=false):string{
 const color=/^#[0-9a-f]{6}$/i.test(spec.theme.primary)?spec.theme.primary:"#0f766e";
 const mark='<rect width="108" height="108" rx="28" fill="'+color+'"/><path d="'+BRAND_ICONS[iconKey(spec)]!.path+'" transform="translate(24 24) scale(2.5)" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>';
 if(!cover)return '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 108 108">'+mark+'</svg>';
 return '<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="640" viewBox="0 0 1080 640"><defs><radialGradient id="glow"><stop stop-color="'+color+'" stop-opacity=".38"/><stop offset="1" stop-color="'+color+'" stop-opacity="0"/></radialGradient></defs><rect width="1080" height="640" rx="48" fill="#0b0e17"/><circle cx="890" cy="60" r="520" fill="url(#glow)"/><g fill="none" stroke="'+color+'" opacity=".2"><path d="M700-60 1080 320 700 700M820-60 1200 320 820 700"/><circle cx="890" cy="320" r="180"/></g><g transform="translate(80 100) scale(1.3)">'+mark+'</g><text x="80" y="346" fill="#e6e8ee" font-family="sans-serif" font-size="'+(spec.name.length>24?44:56)+'" font-weight="700">'+escapeXml(spec.name.slice(0,32))+'</text><rect x="80" y="382" width="64" height="4" rx="2" fill="'+color+'"/><text x="80" y="437" fill="#b6bdcf" font-family="sans-serif" font-size="23">Seu espaço. Seus dados.</text><text x="80" y="555" fill="#7f899f" font-family="sans-serif" font-size="16" letter-spacing="4">APLICATIVO INDEPENDENTE</text></svg>';
}
export function vectorIcon(spec:AppSpec,foreground=false):string{
 const color=/^#[0-9a-f]{6}$/i.test(spec.theme.primary)?spec.theme.primary:"#0f766e";
 return '<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="108dp" android:height="108dp" android:viewportWidth="108" android:viewportHeight="108">'+(foreground?"":'<path android:fillColor="'+color+'" android:pathData="M0,0H108V108H0Z"/>')+'<group android:translateX="30" android:translateY="30" android:scaleX="2" android:scaleY="2"><path android:fillColor="@android:color/transparent" android:strokeColor="#FFFFFF" android:strokeWidth="1.8" android:strokeLineCap="round" android:strokeLineJoin="round" android:pathData="'+BRAND_ICONS[iconKey(spec)]!.path+'"/></group></vector>';
}
