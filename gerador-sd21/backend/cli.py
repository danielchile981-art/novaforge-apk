"""Versão interativa de terminal do mesmo motor usado pelo APK."""

import sys

import torch

from sd_engine import (
    ARQUIVO_PADRAO,
    ConteudoBloqueadoError,
    gerar_imagem,
    inicializar_pipeline,
)


def main() -> int:
    print("=== Gerador de Imagens com Stable Diffusion 2.1-base ===")
    try:
        inicializar_pipeline()
    except KeyboardInterrupt:
        print("\nCarregamento cancelado pelo usuário.")
        return 130
    except Exception as erro:
        print(f"\n❌ Não foi possível carregar o modelo: {erro}")
        print(
            "Se o erro mencionar 401, 403 ou repositório restrito, aceite a "
            "licença do modelo no Hugging Face e use a variável HF_TOKEN."
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
            ).strip() or ARQUIVO_PADRAO
            caminho = gerar_imagem(texto, nome)
            print(f"✅ Imagem salva com sucesso em: {caminho}\n")
        except ConteudoBloqueadoError as erro:
            print(f"⚠️ {erro}\n")
        except ValueError as erro:
            print(f"⚠️ Entrada inválida: {erro}\n")
        except torch.cuda.OutOfMemoryError:
            print("❌ Memória da GPU insuficiente.\n")
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
