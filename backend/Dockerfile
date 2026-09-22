FROM python:3.12-slim

WORKDIR /app

# Install system dependencies (for asyncpg / psycopg2)
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    libmagic1 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Run uvicorn
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
