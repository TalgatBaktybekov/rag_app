from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, Index, UniqueConstraint, Boolean, Table
from sqlalchemy.orm import relationship
from datetime import datetime
from .session import Base

class User(Base):
    __tablename__ = "users"
    user_id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(128), nullable=False)  # Ensure enough length for bcrypt
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    conversations = relationship("Conversation", back_populates="user", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="user", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index('idx_user_email_active', 'email'),
        UniqueConstraint('email', name='uq_user_email'),
    )

class Conversation(Base):
    __tablename__ = "conversations"
    conv_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    preview = Column(Text, nullable=True)  # Optional preview text for the conversation
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    user = relationship("User", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")
    selected_documents = relationship("ChatDocumentSelection", back_populates="conversation", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index('idx_conversation_user_timestamp', 'user_id', 'timestamp'),
        Index('idx_conversation_timestamp', 'timestamp'),
    )

class Message(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True, index=True)  # Unique message ID
    user_id = Column(Integer, nullable=False, index=True)
    conv_id = Column(Integer, ForeignKey("conversations.conv_id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(10), nullable=False)  # 'user' or 'ai'
    content = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    conversation = relationship("Conversation", back_populates="messages")
    references = relationship("Reference", back_populates="message", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index('idx_message_conv_timestamp', 'conv_id', 'timestamp'),
        Index('idx_message_user_timestamp', 'user_id', 'timestamp'),
        Index('idx_message_role', 'role'),
    )

class Document(Base):
    __tablename__ = "documents"
    document_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True)
    filename = Column(String(255), nullable=False)
    display_name = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)
    ingested = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    user = relationship("User", back_populates="documents")
    chat_selections = relationship("ChatDocumentSelection", back_populates="document", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index('idx_document_user_id', 'user_id'),
        Index('idx_document_filename', 'filename'),
    )

class ChatDocumentSelection(Base):
    __tablename__ = "chat_document_selections"
    id = Column(Integer, primary_key=True, index=True)
    conv_id = Column(Integer, ForeignKey("conversations.conv_id", ondelete="CASCADE"), nullable=False)
    document_id = Column(Integer, ForeignKey("documents.document_id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    conversation = relationship("Conversation", back_populates="selected_documents")
    document = relationship("Document", back_populates="chat_selections")
    
    __table_args__ = (
        Index('idx_chat_doc_conv_id', 'conv_id'),
        UniqueConstraint('conv_id', 'document_id', name='uq_chat_doc_selection'),
    )

class Reference(Base):
    __tablename__ = "references"
    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(Integer, ForeignKey("messages.id", ondelete="CASCADE"), nullable=False, index=True)
    document_id = Column(Integer, ForeignKey("documents.document_id", ondelete="CASCADE"), nullable=True)
    source = Column(String(255), nullable=False)  # Document filename
    source_path = Column(String(512), nullable=True)  # Full path to document
    page = Column(Integer, nullable=False, default=0)  # Page number in the document
    text = Column(Text, nullable=False)  # Referenced text
    start_char = Column(Integer, nullable=True)  # Start character position in the message
    end_char = Column(Integer, nullable=True)  # End character position in the message
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    message = relationship("Message", back_populates="references")
    document = relationship("Document", backref="references")
    
    __table_args__ = (
        Index('idx_reference_message', 'message_id'),
        Index('idx_reference_document', 'document_id'),
    )
