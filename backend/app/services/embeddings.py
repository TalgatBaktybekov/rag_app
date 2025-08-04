# Embedding function for Chroma vector store
# You can use OpenAI, Ollama, or any other embedding model supported by LangChain
# Here is a placeholder using OpenAIEmbeddings (replace with your preferred model)

from langchain_community.embeddings import OllamaEmbeddings
from ..core.logging_config import setup_logging

def get_embedding_function():
    import os
    base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")

# Setup logging configuration
    logger = setup_logging()
    logger.info(f"Using OllamaEmbeddings with base URL: {base_url}")

    return OllamaEmbeddings(
        model="mxbai-embed-large",  # Change this
        base_url=base_url
    )
# If you want to use OpenAI:
# from langchain_openai import OpenAIEmbeddings
# def get_embedding_function():
#     return OpenAIEmbeddings()
