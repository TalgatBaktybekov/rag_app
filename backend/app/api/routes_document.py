from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, BackgroundTasks, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import hashlib
from pathlib import Path
from pydantic import BaseModel

from ..db.session import get_db
from ..core.security import get_current_user, TokenData
from ..services.document_ingest import (
    ingest_documents, ingest_user_document,
    save_user_document, delete_document_from_vectorstore,
    DATA_DIR, USER_DATA_DIR
)
from ..db import crud, models
import logging

router = APIRouter(prefix="/documents", tags=["documents"])

logger = logging.getLogger(__name__)

# Security constants
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
ALLOWED_EXTENSIONS = {'.pdf'}
ALLOWED_MIME_TYPES = {'application/pdf'}

# Request/response models
class DocumentSelectionRequest(BaseModel):
    document_ids: List[int]

from datetime import datetime
from pydantic import BaseModel, Field

class DocumentResponse(BaseModel):
    document_id: int
    filename: str
    display_name: str
    ingested: bool
    created_at: str = None
    user_id: int
    
    class Config:
        from_attributes = True
        arbitrary_types_allowed = True

def validate_file_security(file: UploadFile) -> None:
    """Validate file for security concerns"""
    # Check file extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400, 
            detail=f"File type not allowed. Only {ALLOWED_EXTENSIONS} files are permitted."
        )
    
    # Read first few bytes to check file signature
    file.file.seek(0)
    file_header = file.file.read(1024)
    file.file.seek(0)
    
    # Check if it's actually a PDF by magic number
    if not file_header.startswith(b'%PDF'):
        raise HTTPException(
            status_code=400,
            detail="File appears to be corrupted or not a valid PDF"
        )
    
    # Check file size
    if hasattr(file, 'size') and file.size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE / (1024*1024):.1f}MB"
        )

def generate_secure_filename(original_filename: str, user_id: int, content: bytes) -> str:
    """Generate a secure filename to prevent path traversal"""
    # Get file extension
    file_ext = Path(original_filename).suffix.lower()
    
    # Generate hash of content for uniqueness
    content_hash = hashlib.md5(content).hexdigest()[:8]
    
    # Create secure filename
    base_name = Path(original_filename).stem
    # Remove dangerous characters
    safe_name = "".join(c for c in base_name if c.isalnum() or c in '-_').strip()
    safe_name = safe_name[:50]  # Limit length
    
    return f"{safe_name}_{user_id}_{content_hash}{file_ext}"

# Ingest all documents as part of a maintenance operation
@router.post("/ingest", include_in_schema=False)
async def trigger_document_ingestion(
    background_tasks: BackgroundTasks,
    current_user: TokenData = Depends(get_current_user)
):
    """Trigger document ingestion process for all documents"""
    try:
        background_tasks.add_task(ingest_documents)
        return {"message": "Document ingestion started for all documents"}
    except Exception as e:
        logger.error(f"Document ingestion failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(e)}")

# USER ROUTES
@router.post("/upload")
async def upload_user_documents(
    files: List[UploadFile] = File(...),
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """Upload new PDF documents to your knowledge base"""
    uploaded_documents = []
    
    if len(files) > 10:  # Limit number of files
        raise HTTPException(status_code=400, detail="Too many files. Maximum 10 files allowed.")
    
    for file in files:
        # Validate file security
        validate_file_security(file)
        
        # Read file content
        content = await file.read()
        
        # Generate secure filename
        secure_filename = generate_secure_filename(file.filename, current_user.user_id, content)
        
        try:
            # Save the file
            file_path = save_user_document(current_user.user_id, secure_filename, content)
            
            # Create document record
            doc = crud.create_document(
                db=db,
                user_id=current_user.user_id,
                filename=secure_filename,
                display_name=file.filename,
                file_path=file_path
            )
            
            # Ingest document in background if provided
            if background_tasks:
                background_tasks.add_task(ingest_user_document, db, doc.document_id)
            
            # Add to response
            uploaded_documents.append({
                "document_id": doc.document_id,
                "filename": doc.filename,
                "display_name": doc.display_name
            })
            
            logger.info(f"Successfully uploaded file: {secure_filename}")
        except Exception as e:
            logger.error(f"Failed to save file {file.filename}: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to save file: {file.filename}")
    
    return {
        "message": f"Uploaded {len(uploaded_documents)} files",
        "documents": uploaded_documents
    }

@router.post("/ingest/{document_id}")
async def ingest_specific_document(
    document_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """Ingest a specific document into the vector store"""
    # Check document ownership
    document = crud.get_document(db, document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if document.user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="You don't have permission to ingest this document")
    
    background_tasks.add_task(ingest_user_document, db, document_id)
    return {"message": f"Document ingestion started for document ID {document_id}"}

@router.get("/list", response_model=List[DocumentResponse])
async def list_user_documents(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """List all documents accessible to the user"""
    offset = (page - 1) * limit
    db_documents = crud.get_user_documents(db, current_user.user_id, offset, limit)
    documents = []
    for doc in db_documents:
        doc_dict = {
            "document_id": doc.document_id,
            "filename": doc.filename,
            "display_name": doc.display_name,
            "ingested": doc.ingested,
            "user_id": doc.user_id,
            "created_at": doc.created_at.isoformat() if doc.created_at else None
        }
        documents.append(doc_dict)
    return documents

@router.delete("/{document_id}")
async def delete_user_document(
    document_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """Delete a document from your knowledge base"""
    # Check document ownership
    document = crud.get_document(db, document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if document.user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="You don't have permission to delete this document")
    
    # Remove from vector store in background
    background_tasks.add_task(delete_document_from_vectorstore, document_id)
    
    # Delete file
    if os.path.exists(document.file_path):
        try:
            os.remove(document.file_path)
        except Exception as e:
            logger.error(f"Failed to delete file {document.filename}: {str(e)}")
    
    # Delete from database
    success = crud.delete_document(db, document_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete document record")
    
    return {
        "message": f"Document {document.display_name} deleted",
        "document_id": document_id
    }

# Document selection for conversations
@router.post("/conversation/{conv_id}/select")
async def select_documents_for_conversation(
    conv_id: int,
    selection: DocumentSelectionRequest,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """Select documents to use for a specific conversation"""
    logger.info(f"Setting document selection for conversation {conv_id}, user {current_user.user_id}")
    logger.info(f"Selected document IDs: {selection.document_ids}")
    
    # Verify conversation ownership
    conversation = db.query(models.Conversation).filter(
        models.Conversation.conv_id == conv_id,
        models.Conversation.user_id == current_user.user_id
    ).first()
    
    if not conversation:
        logger.warning(f"Conversation {conv_id} not found for user {current_user.user_id}")
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Verify document access for each document ID
    valid_doc_ids = []
    for doc_id in selection.document_ids:
        document = db.query(models.Document).filter(
            models.Document.document_id == doc_id,
            models.Document.user_id == current_user.user_id
        ).first()
        
        if not document:
            logger.warning(f"Document {doc_id} not found or not accessible for user {current_user.user_id}")
            raise HTTPException(status_code=404, detail=f"Document {doc_id} not found or not accessible")
        
        if not document.ingested:
            logger.warning(f"Document {doc_id} is not ingested yet, skipping")
            continue
            
        valid_doc_ids.append(doc_id)
    
    # Set document selection
    crud.set_document_selection(db, conv_id, valid_doc_ids)
    
    logger.info(f"Successfully saved {len(valid_doc_ids)} document selections for conversation {conv_id}")
    return {
        "message": f"Selected {len(valid_doc_ids)} documents for conversation",
        "conv_id": conv_id,
        "document_ids": valid_doc_ids
    }

@router.get("/conversation/{conv_id}/selected", response_model=List[DocumentResponse])
async def get_selected_documents(
    conv_id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """Get documents selected for a specific conversation"""
    # Verify conversation ownership
    conversation = db.query(models.Conversation).filter(
        models.Conversation.conv_id == conv_id,
        models.Conversation.user_id == current_user.user_id
    ).first()
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Get selected documents
    db_documents = crud.get_document_selection(db, conv_id)
    
    # Convert datetime objects to strings
    documents = []
    for doc in db_documents:
        doc_dict = {
            "document_id": doc.document_id,
            "filename": doc.filename,
            "display_name": doc.display_name,
            "ingested": doc.ingested,
            "user_id": doc.user_id,
            "created_at": doc.created_at.isoformat() if doc.created_at else None
        }
        documents.append(doc_dict)
    
    return documents

@router.get("/status/{document_id}")
async def get_document_status(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """Get the status of a document (ingested or not)"""
    # Check document ownership or access
    document = db.query(models.Document).filter(
        models.Document.document_id == document_id,
        models.Document.user_id == current_user.user_id
    ).first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found or not accessible")
    
    # Return the document status
    return {
        "document_id": document.document_id,
        "filename": document.filename,
        "display_name": document.display_name,
        "ingested": document.ingested,
        "status": "processed" if document.ingested else "pending"
    }


@router.get("/serve-pdf/{filename}")
async def serve_pdf(
    filename: str,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """Stream a document file for viewing with simplified path handling"""
    logger.info(f"PDF request received - Raw filename: '{filename}'")
    
    # Decode and sanitize the filename
    try:
        from urllib.parse import unquote
        decoded_filename = unquote(filename)
        clean_filename = os.path.basename(decoded_filename)
        logger.info(f"PDF request - Decoded: '{decoded_filename}', Clean: '{clean_filename}'")
    except Exception as e:
        logger.warning(f"Error processing filename: {str(e)}")
        clean_filename = os.path.basename(filename)
        logger.info(f"PDF request - Fallback clean filename: '{clean_filename}'")
    
    # Check user-specific directory only (no public documents)
    user_file_path = os.path.join(USER_DATA_DIR, str(current_user.user_id), clean_filename)
    logger.info(f"PDF request - Looking for file at: '{user_file_path}'")
    logger.info(f"PDF request - File exists: {os.path.isfile(user_file_path)}")
    
    # Use the appropriate path
    if os.path.isfile(user_file_path):
        file_path = user_file_path
        logger.info(f"PDF request - Serving file: '{file_path}'")
    else:
        logger.error(f"PDF request - File not found: '{user_file_path}'")
        # List available files for debugging
        user_dir = os.path.join(USER_DATA_DIR, str(current_user.user_id))
        if os.path.exists(user_dir):
            available_files = os.listdir(user_dir)
            logger.info(f"PDF request - Available files in user directory: {available_files}")
        else:
            logger.error(f"PDF request - User directory does not exist: '{user_dir}'")
        raise HTTPException(status_code=404, detail=f"Document not found: {clean_filename}")
    
    # Stream the file
    try:
        return StreamingResponse(
            open(file_path, "rb"), 
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"inline; filename={filename}",
                "Cache-Control": "public, max-age=3600"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading PDF file: {str(e)}")
