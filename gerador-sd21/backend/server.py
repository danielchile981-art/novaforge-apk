"""API HTTP usada pelo aplicativo Android Gerador SD 2.1."""

from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path
from urllib.parse import quote

import torch
from fastapi import FastAPI, HTTPException
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import Response
from pydantic import BaseModel, Field, field_validator

from sd_engine import (
    ConteudoBloqueadoError,
    DEVICE,
    DTYPE,
    MODEL_ID,
    filtro_operacional,
    gerar_imagem,
    inicializar_pipeline,
    normalizar_nome_png,
)


logging.basicConfig(
    level=os.environ.get("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s | %(levelname)s | %(message)s",
)
LOGGER = logging.getLogger("gerador_sd21.api")
OUTPUT_DIR = Path(os.environ.get("OUTPUT_DIR", "outputs")).resolve()


class GenerationRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=1000)
    filename: str = Field(default="imagem_gerada.png", min_length=1, max_length=180)

    @field_validator("prompt", "filename")
    @classmethod
    def reject_blank(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("O campo não pode estar vazio.")
        return cleaned


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Se o modelo ou o filtro falhar, a inicialização do servidor é abortada.
    # Isso impede que a API fique disponível em um estado inseguro.
    await run_in_threadpool(inicializar_pipeline)
    if not filtro_operacional():
        raise RuntimeError("Filtro de segurança ausente. Servidor cancelado.")
    yield


app = FastAPI(
    title="Gerador SD 2.1",
    description="Stable Diffusion 2.1-base com safety checker obrigatório.",
    version="1.0.0",
    lifespan=lifespan,
)


@app.get("/")
def root() -> dict[str, str]:
    return {
        "name": "Gerador SD 2.1",
        "status": "ready" if filtro_operacional() else "unavailable",
        "documentation": "/docs",
    }


@app.get("/health")
def health() -> dict[str, str | bool]:
    safe = filtro_operacional()
    if not safe:
        raise HTTPException(
            status_code=503,
            detail="O modelo ou o filtro de segurança não está operacional.",
        )
    return {
        "status": "ready",
        "model_id": MODEL_ID,
        "safety_checker": True,
        "device": DEVICE.type,
        "dtype": str(DTYPE).replace("torch.", ""),
    }


@app.post("/generate", response_class=Response)
async def generate(request: GenerationRequest) -> Response:
    if not filtro_operacional():
        raise HTTPException(
            status_code=503,
            detail="O filtro de segurança não está operacional; geração cancelada.",
        )

    # A API aceita somente o nome final, nunca caminhos enviados pelo cliente.
    # Os arquivos ficam presos à pasta OUTPUT_DIR do servidor.
    raw_name = Path(request.filename.replace("\\", "/")).name
    try:
        safe_name = normalizar_nome_png(raw_name).name
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error

    output_path = OUTPUT_DIR / safe_name
    try:
        generated_path = await run_in_threadpool(
            gerar_imagem,
            request.prompt,
            str(output_path),
        )
        png_bytes = generated_path.read_bytes()
    except ConteudoBloqueadoError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except torch.cuda.OutOfMemoryError as error:
        torch.cuda.empty_cache()
        raise HTTPException(
            status_code=503,
            detail="Memória da GPU insuficiente para gerar a imagem.",
        ) from error
    except (OSError, RuntimeError, ValueError) as error:
        LOGGER.exception("Falha segura durante a geração")
        raise HTTPException(status_code=500, detail=str(error)) from error

    if not png_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
        generated_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=500,
            detail="O resultado não é um PNG válido; arquivo descartado.",
        )

    return Response(
        content=png_bytes,
        media_type="image/png",
        headers={
            "Cache-Control": "no-store",
            "X-Output-Filename": quote(safe_name),
            "Content-Disposition": f"attachment; filename*=UTF-8''{quote(safe_name)}",
        },
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=False)
