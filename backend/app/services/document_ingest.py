import os
import shutil
import logging
import time
from pathlib import Path
from typing import List, Optional
from langchain_community.vectorstores import Chroma
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from sqlalchemy.orm import Session
from ..services.embeddings import get_embedding_function
from ..db import crud, models

# Setup logger
logger = logging.getLogger(__name__)

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../data'))
USER_DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../data/user_documents'))
CHROMA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../embeddings/chroma_db'))

# Ensure the user documents directory exists
os.makedirs(USER_DATA_DIR, exist_ok=True)

def reset_chroma_db():
    """
    Reset the Chroma vector database by removing and recreating the directory.
    Use this function when Chroma DB schema errors occur.
    """
    logger.warning(f"Resetting Chroma database at {CHROMA_DIR}")
    
    # Create backup
    if os.path.exists(CHROMA_DIR):
        backup_dir = f"{CHROMA_DIR}_backup_{int(time.time())}"
        logger.info(f"Creating backup at {backup_dir}")
        try:
            shutil.copytree(CHROMA_DIR, backup_dir)
            logger.info("Backup created successfully")
        except Exception as e:
            logger.error(f"Failed to create backup: {str(e)}")
    
    # Remove existing database
    try:
        if os.path.exists(CHROMA_DIR):
            shutil.rmtree(CHROMA_DIR)
            logger.info("Removed existing Chroma database")
    except Exception as e:
        logger.error(f"Failed to remove existing database: {str(e)}")
    
    # Will be recreated when needed
    logger.info("Chroma database will be recreated on next access")
    
    return {"status": "success", "message": "Chroma database reset. You need to re-ingest your documents."}

# 1. Load and parse all PDFs
def load_documents_from_pdfs(file_paths=None):
    """Load documents from specified PDFs or all PDFs in the data directory"""
    docs = []
    
    # If specific file paths are provided, load those
    if file_paths:
        for path in file_paths:
            if os.path.exists(path) and path.lower().endswith('.pdf'):
                try:
                    loader = PyPDFLoader(path)
                    loaded_docs = loader.load()
                    # Add document source metadata with enhanced information
                    filename = os.path.basename(path)
                    for doc in loaded_docs:
                        doc.metadata['source'] = filename
                        doc.metadata['source_path'] = path
                        # Ensure page numbers are zero-based for consistent handling
                        if 'page' not in doc.metadata:
                            doc.metadata['page'] = 0
                    docs.extend(loaded_docs)
                    logger.info(f"Loaded {len(loaded_docs)} pages from {filename}")
                except Exception as e:
                    logger.error(f"Error loading {path}: {e}")
    # Otherwise load all from data directory
    else:
        for fname in os.listdir(DATA_DIR):
            if fname.lower().endswith('.pdf'):
                file_path = os.path.join(DATA_DIR, fname)
                try:
                    loader = PyPDFLoader(file_path)
                    loaded_docs = loader.load()
                    # Add document source metadata
                    for doc in loaded_docs:
                        doc.metadata['source'] = fname
                        doc.metadata['source_path'] = file_path
                        # Ensure page numbers are zero-based for consistent handling
                        if 'page' not in doc.metadata:
                            doc.metadata['page'] = 0
                    docs.extend(loaded_docs)
                    logger.info(f"Loaded {len(loaded_docs)} pages from {fname}")
                except Exception as e:
                    logger.error(f"Error loading {file_path}: {e}")
    
    return docs

# 2. Chunk and clean text
def chunk_documents(docs, chunk_size=500, chunk_overlap=150):
    """
    Split documents into chunks with improved parameters for better context retention
    
    - Larger chunk_size (1500) captures more context in each chunk - increased from 1000
    - Higher overlap (250) helps maintain context between chunks - increased from 200
    - Using RecursiveCharacterTextSplitter which splits on multiple delimiters
      with careful ordering to preserve semantic meaning
    """
    
    if not docs:
        logger.warning("No documents provided for chunking")
        return []
    
    # Log document content for debugging
    for i, doc in enumerate(docs):
        content_length = len(doc.page_content) if doc.page_content else 0
        logger.info(f"Document {i}: content length = {content_length} chars")
        if content_length > 0:
            preview = doc.page_content[:200].replace('\n', ' ')
            logger.info(f"Document {i} preview: {preview}...")
        else:
            logger.warning(f"Document {i} has empty content!")
    
    # Define splitter with carefully ordered separators
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size, 
        chunk_overlap=chunk_overlap,
        separators=[
            "\n\n\n",      # Triple line break (major section)
            "\n\n",        # Double line break (paragraph)
            "\n",          # Single line break (within paragraph)
            ". ",          # Sentence end
            ", ",          # Clause 
            " ",           # Word
            ""             # Character
        ]
    )
    
    chunks = splitter.split_documents(docs)
    logger.info(f"Split {len(docs)} documents into {len(chunks)} chunks with size={chunk_size}, overlap={chunk_overlap}")
    
    # Log chunk details
    if chunks:
        for i, chunk in enumerate(chunks[:3]):  # Log first 3 chunks
            logger.info(f"Chunk {i}: length = {len(chunk.page_content)} chars, metadata = {chunk.metadata}")
    else:
        logger.warning("No chunks were created from the documents!")
    
    return chunks

# 3. Ingest specific documents into Chroma vector store
def ingest_documents(file_paths=None, append=False):
    docs = load_documents_from_pdfs(file_paths)
    
    chunks = chunk_documents(docs)
    
    embedding_fn = get_embedding_function()
    
    # If appending to existing store and it exists
    if append and os.path.exists(CHROMA_DIR):
        vectordb = Chroma(
            persist_directory=CHROMA_DIR,
            embedding_function=embedding_fn
        )
        vectordb.add_documents(documents=chunks)
    else:
        # Create new vector store
        vectordb = Chroma.from_documents(
            documents=chunks,
            embedding=embedding_fn,
            persist_directory=CHROMA_DIR
        )
    
    vectordb.persist()
    return vectordb

# 4. Ingest user documents
def ingest_user_document(db: Session, document_id: int):
    """Ingest a specific user document by ID"""
    document = crud.get_document(db, document_id)
    if not document:
        return False
    
    try:
        # Load and process the document
        docs = load_documents_from_pdfs([document.file_path])
        if not docs:
            return False
        
        # Add user_id and document_id to metadata
        for doc in docs:
            doc.metadata['user_id'] = document.user_id
            doc.metadata['document_id'] = document.document_id
        
        # Chunk documents
        chunks = chunk_documents(docs)
        if not chunks:
            return False
        
        # Get embedding function
        embedding_fn = get_embedding_function()
        
        # Add to vector store
        vectordb = Chroma(
            persist_directory=CHROMA_DIR,
            embedding_function=embedding_fn
        )
        vectordb.add_documents(documents=chunks)
        vectordb.persist()
        
        # Update document status
        crud.update_document(db, document_id, ingested=True)
        return True
    except Exception as e:
        print(f"Error ingesting document {document_id}: {e}")
        return False

# 5. Retrieve relevant chunks for a query with document filtering
def retrieve_relevant_chunks(query, k=5, user_id=None, document_ids=None, use_mmr=True, fetch_k=20, search_type="advanced_ensemble"):
    """
    Retrieve relevant chunks based on query with intelligent search strategies
    
    Args:
        query: The search query
        k: Number of chunks to retrieve (final results)
        user_id: Filter by user_id
        document_ids: Filter by specific document IDs
        use_mmr: Whether to use Maximal Marginal Relevance for diversity
        fetch_k: Number of chunks to initially fetch before MMR
        search_type: Search strategy ('mmr', 'similarity', 'ensemble', 'advanced_ensemble')
    """
    logger = logging.getLogger(__name__)
    
    # Initialize vector store
    embedding_fn = get_embedding_function()
    vectordb = Chroma(persist_directory=CHROMA_DIR, embedding_function=embedding_fn)
    
    
    # Build metadata filter
    filter_dict = _build_metadata_filter(document_ids, user_id)
    
    logger.info(f"Retrieving {k} chunks for query: '{query[:100]}...', search_type: {search_type}")
    
    try:
        # Execute search based on strategy
        if search_type == "advanced_ensemble":
            results = _advanced_ensemble_search(vectordb, query, k, fetch_k, filter_dict)
        elif search_type == "ensemble":
            results = _ensemble_search(vectordb, query, k, fetch_k, filter_dict)
        elif search_type == "mmr" and use_mmr:
            results = vectordb.max_marginal_relevance_search(
                query, k=k, fetch_k=fetch_k, lambda_mult=0.8, filter=filter_dict)
        else:
            results = vectordb.similarity_search(query, k=k, filter=filter_dict)
        
        _log_search_results(results, logger)
        return results
        
    except Exception as e:
        logger.error(f"Error in vector search: {str(e)}")
        return []


def _build_metadata_filter(document_ids, user_id):
    """Build metadata filter for vector search"""
    if document_ids:
        doc_ids = [int(doc_id) for doc_id in document_ids]
        return {"document_id": {"$in": doc_ids}}
    elif user_id:
        return {"user_id": user_id}
    return None


def _advanced_ensemble_search(vectordb, query, k, fetch_k, filter_dict):
    """Advanced ensemble search combining multiple strategies with intelligent ranking"""
    logger = logging.getLogger(__name__)
    
    # Get results from multiple strategies
    mmr_results = vectordb.max_marginal_relevance_search(
        query, k=k, fetch_k=fetch_k, lambda_mult=0.8, filter=filter_dict)
    
    similarity_results = vectordb.similarity_search(query, k=k, filter=filter_dict)
    

    # Combine and deduplicate results with intelligent ranking
    return _combine_and_rank_results([mmr_results, similarity_results], k)


def _ensemble_search(vectordb, query, k, fetch_k, filter_dict):
    """Standard ensemble search combining MMR and similarity"""
    mmr_results = vectordb.max_marginal_relevance_search(
        query, k=k, fetch_k=fetch_k, lambda_mult=0.7, filter=filter_dict)
    
    similarity_results = vectordb.similarity_search(query, k=k, filter=filter_dict)
    
    return _deduplicate_results(mmr_results + similarity_results, k)


def _combine_and_rank_results(result_lists, k, boost_important_sections=False):
    """Combine multiple result lists with intelligent ranking and deduplication"""
    all_results = []
    for results in result_lists:
        all_results.extend(results)
    
    # Deduplicate and apply boosting
    seen_content = set()
    final_results = []
    boosted_results = []
    
    for result in all_results:
        content_id = result.page_content[:50]
        if content_id not in seen_content:
            seen_content.add(content_id)
            
            # Boost important sections for conclusion queries
            if boost_important_sections and result.metadata.get("contains_important_section", False):
                boosted_results.insert(0, result)  # Priority placement
            else:
                final_results.append(result)
    
    # Combine boosted and regular results
    return (boosted_results + final_results)[:k]


def _deduplicate_results(results, k):
    """Simple deduplication based on content"""
    seen_content = set()
    unique_results = []
    
    for result in results:
        content_id = result.page_content[:50]
        if content_id not in seen_content and len(unique_results) < k:
            seen_content.add(content_id)
            unique_results.append(result)
    
    return unique_results


def _log_search_results(results, logger):
    """Log search results for debugging"""
    if not results:
        logger.info("No results found")
        return
        
    logger.info(f"Retrieved {len(results)} chunks")
    
    # Log document sources
    doc_ids = [chunk.metadata.get('document_id') for chunk in results if 'document_id' in chunk.metadata]
    sources = [chunk.metadata.get('source') for chunk in results if 'source' in chunk.metadata]
    
    if doc_ids:
        logger.info(f"Document IDs: {doc_ids}")
    if sources:
        logger.info(f"Sources: {sources}")
    
    # Log content preview
    for i, doc in enumerate(results[:2]):
        preview = doc.page_content[:100].replace('\n', ' ')
        logger.info(f"Chunk {i+1}: {preview}...")

# 6. Delete document from vector store
def delete_document_from_vectorstore(document_id):
    """Delete a document from the vector store by document_id"""
    embedding_fn = get_embedding_function()
    vectordb = Chroma(
        persist_directory=CHROMA_DIR,
        embedding_function=embedding_fn
    )
    
    try:
        # Try both integer and string formats for document_id
        filter_dict_int = {"document_id": {"$eq": int(document_id)}}
        filter_dict_str = {"document_id": {"$eq": str(document_id)}}
        
        # Try integer format first
        matching_docs = vectordb.get(where=filter_dict_int)
        
        # If no results with integer, try string format
        if not matching_docs or not matching_docs.get('ids'):
            matching_docs = vectordb.get(where=filter_dict_str)
        
        # Get IDs of matching documents and delete them
        if matching_docs and matching_docs.get('ids'):
            vectordb.delete(matching_docs['ids'])
            vectordb.persist()
            logger.info(f"Deleted {len(matching_docs['ids'])} chunks for document_id {document_id}")
            return True
        else:
            logger.warning(f"No chunks found for document_id {document_id} (tried both int and str formats)")
            return False
            
    except Exception as e:
        logger.error(f"Error deleting document {document_id} from vector store: {str(e)}")
        return False

# Function to create user document directory
def create_user_document_dir(user_id):
    """Create a directory for user documents"""
    user_dir = os.path.join(USER_DATA_DIR, str(user_id))
    os.makedirs(user_dir, exist_ok=True)
    return user_dir

# Function to save a user document
def save_user_document(user_id, filename, content):
    """Save a document to the user's document directory"""
    user_dir = create_user_document_dir(user_id)
    file_path = os.path.join(user_dir, filename)
    
    with open(file_path, "wb") as buffer:
        buffer.write(content)
    
    return file_path
