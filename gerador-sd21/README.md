# Gerador SD 2.1

Aplicativo Android criado a partir do código solicitado, sem trocar o modelo por
outro projeto. O motor Python usa exatamente:

- `stabilityai/stable-diffusion-2-1-base`;
- `CompVis/stable-diffusion-safety-checker` carregado explicitamente;
- `CLIPImageProcessor` conectado ao pipeline;
- CUDA + `float16` quando disponível e CPU + `float32` como alternativa;
- `torch.no_grad()`, `guidance_scale=7.5` e 30 passos;
- bloqueio e descarte da imagem quando o filtro falha ou detecta conteúdo NSFW;
- saída PNG com validação de prompt e nome do arquivo.

## O que existe no repositório

| Parte | Função |
|---|---|
| `backend/sd_engine.py` | Pipeline Stable Diffusion e safety checker |
| `backend/server.py` | Liga o código Python ao APK por HTTP |
| `backend/cli.py` | Mantém também o loop interativo de terminal |
| `android/` | Aplicativo nativo com prompt, nome, geração e galeria |
| `colab/Gerador_SD21_Colab.ipynb` | Inicia gratuitamente o servidor pelo celular |
| workflow do GitHub | Compila e disponibiliza `Gerador-SD21.apk` |

## Por que o projeto tem APK e servidor Python

PyTorch/Diffusers e CUDA são bibliotecas de computador/servidor e não podem ser
empacotadas diretamente como um aplicativo Android comum. Para manter o código e
o modelo exatos, o APK funciona como a tela do gerador e o motor roda em Python.
O aplicativo se recusa a gerar se `/health` não confirmar o modelo exato e o
safety checker ativo.

Isso é diferente de substituir o código por um modelo móvel convertido. Nenhum
modelo ou verificador foi trocado nesta versão.

## Baixar o APK

1. Abra **Actions** no GitHub.
2. Entre em **Gerar APK - Gerador SD 2.1 Exato**.
3. Abra a execução verde mais recente.
4. Em **Artifacts**, baixe **Gerador-SD21-APK**.
5. Extraia o ZIP e instale `Gerador-SD21.apk`.

O APK é de teste e vem assinado automaticamente pelo Android Gradle Plugin. O
arquivo `.sha256` permite conferir a integridade do download.

## Usar pelo celular com Google Colab

1. Abra `colab/Gerador_SD21_Colab.ipynb` no Google Colab.
2. Em **Ambiente de execução**, selecione GPU quando ela estiver disponível.
3. Toque em **Executar tudo**.
4. Aguarde o download e o carregamento do modelo e do filtro.
5. Copie o endereço terminado em `trycloudflare.com` mostrado pelo notebook.
6. Cole esse endereço no primeiro campo do APK e toque em **Testar conexão**.
7. Digite o prompt, escolha o nome e toque em **Gerar imagem**.

Se o Hugging Face responder 401/403, aceite os termos do modelo e execute a célula
opcional de login. Nunca salve o token no código ou no GitHub.

## Rodar em computador/servidor próprio

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8000
```

Para usar apenas o programa de terminal:

```bash
python cli.py
```

## Custos e limites reais

O código, o APK e os modelos não cobram por imagem e não impõem limite diário.
Entretanto, uma sessão gratuita do Google Colab pode encerrar, limitar a GPU ou
ficar temporariamente sem acelerador. Um computador/servidor próprio não tem esse
limite externo, mas precisa de memória e energia para executar o modelo.

O primeiro carregamento baixa vários gigabytes. Em CPU, cada imagem pode demorar
bastante. O APK precisa permanecer conectado ao servidor durante a geração.

## Segurança

- O servidor não inicia se o safety checker ou o processador CLIP falharem.
- A imagem só é devolvida depois que `nsfw_content_detected` retorna resultado
  válido e negativo.
- Conteúdo bloqueado nunca é salvo nem enviado ao telefone.
- Tokens do Hugging Face devem ser passados apenas pela variável `HF_TOKEN`.
- A URL temporária do Colab deixa de funcionar quando a sessão termina.

O safety checker reduz riscos, mas nenhum classificador automático é perfeito.
