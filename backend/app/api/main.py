from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from ..db.session import  engine
from ..db import models
from ..core.config import settings
from ..core.logging_config import setup_logging
from .routes_chat import router as chat_router
from .routes_auth import router as auth_router
from .routes_document import router as document_router


# Setup logging configuration
logger = setup_logging()
logger.info("Starting application")

models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AI Chatbot with RAG",
    description="Backend API for AI-powered chat application using retrieval-augmented generation",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router)
app.include_router(auth_router)
app.include_router(document_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True
    )
