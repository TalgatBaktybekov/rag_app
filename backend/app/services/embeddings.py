# Embedding function for Chroma vector store
# You can use OpenAI, Ollama, or any other embedding model supported by LangChain
# Here is a placeholder using OpenAIEmbeddings (replace with your preferred model)

from langchain_community.embeddings import OllamaEmbeddings

def get_embedding_function():
    # For Ollama local embeddings (make sure Ollama is running and supports embedding)
    return OllamaEmbeddings(model="nomic-embed-text")

# If you want to use OpenAI:
# from langchain_openai import OpenAIEmbeddings
# def get_embedding_function():
#     return OpenAIEmbeddings()
