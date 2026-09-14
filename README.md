# NovaForge Livre 3.0

Construtor local de aplicativos Android independentes, com nome, ícone adaptativo, capa, prévia funcional, dados locais e exportação ZIP/APK.

Esta edição está na branch novaforge-independent. O original NovaForge Studio 2.0, a unificação e os backups anteriores permanecem preservados.

## Qual arquivo baixar

**NovaForge-Livre-3.0.0.apk** é o criador. Abra Criar, escolha um modelo ou descreva uma função disponível, personalize o projeto e abra APK.

Dia-Certo.apk (tarefas), Estoque-Livre.apk (produtos e vendas) e Bolso-Claro.apk (finanças) são exemplos instaláveis independentes. Cada pacote mantém seus próprios dados e pode funcionar sem o criador.

## Funções disponíveis

15 modelos: vendas e estoque, vendas, estoque, finanças, orçamento, tarefas, hábitos, catálogo, agenda, delivery local, formulário, calculadora, produtividade, clientes e notas. Os modelos oferecem cadastros e funções locais conforme a categoria; não são integrações de serviço. Personalizar permite alterar nome, cor, tema, ícone, rótulos, campos e coleções.

O motor interpreta descrições por regras locais. Não é um modelo de linguagem nem um gerador de imagens. Solicitações incompatíveis são explicadas antes de criar. Não existem autenticação remota, pagamentos, servidor multiusuário, GPS ou notificações agendadas nesta edição.

## APK e custos

Criar, testar, exportar ZIP e usar os apps não exige token nem API paga. Para compilar automaticamente, use GitHub e um token autorizado para o repositório e seus workflows. O token fica somente na sessão atual, não no backup. Repositórios de projetos são separados por identificador e o criador se recusa a sobrescrever um repositório diferente.

O GitHub Actions precisa de internet e usa as cotas da conta. O NovaForge não ativa pagamentos. Também é possível compilar o ZIP em computador com Node 24, Java 21 e Android SDK. O aplicativo instalado funciona offline, sem NovaForge ou Termux. Não prometemos que as ferramentas Android de desktop funcionem diretamente no Termux.

## Dados, backup e assinatura

Dados locais por pacote. Em Ajustes nos apps exportados, exporte ou restaure JSON. Em Configurações no criador, exporte ou restaure o backup geral. ZIPs podem ser reimportados como cópias novas. Desinstalar ou limpar o armazenamento pode apagar dados; faça backup antes.

APKs de teste assinados. A chave padrão pode variar entre compilações. Para instalar atualizações sobre a versão anterior preservando dados, configure uma chave fixa nos secrets NF_KEYSTORE_BASE64, NF_STORE_PASSWORD, NF_KEY_ALIAS e NF_KEY_PASSWORD do repositório gerado. Nunca publique a chave privada.

## Desenvolvimento e validação

Node 24:

    npm install
    npm test
    npx playwright install --with-deps chromium
    npm run test:browser
    npm run android:sync
    cd android
    ./gradlew assembleDebug

O workflow NovaForge Livre compila o criador e três exemplos. Antes de publicar, verifica geração, recuperação de dados, 15 categorias no navegador móvel, fluxos reais de tarefas/vendas/finanças/agenda/calculadora/personalização e instalação/salvamento/reabertura dos exemplos em emulador Android. Os exemplos não pedem permissão INTERNET. Relatórios ficam nos artefatos do workflow.

O sucesso do emulador não comprova compatibilidade com todos os aparelhos físicos. Os APKs desta edição não são uma publicação certificada pela Play Store.
