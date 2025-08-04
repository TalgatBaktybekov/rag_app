#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Building RAG Application with Docker${NC}"

# Function to check if command was successful
check_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $1 completed successfully${NC}"
    else
        echo -e "${RED}❌ $1 failed${NC}"
        exit 1
    fi
}

# Create necessary directories
echo -e "${YELLOW}📁 Creating necessary directories...${NC}"
mkdir -p data/user_documents
mkdir -p embeddings/chroma_db
mkdir -p logs
check_status "Directory creation"

# Copy environment file if it doesn't exist
if [ ! -f "./backend/.env" ]; then
    echo -e "${YELLOW}📋 Creating .env file from template...${NC}"
    cp ./backend/.env.example ./backend/.env
    echo -e "${YELLOW}⚠️  Please edit ./backend/.env with your configuration${NC}"
fi

# Build the application
echo -e "${YELLOW}🔨 Building Docker images...${NC}"
docker-compose build --no-cache
check_status "Docker build"

# Start the services
echo -e "${YELLOW}🚀 Starting services...${NC}"
docker-compose up -d
check_status "Service startup"

echo -e "${GREEN}🎉 RAG Application is starting up!${NC}"
echo -e "${GREEN}📊 Backend API: http://localhost:8000${NC}"
echo -e "${GREEN}📊 API Docs: http://localhost:8000/docs${NC}"
echo -e "${GREEN}🌐 Frontend: http://localhost:5173${NC}"
echo -e "${GREEN}🗄️  Database: localhost:5433${NC}"

echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"
sleep 10

echo -e "${YELLOW}🔍 Checking service health...${NC}"
docker-compose ps
