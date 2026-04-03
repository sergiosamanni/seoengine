# Support Railway build from root
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    ca-certificates \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements and install
# We use the relative path since we're building from root
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy all code from backend into /app
COPY backend/ ./

# Expose port (provided by Railway)
EXPOSE 8000

# Run uvicorn
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
