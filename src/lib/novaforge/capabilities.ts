import type {AppSpec} from "./types.ts";
export function scopeIssues(prompt:string,spec:AppSpec):string[]{
 const p=prompt.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
 const issues:string[]=[];
 const rules:Array<[RegExp,string]>=[
 [/(ger(ar|ador|acao).{0,25}(image(m|ns)|video))|stable diffusion|dall.?e/,"Geração de imagens/vídeo exige um motor de IA que não está incluído."],
 [/chatbot|chatgpt|assistente.{0,12}(ia|inteligente)|ia que cria|criar.{0,15}outros apps/,"Uma IA generativa ou outro criador de apps exige um motor adicional."],
 [/pagamento|cartao de credito|cobrar.{0,12}pix|integracao.{0,12}pix/,"Pagamentos reais não estão implementados."],
 [/multiusuario|em tempo real|sincroniz|servidor|firebase|supabase|nuvem|rede social/,"Contas remotas, sincronização e recursos multiusuário não estão implementados."],
 [/login|senha|autentic/,"Autenticação não está incluída; não será gerada uma tela que simula segurança."],
 [/camera|microfone|reconhecimento|gps|localizacao|bluetooth|gesto|acessibilidade/,"Esse recurso nativo do aparelho não está implementado neste motor."],
 [/alarme|notifica|lembrete|push|pomodoro|conversor|converter|quiz|jogo|game/,"Esse recurso não está implementado. Agenda local, calculadora e cadastros estão disponíveis."]
 ];
 for(const [re,message] of rules)if(re.test(p))issues.push(message);
 if(spec.category==="generico")issues.push("Não identifiquei um tipo compatível. Escolha uma categoria ou crie um cadastro com campos próprios.");
 return issues;
}
