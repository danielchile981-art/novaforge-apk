# NovaForge Imagens — Stable Diffusion 2.1 no Android

Aplicativo Android de geração local de imagens, preparado para o Galaxy S25 Ultra
(Snapdragon 8 Elite/SM8750). O APK usa uma implementação otimizada do Stable
Diffusion 2.1 para a NPU Qualcomm e mantém o filtro de segurança obrigatório.

## O que esta versão entrega

- geração real de imagens no aparelho, sem servidor externo;
- Stable Diffusion 2.1 otimizado para NPU Qualcomm;
- prompts, prompt negativo, semente, CFG e número de etapas;
- geração a partir de texto e recursos de imagem para imagem;
- salvamento na galeria;
- interface em português do Brasil;
- ícone e nome próprios: **NovaForge Imagens**;
- filtro NSFW embutido e obrigatório nesta compilação;
- sem token, API paga, assinatura ou limite diário.

## Como baixar o APK no GitHub

1. Abra a aba **Actions** do repositório.
2. Abra a execução **Gerar APK - NovaForge Imagens SD 2.1**.
3. No final da página, toque em **NovaForge-Imagens-SD21-APK**.
4. Extraia o ZIP e instale `NovaForge-Imagens-SD21.apk`.

O GitHub exige login para baixar artefatos de Actions. Cada artefato fica disponível
por 90 dias. O arquivo `.sha256` permite conferir se o APK foi baixado sem alterações.

## Primeira utilização

1. Abra o app e leia o aviso inicial.
2. Entre em **Modelos disponíveis**.
3. Na seção de modelos NPU, escolha **Stable Diffusion 2.1**.
4. Toque em **Baixar** e mantenha o app aberto até terminar.
5. O download ocupa aproximadamente 1,3 GB; reserve pelo menos 3 GB livres para o
   modelo, cache e imagens.
6. Selecione o modelo, escreva o prompt e toque em **Gerar imagem**.

Depois que o modelo for baixado, a geração não usa créditos nem cobra por imagem. O
celular pode aquecer e consumir bastante bateria durante a geração; isso é esperado.

## Por que o script Python foi adaptado

O código em `reference/stable_diffusion_cli.py` usa PyTorch, Diffusers e CUDA. Essas
dependências de desktop não podem ser simplesmente empacotadas em um APK. Esta versão
usa o mesmo tipo de pipeline de difusão em formato otimizado MNN/QNN, adequado ao
processador Snapdragon. O filtro também foi convertido para execução local no Android.

## Build reproduzível

O workflow fixa o código-base no tag `v2.0.0`, baixa somente o APK oficial com filtro,
confere o SHA-256 conhecido, extrai as bibliotecas nativas necessárias, aplica a
tradução e a identidade NovaForge e compila exclusivamente o flavor `filterDebug`.
O flavor sem filtro é removido antes da compilação.

Arquivos principais:

- `.github/workflows/build-sd21-apk.yml`: automação que gera o APK;
- `scripts/build_apk.sh`: montagem e compilação reproduzível;
- `scripts/prepare_android.sh`: aplicação segura das adaptações;
- `overrides/`: idioma e identidade visual;
- `reference/stable_diffusion_cli.py`: script Python original de referência.

## Compatibilidade

- Android 9 ou mais recente;
- arquitetura ARM64;
- Stable Diffusion 2.1 nesta versão: NPU Qualcomm compatível;
- alvo principal validado pelo projeto-base: Snapdragon 8 Elite, presente no Galaxy
  S25 Ultra em mercados que usam esse processador.

## Licenças e atribuição

Este é um trabalho derivado não comercial do projeto Local Dream v2.0.0. Leia
`NOTICE.md` antes de redistribuir ou publicar o aplicativo.

