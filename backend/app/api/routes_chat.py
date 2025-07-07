from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime
import logging
import re
import html

from ..db import crud
from ..db.session import get_db
from pydantic import BaseModel, Field, validator
from ..core.security import get_current_user, TokenData
from fastapi import BackgroundTasks
from fastapi import status

from ..services.ollama import build_standardiser_chain, build_langchain_agent, build_context_need_evaluator

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["chat"])

# Input sanitization functions
def sanitize_string(value: str, max_length: int = 1000) -> str:
    """Sanitize string input to prevent XSS and other attacks"""
    if not value:
        return ""
    # Remove potentially dangerous HTML/script tags
    value = re.sub(r'<[^>]*>', '', value)
    # HTML escape remaining content
    value = html.escape(value)
    # Limit length
    return value[:max_length].strip()

def validate_conversation_id(conv_id: int) -> int:
    """Validate conversation ID"""
    if conv_id <= 0:
        raise ValueError("Invalid conversation ID")
    return conv_id

class ConversationCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    
    @validator('title')
    def sanitize_title(cls, v):
        return sanitize_string(v, 200)

class Conversation(BaseModel):
    conv_id: int
    title: str
    user_id: int
    timestamp: datetime
    preview: Optional[str] = None
    class Config:
        from_attributes = True

class MessageCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=10000)
    role: str = Field(..., pattern="^(user|ai)$")
    conv_id: int
    
    @validator('content')
    def sanitize_content(cls, v):
        return sanitize_string(v, 10000)
    
    @validator('conv_id')
    def validate_conv_id(cls, v):
        return validate_conversation_id(v)

class Reference(BaseModel):
    id: int
    source: str
    page: int
    text: str
    document_id: Optional[int] = None
    source_path: Optional[str] = None
    
    class Config:
        from_attributes = True

class Message(BaseModel):
    id: int
    content: str
    role: str
    timestamp: datetime
    references: Optional[List[Reference]] = None
    context: Optional[List[str]] = None  # Keep for backward compatibility
    
    class Config:
        from_attributes = True

class AskRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=2000)
    conv_id: int
    
    @validator('question')
    def sanitize_question(cls, v):
        return sanitize_string(v, 2000)
    
    @validator('conv_id')
    def validate_conv_id(cls, v):
        return validate_conversation_id(v)


@router.get("/conversations", response_model=List[Conversation])
def list_conversations(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db), 
    current_user: TokenData = Depends(get_current_user)
):
    """Get user conversations with pagination"""
    offset = (page - 1) * limit
    conversations = crud.get_conversations_by_user_paginated(db, current_user.user_id, offset, limit)
    return conversations

@router.post("/conversations", response_model=Conversation)
def create_new_conversation(data: ConversationCreate, db: Session = Depends(get_db), current_user: TokenData = Depends(get_current_user)):
    return crud.create_conversation(db, current_user.user_id, data.title)

@router.delete("/conversations/{conv_id}")
def remove_conversation(conv_id: int, db: Session = Depends(get_db), current_user: TokenData = Depends(get_current_user)):
    # Verify conversation ownership before deletion
    conversation = db.query(crud.models.Conversation).filter(
        crud.models.Conversation.conv_id == conv_id,
        crud.models.Conversation.user_id == current_user.user_id
    ).first()
    
    if not conversation:
        raise HTTPException(
            status_code=404, 
            detail="Conversation not found or you don't have permission to delete it"
        )
    
    success = crud.delete_conversation(db, conv_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete conversation")
    return {"status": "deleted"}

@router.get("/history/{conv_id}")
def get_conversation_history(
    conv_id: int, 
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=100, description="Messages per page"),
    db: Session = Depends(get_db), 
    current_user: TokenData = Depends(get_current_user)
):
    """Get conversation messages with pagination"""
    conv_id = validate_conversation_id(conv_id)
    offset = (page - 1) * limit
    
    # Get messages with pagination
    messages = crud.get_messages_by_conversation_paginated(db, current_user.user_id, conv_id, offset, limit)
    
    # Prepare response with references for each AI message
    message_responses = []
    for msg in messages:
        response_dict = {
            "id": msg.id,
            "content": msg.content,
            "role": msg.role,
            "timestamp": msg.timestamp
        }
        
        if msg.role == "ai" and hasattr(msg, "references") and msg.references:
            # Format references for the response
            reference_list = [{
                "id": ref.id,
                "text": ref.text,
                "source": ref.source,
                "page": ref.page + 1,  # Convert to 1-based for display
                "document_id": ref.document_id,
                "source_path": ref.source_path
            } for ref in msg.references]
            
            response_dict["references"] = reference_list
            
            # Include context for backward compatibility
            context_list = [ref.text for ref in msg.references]
            response_dict["context"] = context_list
        
        message_responses.append(response_dict)
    
    return message_responses

class MessageResponse(BaseModel):
    id: int
    content: str
    role: str
    timestamp: datetime
    references: Optional[List[dict]] = None
    context: Optional[List[str]] = None
    
    class Config:
        from_attributes = True

@router.post("/ask", response_model=MessageResponse)
async def ask(ai_req: AskRequest, db: Session = Depends(get_db), current_user: TokenData = Depends(get_current_user)):
    # 1. Fetch chat history as plain text
    history = crud.get_messages_by_conversation(db, current_user.user_id, ai_req.conv_id)
    history_text = ""
    for msg in history:
        role = "User" if msg.role == "user" else "AI"
        history_text += f"{role}: {msg.content}\n"
    
    # 2. Standardise the question
    standardiser_chain = build_standardiser_chain()
    standalone_question = standardiser_chain.invoke({
        "chat_history": history_text,
        "question": ai_req.question
    })
    if hasattr(standalone_question, "content"):
        standalone_question = standalone_question.content
    
    # 3. Determine if the question needs context from documents
    context_evaluator = build_context_need_evaluator()
    context_need_response = context_evaluator.invoke({"question": standalone_question})
    
    # Extract the decision (0 or 1)
    if hasattr(context_need_response, "content"):
        context_decision = context_need_response.content.strip()
    else:
        context_decision = str(context_need_response).strip()
    
    # Parse the decision - be strict and default to False
    needs_context = False
    if context_decision == "1":
        needs_context = True
        logger.info(f"Question needs context: '{standalone_question}'")
    else:
        logger.info(f"Question does not need context: '{standalone_question}' (decision: {context_decision})")
    
    # 4. Use the standalone question for the main agent (with or without RAG)
    chain, context_chunks = build_langchain_agent(db, current_user.user_id, ai_req.conv_id, question=standalone_question, needs_context=needs_context)
    config = {'configurable': {'session_id': str(ai_req.conv_id)}}
    response = chain.invoke({"question": standalone_question}, config=config)
    ai_content = response.content if hasattr(response, "content") else str(response)
    
    # Save the user message
    user_msg = crud.create_user_message(db, ai_req.conv_id, current_user.user_id, ai_req.question)
    
    # Save the AI message
    ai_msg = crud.create_ai_message(db, ai_req.conv_id, current_user.user_id, ai_content)
    
    # Extract references from the AI response
    import re
    reference_pattern = r'\[(\d+)\]'
    found_references = re.findall(reference_pattern, ai_content)
    
    # Count references to only include ones that are actually used
    ref_counter = {}
    for ref_num in found_references:
        if ref_num in ref_counter:
            ref_counter[ref_num] += 1
        else:
            ref_counter[ref_num] = 1
    
    # Get unique reference numbers in the order they appear in the text
    unique_refs = []
    for ref_num in found_references:
        if ref_num not in unique_refs:
            unique_refs.append(ref_num)
    
    # Create reference objects for references found in the text
    reference_list = []
    for ref_num in unique_refs:
        # Convert to int and subtract 1 to get 0-based index
        try:
            idx = int(ref_num) - 1
            if 0 <= idx < len(context_chunks):
                chunk = context_chunks[idx]
                source = chunk.metadata.get('source', 'Unknown')
                page = chunk.metadata.get('page', 0) 
                document_id = chunk.metadata.get('document_id')
                source_path = chunk.metadata.get('source_path')
                
                # Add location of reference in the message
                start_char = ai_content.find(f'[{ref_num}]')
                end_char = start_char + len(f'[{ref_num}]') if start_char >= 0 else None
                
                # Create reference in DB
                ref = crud.create_reference(
                    db=db,
                    message_id=ai_msg.id,
                    source=source,
                    page=page,
                    text=chunk.page_content[:300],  # Store first 300 chars of reference
                    document_id=document_id,
                    source_path=source_path,
                    start_char=start_char,
                    end_char=end_char
                )
                
                # Add reference to the list for the response
                reference_list.append({
                    "id": int(ref_num),  # Use the reference number from text as ID
                    "text": chunk.page_content,
                    "source": source,
                    "page": int(page) + 1,  # Convert to 1-based for display
                    "document_id": document_id,
                    "source_path": source_path,
                    "count": ref_counter.get(ref_num, 1)  # How many times this reference is used
                })
        except (ValueError, IndexError) as e:
            logger.error(f"Error processing reference {ref_num}: {str(e)}")
    
    # Ensure we have references for all retrieved chunks, not just explicitly referenced ones
    # This ensures that if the LLM references [5], but we only found refs 1-4 in the text, ref 5 still works
    references_to_include = reference_list.copy()
    
    # If we have fewer references than chunks, create references for all chunks
    if len(context_chunks) > 0:
        logger.info(f"Creating reference mapping for {len(context_chunks)} chunks")
        
        # Create a map of existing reference numbers
        existing_ref_nums = {ref["id"] for ref in references_to_include}
        
        # Add references for chunks that don't have references yet
        for i, chunk in enumerate(context_chunks):
            ref_num = i + 1  # 1-based index
            if ref_num not in existing_ref_nums:
                source = chunk.metadata.get('source', 'Unknown')
                page = chunk.metadata.get('page', 0)
                document_id = chunk.metadata.get('document_id')
                source_path = chunk.metadata.get('source_path')
                
                # Create reference in DB
                ref = crud.create_reference(
                    db=db,
                    message_id=ai_msg.id,
                    source=source,
                    page=page,
                    text=chunk.page_content[:300],
                    document_id=document_id,
                    source_path=source_path
                )
                
                # Add to our list
                references_to_include.append({
                    "id": ref_num,  # Use the reference number as ID
                    "text": chunk.page_content,
                    "source": source,
                    "page": int(page) + 1,
                    "document_id": document_id,
                    "source_path": source_path
                })
    
    # Return all references
    return {
        "id": ai_msg.id,
        "content": ai_msg.content,
        "role": ai_msg.role,
        "timestamp": ai_msg.timestamp,
        "references": references_to_include,
        
        # For backward compatibility
        "context": [ref["text"] for ref in references_to_include] if references_to_include else []
    }

