"""Motor de geração fiel ao script Stable Diffusion 2.1-base solicitado.

O safety checker e o processador CLIP são carregados explicitamente. A política
é de falha segura: sem qualquer um deles, nenhuma imagem pode ser gerada/salva.
"""

from __future__ import annotations

import logging
import os
import threading
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

LOGGER = logging.getLogger("gerador_sd21")
pipeline: Optional[StableDiffusionPipeline] = None
_pipeline_lock = threading.Lock()
_generation_lock = threading.Lock()


class ConteudoBloqueadoError(RuntimeError):
    """Indica que o filtro de segurança bloqueou a imagem gerada."""


def carregar_pipeline() -> StableDiffusionPipeline:
    """Carrega o modelo e conecta explicitamente o filtro de segurança.

    A função segue a mesma política do código enviado: se o safety checker ou
    seu processador não carregarem, a inicialização falha e a execução para.
    """
    LOGGER.info("Dispositivo selecionado: %s", DEVICE)
    LOGGER.info("Precisão numérica: %s", DTYPE)
    if DEVICE.type == "cpu":
        LOGGER.warning(
            "Nenhuma GPU CUDA foi detectada. A geração em CPU pode demorar "
            "bastante e exigir muita memória RAM."
        )

    token = os.environ.get("HF_TOKEN") or None

    LOGGER.info("Carregando o filtro de segurança...")
    safety_checker = StableDiffusionSafetyChecker.from_pretrained(
        SAFETY_CHECKER_ID,
        torch_dtype=DTYPE,
        token=token,
    )
    feature_extractor = CLIPImageProcessor.from_pretrained(
        SAFETY_CHECKER_ID,
        token=token,
    )

    LOGGER.info("Carregando o Stable Diffusion 2.1-base...")
    pipe = StableDiffusionPipeline.from_pretrained(
        MODEL_ID,
        torch_dtype=DTYPE,
        safety_checker=safety_checker,
        feature_extractor=feature_extractor,
        requires_safety_checker=True,
        token=token,
    )

    if pipe.safety_checker is None or pipe.feature_extractor is None:
        raise RuntimeError(
            "O filtro de segurança não foi carregado. Execução cancelada."
        )

    pipe = pipe.to(DEVICE)
    LOGGER.info("Modelo e filtro de segurança carregados com sucesso.")
    return pipe


def inicializar_pipeline() -> StableDiffusionPipeline:
    """Carrega o pipeline uma única vez e o reutiliza em todas as gerações."""
    global pipeline
    if pipeline is not None:
        return pipeline

    with _pipeline_lock:
        if pipeline is None:
            pipeline = carregar_pipeline()
    return pipeline


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
    """Gera uma imagem, verifica o resultado e salva somente se for aprovado."""
    if pipeline is None:
        raise RuntimeError("O pipeline ainda não foi carregado.")

    prompt_limpo = prompt.strip()
    if not prompt_limpo:
        raise ValueError("O prompt não pode estar vazio.")

    caminho_saida = normalizar_nome_png(nome_arquivo)
    LOGGER.info("Gerando imagem para: %r", prompt_limpo)

    # Uma GPU normalmente não comporta duas inferências simultâneas. A trava
    # preserva a memória e impede respostas cruzadas entre usuários.
    with _generation_lock:
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
    LOGGER.info("Imagem salva com sucesso em: %s", caminho_absoluto)
    return caminho_absoluto


def filtro_operacional() -> bool:
    """Confirma que os dois componentes obrigatórios continuam conectados."""
    return bool(
        pipeline is not None
        and pipeline.safety_checker is not None
        and pipeline.feature_extractor is not None
    )
