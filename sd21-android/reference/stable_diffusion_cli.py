"""Gerador interativo de imagens com Stable Diffusion 2.1-base.

O script mantém um filtro de segurança ativo. Como o checkpoint SD 2.1-base
não inclui o safety checker embutido no model_index.json, o verificador padrão
do Stable Diffusion é carregado explicitamente. O programa aborta a execução
se o filtro ou o processador de imagens não puderem ser carregados.
"""

# ================================================================
# Instalação das dependências:
# python -m pip install --upgrade torch diffusers transformers accelerate pillow
#
# Nunca coloque seu token diretamente neste arquivo.
# ================================================================

import sys
from pathlib import Path
from typing import Optional

import torch
from diffusers import StableDiffusionPipeline
from diffusers.pipelines.stable_diffusion import StableDiffusionSafetyChecker
from PIL import Image
from transformers import CLIPImageProcessor


MODEL_ID = "stabilityai/stable-diffusion-2-1-base"
SAFETY_CHECKER_ID = "CompVis/stable-diffusion-safety-checker"
ARQUIVO_PADRAO = "imagem_gerada.png"

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
DTYPE = torch.float16 if DEVICE.type == "cuda" else torch.float32

print(f"Dispositivo selecionado: {DEVICE}")
print(f"Precisão numérica: {DTYPE}")

if DEVICE.type == "cpu":
    print(
        "⚠️ Aviso: nenhuma GPU CUDA foi detectada. A geração em CPU pode "
        "demorar bastante e exigir muita memória RAM."
    )


pipeline: Optional[StableDiffusionPipeline] = None


class ConteudoBloqueadoError(RuntimeError):
    """Indica que o filtro de segurança bloqueou a imagem gerada."""


def carregar_pipeline() -> StableDiffusionPipeline:
    """Carrega o modelo e conecta explicitamente o filtro de segurança."""
    print("\nCarregando o filtro de segurança...")
    safety_checker = StableDiffusionSafetyChecker.from_pretrained(
        SAFETY_CHECKER_ID,
        torch_dtype=DTYPE,
    )
    feature_extractor = CLIPImageProcessor.from_pretrained(SAFETY_CHECKER_ID)

    print("Carregando o Stable Diffusion 2.1-base...")
    pipe = StableDiffusionPipeline.from_pretrained(
        MODEL_ID,
        torch_dtype=DTYPE,
        safety_checker=safety_checker,
        feature_extractor=feature_extractor,
        requires_safety_checker=True,
    )

    if pipe.safety_checker is None or pipe.feature_extractor is None:
        raise RuntimeError(
            "O filtro de segurança não foi carregado. Execução cancelada."
        )

    pipe = pipe.to(DEVICE)
    print("✅ Modelo e filtro de segurança carregados com sucesso.\n")
    return pipe


def normalizar_nome_png(nome_arquivo: str) -> Path:
    """Valida o nome e devolve um caminho terminado exatamente em .png."""
    nome_limpo = nome_arquivo.strip()
    if not nome_limpo:
        raise ValueError("O nome do arquivo não pode estar vazio.")

    caminho = Path(nome_limpo).expanduser()

    if not caminho.name or caminho.name in {".", ".."}:
        raise ValueError("Informe um nome de arquivo válido.")

    if caminho.suffix:
        caminho = caminho.with_suffix(".png")
    else:
        caminho = Path(f"{caminho}.png")

    return caminho


def gerar_imagem(prompt: str, nome_arquivo: str = ARQUIVO_PADRAO) -> Path:
    """Gera uma imagem a partir do prompt e a salva em formato PNG."""
    if pipeline is None:
        raise RuntimeError("O pipeline ainda não foi carregado.")

    prompt_limpo = prompt.strip()
    if not prompt_limpo:
        raise ValueError("O prompt não pode estar vazio.")

    caminho_saida = normalizar_nome_png(nome_arquivo)
    print(f"Gerando imagem para: {prompt_limpo!r}...")

    with torch.no_grad():
        resultado = pipeline(
            prompt=prompt_limpo,
            guidance_scale=7.5,
            num_inference_steps=30,
        )

    deteccoes = resultado.nsfw_content_detected

    if deteccoes is None or len(deteccoes) == 0:
        raise RuntimeError(
            "O filtro de segurança não retornou um resultado válido; "
            "a imagem não será salva."
        )

    if bool(deteccoes[0]):
        raise ConteudoBloqueadoError(
            "O conteúdo foi bloqueado pelo filtro de segurança e não foi salvo."
        )

    if not resultado.images:
        raise RuntimeError("O pipeline não retornou nenhuma imagem.")

    imagem = resultado.images[0]
    if not isinstance(imagem, Image.Image):
        raise RuntimeError("O resultado recebido não é uma imagem PIL válida.")

    caminho_saida.parent.mkdir(parents=True, exist_ok=True)
    imagem.save(caminho_saida, format="PNG")

    caminho_absoluto = caminho_saida.resolve()
    print(f"✅ Imagem salva com sucesso em: {caminho_absoluto}\n")
    return caminho_absoluto


def main() -> int:
    """Carrega o modelo e mantém o gerador em um loop interativo."""
    global pipeline

    print("=== Gerador de Imagens com Stable Diffusion 2.1-base ===")

    try:
        pipeline = carregar_pipeline()
    except KeyboardInterrupt:
        print("\nCarregamento cancelado pelo usuário.")
        return 130
    except Exception as erro:
        print(f"\n❌ Não foi possível carregar o modelo: {erro}")
        print(
            "Se o erro mencionar 401, 403 ou repositório restrito, aceite a "
            "licença do modelo no Hugging Face e execute 'hf auth login'."
        )
        return 1

    while True:
        try:
            texto = input("Digite o prompt (ou 'sair' para encerrar): ").strip()

            if texto.casefold() in {"sair", "exit", "quit"}:
                print("Encerrando o programa...")
                return 0

            if not texto:
                print("⚠️ O prompt não pode estar vazio. Tente novamente.\n")
                continue

            nome = input(
                f"Nome do arquivo de saída [padrão: {ARQUIVO_PADRAO}]: "
            ).strip()
            if not nome:
                nome = ARQUIVO_PADRAO

            gerar_imagem(texto, nome)

        except ConteudoBloqueadoError as erro:
            print(f"⚠️ {erro}\n")
        except ValueError as erro:
            print(f"⚠️ Entrada inválida: {erro}\n")
        except torch.cuda.OutOfMemoryError:
            print(
                "❌ Memória da GPU insuficiente. Feche outros programas ou "
                "use uma GPU com mais VRAM.\n"
            )
            torch.cuda.empty_cache()
        except (EOFError, KeyboardInterrupt):
            print("\nEncerrando o programa...")
            return 0
        except OSError as erro:
            print(f"❌ Erro ao salvar ou acessar o arquivo: {erro}\n")
        except Exception as erro:
            print(f"❌ Falha durante a geração: {erro}\n")


if __name__ == "__main__":
    sys.exit(main())

