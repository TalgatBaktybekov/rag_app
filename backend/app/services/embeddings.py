# Embedding function for Chroma vector store
# Using BAAI/bge-large-en-v1.5 via sentence_transformers for high-quality embeddings

from langchain_community.embeddings import HuggingFaceEmbeddings
from ..core.logging_config import setup_logging

def get_embedding_function():
    """
    Returns the embedding function using BAAI/bge-large-en-v1.5 model.
    This model provides high-quality embeddings for English text.
    """
    import os
    
    # Setup logging configuration
    logger = setup_logging()
    logger.info("Initializing BAAI/bge-large-en-v1.5 embeddings model")
    
    # Model configuration
    model_name = "BAAI/bge-large-en-v1.5"
    
    # Check for GPU availability and environment preference
    device = 'cpu'
    if os.getenv("USE_GPU", "false").lower() == "true":
        try:
            import torch
            if torch.backends.mps.is_available():
                device = 'mps'
                logger.info("Apple Silicon GPU (MPS) detected and enabled for embeddings")
            elif torch.cuda.is_available():
                device = 'cuda'
                logger.info("CUDA GPU detected and enabled for embeddings")
            else:
                logger.warning("GPU requested but not available, using CPU")
        except ImportError:
            logger.warning("PyTorch not properly installed, using CPU")
    
    model_kwargs = {
        'device': device,
        'trust_remote_code': True
    }
    encode_kwargs = {
        'normalize_embeddings': True  # Normalize embeddings for better similarity search
    }
    
    logger.info(f"Using HuggingFace embeddings with model: {model_name} on device: {device}")
    
    return HuggingFaceEmbeddings(
        model_name=model_name,
        model_kwargs=model_kwargs,
        encode_kwargs=encode_kwargs
    )
