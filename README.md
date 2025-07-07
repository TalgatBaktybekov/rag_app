# RAG Chatbot - AI-Powered Documentation Assistant

A full-stack web application that uses Retrieval-Augmented Generation (RAG) to answer user questions based on a knowledge base of technical documentation. Built with FastAPI  backend and React frontend.

## Features

### Core Features (Implemented)
- ✅ **Retrieval-Augmented Generation (RAG)**: All AI responses are grounded in the uploaded knowledge base
- ✅ **Multi-turn Conversations**: Contextual chat that remembers previous messages
- ✅ **Persistent Chat History**: Save and browse all previous conversations
- ✅ **User Authentication**: JWT-based authentication with automatic token refresh
- ✅ **Document Management**: Upload and manage PDF documents for the knowledge base
- ✅ **Real-time Chat Interface**: Modern, responsive chat UI with typing indicators

### Advanced Features (Implemented)
- ✅ **Reference Highlighting**: Display source passages used to generate AI responses
- ✅ **Personal Document Upload**: Users can upload their own PDFs to the knowledge base
- ✅ **Input Validation & Security**: Comprehensive input sanitization and security measures
- ✅ **Error Handling**: Robust error boundaries and user-friendly error messages
- ✅ **Health Monitoring**: System health endpoints for production monitoring

### Security Features
- 🔐 **Password Validation**: Strong password requirements
- 🔐 **Rate Limiting**: Protection against abuse and DoS attacks
- 🔐 **Authorization Checks**: Proper user permission validation
- 🔐 **Security Headers**: CSP, HSTS, and other security headers

## 🏗️ System Architecture

### Backend (FastAPI + Python)
- **API Layer**: RESTful API with automatic OpenAPI documentation
- **Authentication**: JWT tokens with refresh mechanism
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Vector Store**: ChromaDB for document embeddings
- **LLM Integration**: Ollama for local AI inference
- **Document Processing**: PDF parsing and chunking

### Frontend (React + Vite)
- **Modern React**: Hooks, context, and functional components
- **UI Components**: Custom design system with CSS variables
- **State Management**: React hooks for local state
- **Error Boundaries**: Error handling and recovery

### RAG Pipeline
1. **Document Ingestion**: PDF files are parsed and chunked
2. **Embedding Generation**: Text chunks are converted to vector embeddings
3. **Vector Storage**: Embeddings stored in ChromaDB for fast retrieval
4. **Query Processing**: User questions are embedded and matched against knowledge base
5. **Context Injection**: Relevant passages are injected into the LLM prompt
6. **Response Generation**: AI generates contextual responses based on retrieved documents

