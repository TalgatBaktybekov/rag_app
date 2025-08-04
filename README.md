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

## 🐳 Docker Setup

### Prerequisites
- Docker and Docker Compose installed
- At least 4GB of available RAM
- Ollama running locally (for AI inference) or configured to use an external LLM service

### Quick Start (Recommended)

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd rag_app
   ```

2. **Configure environment**:
   ```bash
   # Copy the environment template
   cp backend/.env.example backend/.env
   
   # Edit the .env file with your configuration
   nano backend/.env
   ```

3. **Build and run with the automated script**:
   ```bash
   # Make scripts executable and run
   chmod +x scripts/*.sh
   ./scripts/build.sh
   ```

4. **Access the application**:
   - **Frontend**: http://localhost:5173
   - **Backend API**: http://localhost:8000
   - **API Documentation**: http://localhost:8000/docs
   - **Database**: localhost:5433

### Manual Docker Commands

If you prefer manual control:

```bash
# Build the images
docker-compose build

# Start the services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the services
docker-compose down

# Stop and remove volumes (resets data)
docker-compose down -v
```

### Production Deployment

For production deployment with nginx reverse proxy:

```bash
# Use the production docker-compose file
docker-compose -f docker-compose.prod.yml up -d
```

### Useful Commands

```bash
# Check service status
./scripts/status.sh

# Stop all services
./scripts/stop.sh

# View logs for specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db

# Access container shell
docker-compose exec backend bash
docker-compose exec frontend sh

# Reset database (removes all data)
docker-compose down -v
docker volume rm rag_app_pg_data
```

## ⚙️ Configuration

### Environment Variables (backend/.env)

```bash
# Database Configuration
POSTGRES_USER=myuser
POSTGRES_PASSWORD=password
POSTGRES_DB=rag_app
POSTGRES_HOST=db
POSTGRES_PORT=5432

# API Configuration
HOST=0.0.0.0
PORT=8000
CORS_ORIGINS=["http://localhost:5173"]

# Security
SECRET_KEY=your-super-secret-key-change-this-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Embedding Model
EMBEDDING_MODEL=BAAI/bge-large-en-v1.5

# Ollama Configuration (if using local Ollama)
OLLAMA_BASE_URL=http://host.docker.internal:11434
OLLAMA_MODEL=llama2
```

### Docker Volumes

- `pg_data`: PostgreSQL data persistence
- `./embeddings`: ChromaDB vector store data
- `./data`: User uploaded documents
- `./logs`: Application logs

## 🔧 Development

### Running in Development Mode

The default docker-compose.yml runs in development mode with:
- Hot reloading for both frontend and backend
- Volume mounts for source code
- Debug logging enabled

### Building for Production

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Run in production mode
docker-compose -f docker-compose.prod.yml up -d
```

## 📊 Monitoring

### Health Checks

All services include health checks:
- **Backend**: `GET /docs` endpoint availability
- **Frontend**: HTTP response check
- **Database**: PostgreSQL connection check

### Logs

```bash
# View all logs
docker-compose logs

# View specific service logs
docker-compose logs backend
docker-compose logs frontend
docker-compose logs db

# Follow logs in real-time
docker-compose logs -f
```

## 🚨 Troubleshooting

### Common Issues

1. **Port conflicts**: Make sure ports 5173, 8000, and 5433 are available
2. **Memory issues**: Ensure Docker has at least 4GB RAM allocated
3. **Permission issues**: Make sure the scripts are executable (`chmod +x scripts/*.sh`)
4. **Ollama not accessible**: Configure `OLLAMA_BASE_URL` correctly in `.env`

### Reset Everything

```bash
# Stop services and remove all data
docker-compose down -v

# Remove images
docker-compose down --rmi all

# Clean up Docker system
docker system prune -a
```
