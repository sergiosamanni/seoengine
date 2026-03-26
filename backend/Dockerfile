# Use official Python image
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies if needed (e.g., for some python packages)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    ca-certificates \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port (Railway/Render usually provide PORT env var)
EXPOSE 8000

# Command to run the application (PORT is provided by Railway/Render)
CMD uvicorn server:app --host 0.0.0.0 --port ${PORT:-8000}
