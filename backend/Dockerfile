# Use Python 3.11 slim image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libpq-dev \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
# Install torch first with CPU-only version for smaller image size
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir torch==2.2.1 --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir -r requirements.txt

# Copy the application code
COPY . .

# Create necessary directories
RUN mkdir -p /app/data/user_documents \
    && mkdir -p /app/embeddings/chroma_db \
    && mkdir -p /app/logs

# Set environment variables
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

# Expose the port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/docs || exit 1

# Run the application
CMD ["uvicorn", "app.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
