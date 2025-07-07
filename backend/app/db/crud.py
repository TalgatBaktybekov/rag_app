# backend/app/db/crud.py

from datetime import datetime
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import NoResultFound
from typing import List, Optional, Dict, Any

from . import models


def get_conversations_by_user(db: Session, user_id: int):
    return (
        db.query(models.Conversation)
        .filter(models.Conversation.user_id == user_id)
        .order_by(models.Conversation.timestamp.desc())
        .all()
    )


def create_conversation(db: Session, user_id: int, title: str):
    conv = models.Conversation(
        user_id=user_id,
        title=title,
        timestamp=datetime.utcnow(),
    )
    db.add(conv)
    db.commit()
    db.refresh(conv)
    return conv

def get_messages_by_conversation(db: Session, user_id: int, conv_id: int):
    try:
        return (
            db.query(models.Message)
            .filter(models.Message.conv_id == conv_id, models.Message.user_id == user_id)
            .order_by(models.Message.timestamp.asc())
            .all()
        )
    except NoResultFound:
        return []  
def delete_conversation(db: Session, conv_id: int) -> bool:
    conv = db.get(models.Conversation, conv_id)
    if not conv:
        return False
    db.delete(conv)
    db.commit()
    return True


def create_user_message(
    db: Session,
    conv_id: int,
    user_id: int,
    content: str,
):
    msg = models.Message(
        conv_id=conv_id,
        user_id=user_id,
        role="user",
        content=content,
        timestamp=datetime.utcnow(),
    )
    db.add(msg)

    # update conversation timestamp
    conv = db.get(models.Conversation, conv_id)
    if conv:
        conv.timestamp = datetime.utcnow()
        db.add(conv)

    db.commit()
    db.refresh(msg)
    return msg

def create_ai_message(db: Session, conv_id: int, user_id: int, content: str) -> models.Message:
    msg = models.Message(
        conv_id=conv_id,
        user_id=user_id,
        role="ai",
        content=content,
        timestamp=datetime.utcnow(),
    )
    db.add(msg)

    # update conversation timestamp
    conv = db.get(models.Conversation, conv_id)
    if conv:
        conv.preview = content[:100]
        conv.timestamp = datetime.utcnow()
        db.add(conv)

    db.commit()
    db.refresh(msg)
    return msg

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()


def create_user(db: Session, name: str, email: str, password: str):
    user = models.User(name=name, email=email, hashed_password=password)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, email: str, password: str):
    user = get_user_by_email(db, email)
    # Password verification is handled in routes_auth.py
    return user

def get_conversations_by_user_paginated(db: Session, user_id: int, offset: int = 0, limit: int = 20):
    """Get user conversations with pagination"""
    return (
        db.query(models.Conversation)
        .filter(models.Conversation.user_id == user_id)
        .order_by(models.Conversation.timestamp.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

def get_messages_by_conversation_paginated(db: Session, user_id: int, conv_id: int, offset: int = 0, limit: int = 50):
    """Get conversation messages with pagination"""
    try:
        return (
            db.query(models.Message)
            .filter(models.Message.conv_id == conv_id, models.Message.user_id == user_id)
            .order_by(models.Message.timestamp.asc())
            .options(joinedload(models.Message.references))  # Include references
            .offset(offset)
            .limit(limit)
            .all()
        )
    except NoResultFound:
        return []

def get_conversation_count_by_user(db: Session, user_id: int) -> int:
    """Get total conversation count for a user"""
    return (
        db.query(models.Conversation)
        .filter(models.Conversation.user_id == user_id)
        .count()
    )

def get_message_count_by_conversation(db: Session, user_id: int, conv_id: int) -> int:
    """Get total message count for a conversation"""
    return (
        db.query(models.Message)
        .filter(models.Message.conv_id == conv_id, models.Message.user_id == user_id)
        .count()
    )

# Document CRUD operations
def create_document(db: Session, user_id: int, filename: str, display_name: str, file_path: str):
    """Create a new document record"""
    document = models.Document(
        user_id=user_id,
        filename=filename,
        display_name=display_name,
        file_path=file_path
    )
    db.add(document)
    db.commit()
    db.refresh(document)
    return document

def get_document(db: Session, document_id: int):
    """Get a document by ID"""
    return db.query(models.Document).filter(models.Document.document_id == document_id).first()

def get_document_by_filename(db: Session, filename: str):
    """Get a document by filename"""
    return db.query(models.Document).filter(models.Document.filename == filename).first()

def update_document(db: Session, document_id: int, ingested: Optional[bool] = None):
    """Update document properties"""
    document = db.query(models.Document).filter(models.Document.document_id == document_id).first()
    if not document:
        return None
    
    if ingested is not None:
        document.ingested = ingested
    
    document.updated_at = datetime.utcnow()
    db.add(document)
    db.commit()
    db.refresh(document)
    return document

def delete_document(db: Session, document_id: int):
    """Delete a document"""
    document = db.get(models.Document, document_id)
    if not document:
        return False
    db.delete(document)
    db.commit()
    return True

def get_user_documents(db: Session, user_id: int, offset: int = 0, limit: int = 20):
    """Get documents owned by a user with pagination"""
    return (
        db.query(models.Document)
        .filter(models.Document.user_id == user_id)
        .order_by(models.Document.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

def get_accessible_documents(db: Session, user_id: int, offset: int = 0, limit: int = 50):
    """Get all documents accessible to a user (user-owned only)"""
    return (
        db.query(models.Document)
        .filter(models.Document.user_id == user_id)
        .order_by(models.Document.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

# Chat document selection CRUD
def set_document_selection(db: Session, conv_id: int, document_ids: List[int]):
    """Set the selected documents for a conversation"""
    # First, clear existing selections
    db.query(models.ChatDocumentSelection).filter(
        models.ChatDocumentSelection.conv_id == conv_id
    ).delete()
    
    # Then add new selections
    for doc_id in document_ids:
        selection = models.ChatDocumentSelection(
            conv_id=conv_id,
            document_id=doc_id
        )
        db.add(selection)
    
    db.commit()
    return True

def get_document_selection(db: Session, conv_id: int):
    """Get selected documents for a conversation"""
    return (
        db.query(models.Document)
        .join(models.ChatDocumentSelection, models.Document.document_id == models.ChatDocumentSelection.document_id)
        .filter(models.ChatDocumentSelection.conv_id == conv_id)
        .all()
    )

def get_document_selection_ids(db: Session, conv_id: int):
    """Get IDs of selected documents for a conversation"""
    selections = db.query(models.ChatDocumentSelection).filter(
        models.ChatDocumentSelection.conv_id == conv_id
    ).all()
    return [selection.document_id for selection in selections]

# Reference CRUD operations
def create_reference(db: Session, message_id: int, source: str, page: int, text: str, document_id: int = None,
                    source_path: str = None, start_char: int = None, end_char: int = None):
    """Create a new reference for a message"""
    reference = models.Reference(
        message_id=message_id,
        document_id=document_id, 
        source=source,
        source_path=source_path,
        page=page,
        text=text,
        start_char=start_char,
        end_char=end_char
    )
    db.add(reference)
    db.commit()
    db.refresh(reference)
    return reference

def get_references_by_message(db: Session, message_id: int):
    """Get all references for a message"""
    return db.query(models.Reference).filter(models.Reference.message_id == message_id).order_by(models.Reference.id).all()

def delete_references_by_message(db: Session, message_id: int):
    """Delete all references for a message"""
    db.query(models.Reference).filter(models.Reference.message_id == message_id).delete()
    db.commit()
    return True
