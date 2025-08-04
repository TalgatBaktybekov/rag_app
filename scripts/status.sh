#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}📊 RAG Application Status${NC}"
echo -e "${BLUE}================================${NC}"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running${NC}"
    exit 1
fi

# Show container status
echo -e "${YELLOW}🐳 Container Status:${NC}"
docker-compose ps

echo -e "\n${YELLOW}💾 Volume Usage:${NC}"
docker system df

echo -e "\n${YELLOW}🔍 Service Logs (last 10 lines):${NC}"
echo -e "${BLUE}--- Backend Logs ---${NC}"
docker-compose logs --tail=10 backend

echo -e "\n${BLUE}--- Frontend Logs ---${NC}"
docker-compose logs --tail=10 frontend

echo -e "\n${BLUE}--- Database Logs ---${NC}"
docker-compose logs --tail=10 db

echo -e "\n${YELLOW}🌐 Service URLs:${NC}"
echo -e "${GREEN}Backend API: http://localhost:8000${NC}"
echo -e "${GREEN}API Docs: http://localhost:8000/docs${NC}"
echo -e "${GREEN}Frontend: http://localhost:5173${NC}"
echo -e "${GREEN}Database: localhost:5433${NC}"

echo -e "\n${YELLOW}🔗 Quick Health Check:${NC}"
if curl -s http://localhost:8000/docs > /dev/null; then
    echo -e "${GREEN}✅ Backend is responding${NC}"
else
    echo -e "${RED}❌ Backend is not responding${NC}"
fi

if curl -s http://localhost:5173 > /dev/null; then
    echo -e "${GREEN}✅ Frontend is responding${NC}"
else
    echo -e "${RED}❌ Frontend is not responding${NC}"
fi
