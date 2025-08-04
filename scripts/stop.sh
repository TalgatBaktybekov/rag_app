#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🛑 Stopping RAG Application${NC}"

# Stop all services
echo -e "${YELLOW}🔄 Stopping Docker containers...${NC}"
docker-compose down

# Remove volumes (optional, uncomment if you want to clean data)
# echo -e "${YELLOW}🗑️  Removing volumes...${NC}"
# docker-compose down -v

# Remove images (optional, uncomment if you want to remove images)
# echo -e "${YELLOW}🗑️  Removing images...${NC}"
# docker-compose down --rmi all

echo -e "${GREEN}✅ RAG Application stopped successfully${NC}"

# Show remaining containers (should be none for this app)
echo -e "${YELLOW}📊 Remaining containers:${NC}"
docker ps -a --filter "name=rag"
