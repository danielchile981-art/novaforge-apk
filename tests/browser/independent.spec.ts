import {test,expect,type Page} from "@playwright/test";
import {CATEGORIES} from "../../src/lib/novaforge/spec";
async function open(page:Page,category:string){
 await page.goto("/samples/"+category+"/www/");
 await expect(page.locator("#app .page")).toBeVisible();
 await expect(page.locator("#brand-splash")).toHaveCount(0);
}
async function go(page:Page,...route:string[]){
 await page.evaluate(args=>(window as any).NF.go(...args),route);
 await expect.poll(()=>page.evaluate(()=>location.hash)).toBe("#/"+route.join("/"));
}
async function rows(page:Page,key:string){return page.evaluate(k=>(window as any).NF.store.all(k),key);}
for(const c of CATEGORIES)test(c.id+": abre offline e acessa ajustes",async({page,context})=>{
 const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
 await open(page,c.id);await context.setOffline(true);
 await page.locator(".tabbar").getByRole("button",{name:"Ajustes",exact:true}).click();
 await expect(page.getByRole("button",{name:"Exportar dados (JSON)",exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 expect(errors).toEqual([]);
});
test("tarefas: criar, persistir, concluir, buscar e excluir",async({page})=>{
 await open(page,"tarefas");await go(page,"form","tasks");
 await page.locator('[name="title"]').fill("Comprar pão");
 await page.getByRole("button",{name:"Salvar",exact:true}).click();
 await expect.poll(async()=> (await rows(page,"tasks")).length).toBe(1);
 await page.reload();await expect(page.getByText("Comprar pão",{exact:true})).toBeVisible();
 await page.getByRole("button",{name:/Comprar pão/}).click();
 await page.getByRole("button",{name:"Editar",exact:true}).click();
 await page.locator('[name="done"]').check();
 await page.getByRole("button",{name:"Salvar",exact:true}).click();
 await go(page,"home");
 await expect(page.locator(".kpi-val").first()).toHaveText("0");
 await go(page,"tasks");await page.getByPlaceholder("Buscar").fill("inexistente");
 await expect(page.locator(".rows .row")).toHaveCount(0);
 await page.getByPlaceholder("Buscar").fill("pão");
 await page.getByRole("button",{name:/Comprar pão/}).click();
 page.once("dialog",d=>d.accept());await page.getByRole("button",{name:"Excluir",exact:true}).click();
 await expect.poll(async()=> (await rows(page,"tasks")).length).toBe(0);
});
test("vendas: estoque e lucro, edição, reversão e rejeição sem perder dados",async({page})=>{
 await open(page,"vendas-estoque");await go(page,"form","products");
 for(const [key,value] of Object.entries({name:"Café",costPrice:"4",salePrice:"10",stock:"10"}))await page.locator('[name="'+key+'"]').fill(value);
 await page.getByRole("button",{name:"Salvar",exact:true}).click();
 await expect.poll(async()=> (await rows(page,"products")).length).toBe(1);
 const product=(await rows(page,"products"))[0];
 await go(page,"form","sales");
 await page.locator('[name="productId"]').selectOption(product.id);
 await page.locator('[name="qty"]').fill("3");await page.locator('[name="unitPrice"]').fill("10");
 await page.getByRole("button",{name:"Salvar",exact:true}).click();
 await expect.poll(async()=> (await rows(page,"sales")).length).toBe(1);
 expect(Number((await rows(page,"products"))[0].stock)).toBe(7);
 const sale=(await rows(page,"sales"))[0];expect(sale.profit).toBe(18);
 await go(page,"form","sales",sale.id);await page.locator('[name="qty"]').fill("5");
 await page.getByRole("button",{name:"Salvar",exact:true}).click();
 await expect.poll(async()=>Number((await rows(page,"products"))[0].stock)).toBe(5);
 await go(page,"form","sales",sale.id);await page.locator('[name="qty"]').fill("50");
 await page.getByRole("button",{name:"Salvar",exact:true}).click();
 await expect(page.locator("#nf-toast")).toContainText("Estoque insuficiente");
 expect(Number((await rows(page,"products"))[0].stock)).toBe(5);
 expect(Number((await rows(page,"sales"))[0].qty)).toBe(5);
 await go(page,"detail","sales",sale.id);
 page.once("dialog",d=>d.accept());await page.getByRole("button",{name:"Excluir",exact:true}).click();
 await expect.poll(async()=>Number((await rows(page,"products"))[0].stock)).toBe(10);
 await page.reload();expect((await rows(page,"sales")).length).toBe(0);
});
test("finanças: saldo, backup e isolamento entre apps",async({page})=>{
 await open(page,"financas");
 for(const [kind,amount] of [["Receita","1000"],["Despesa","250"]]){
  await go(page,"form","tx");
  await page.locator('[name="title"]').fill(kind);await page.locator('[name="kind"]').selectOption(kind);await page.locator('[name="amount"]').fill(amount);
  await page.getByRole("button",{name:"Salvar",exact:true}).click();
  await expect(page.locator("#nf-form")).toHaveCount(0);
 }
 await go(page,"home");await expect(page.locator(".kpi").filter({hasText:"Saldo"})).toContainText("750,00");
 await go(page,"settings");const downloadPromise=page.waitForEvent("download");
 await page.getByRole("button",{name:"Exportar dados (JSON)",exact:true}).click();
 const download=await downloadPromise;expect(download.suggestedFilename()).toMatch(/\.json$/);
 const stream=await download.createReadStream();const chunks:Buffer[]=[];for await(const chunk of stream!)chunks.push(chunk);const backup=Buffer.concat(chunks);
 page.once("dialog",d=>d.accept());await page.getByRole("button",{name:"Apagar dados deste app",exact:true}).click();
 expect((await rows(page,"tx")).length).toBe(0);
 page.once("dialog",d=>d.accept());await page.locator("#nf-import").setInputFiles({name:"backup.json",mimeType:"application/json",buffer:backup});
 await expect.poll(async()=> (await rows(page,"tx")).length).toBe(2);
 await page.reload();await expect(page.locator("#app .page")).toBeVisible();expect((await rows(page,"tx")).length).toBe(2);
 await open(page,"tarefas");expect((await rows(page,"tasks")).length).toBe(0);expect((await rows(page,"tx")).length).toBe(0);
});
test("agenda: dezembro avança para janeiro e retorna",async({page})=>{
 await open(page,"agenda");await go(page,"home","2026-12-01");
 await expect(page.locator(".cal-h")).toContainText("dezembro de 2026");
 await page.getByRole("button",{name:"Próximo mês",exact:true}).click();await expect(page.locator(".cal-h")).toContainText("janeiro de 2027");
 await page.getByRole("button",{name:"Mês anterior",exact:true}).click();await expect(page.locator(".cal-h")).toContainText("dezembro de 2026");
});
test("calculadora: operações consecutivas e histórico persistente",async({page})=>{
 await open(page,"calculadora");
 for(const key of ["2","+","3","=","*","2","="])await page.getByRole("button",{name:key,exact:true}).click();
 await expect(page.locator(".calc-screen strong")).toHaveText("10");
 expect((await rows(page,"history")).length).toBe(2);await page.reload();
 await expect(page.locator("#app .page")).toBeVisible();expect((await rows(page,"history")).length).toBe(2);
});
test("criador: limites claros, prévia persistente, nome, capa, campo e ZIP",async({page})=>{
 await page.goto("/");await expect(page.locator(".splash")).toHaveCount(0);
 await page.getByRole("button",{name:"Criar aplicativo",exact:true}).click();
 await page.getByLabel("Descrição do aplicativo").fill("Crie um gerador de imagens por inteligência artificial");
 await expect(page.getByRole("alert")).toBeVisible();await expect(page.getByRole("button",{name:"Forjar aplicativo",exact:true})).toBeDisabled();
 await page.getByLabel("Descrição do aplicativo").fill('Lista de tarefas chamada "Meu Dia"');
 await page.getByRole("button",{name:"Forjar aplicativo",exact:true}).click();
 const frame=page.frameLocator("iframe");await expect(frame.locator("#app .page")).toBeVisible();
 await frame.locator('.actions [data-to="form/tasks"]').click();await frame.locator('[name="title"]').fill("Teste de persistência");
 await frame.getByRole("button",{name:"Salvar",exact:true}).click();await expect(frame.getByText("Teste de persistência",{exact:true})).toBeVisible();
 await page.getByRole("button",{name:"Personalizar",exact:true}).click();
 await page.getByLabel("Nome do aplicativo",{exact:true}).fill("Meu Dia Livre");
 await page.getByRole("button",{name:"Cor #2563eb",exact:true}).click();
 await page.getByLabel("Novo campo",{exact:true}).fill("Local");await page.getByRole("button",{name:"Adicionar campo",exact:true}).click();
 await page.getByRole("button",{name:"Aplicar personalização",exact:true}).click();
 await expect(page.getByAltText("Capa de Meu Dia Livre")).toBeVisible();
 await page.getByRole("button",{name:"Prévia",exact:true}).click();
 await expect(frame.getByText("Teste de persistência",{exact:true})).toBeVisible();
 await page.getByRole("button",{name:"APK",exact:true}).click();
 const pending=page.waitForEvent("download");await page.getByRole("button",{name:"Baixar ZIP",exact:true}).click();
 expect((await pending).suggestedFilename()).toBe("meu-dia-livre.zip");
 await page.screenshot({path:"test-results/novaforge-livre-export.png",fullPage:true});
});
