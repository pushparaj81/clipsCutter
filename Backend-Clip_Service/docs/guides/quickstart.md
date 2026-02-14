# Quick Start Guide

Get the Backend Clip Service running in 5 minutes!

## Prerequisites

- **Docker & Docker Compose** (recommended)
- OR **Python 3.11+**, **PostgreSQL 15+**, **Redis**

## Option 1: Docker (Recommended)

### 1. Clone and Navigate

```bash
cd Backend-Clip_Service
```

### 2. Start Services

```bash
docker-compose up -d
```

This starts:
- PostgreSQL (port 5432)
- Redis (port 6379)
- FastAPI server (port 8000)
- Celery worker
- Celery beat

### 3. Verify

```bash
# Check services
docker-compose ps

# View logs
docker-compose logs -f api

# Check API health
curl http://localhost:8000/health
```

### 4. Access API Documentation

Open in browser:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

---

## Option 2: Local Development

### 1. Setup Environment

```bash
# Run setup script
./setup.sh

# Activate virtual environment
source venv/bin/activate
```

### 2. Start Database & Redis

```bash
# Using Docker
docker-compose up -d postgres redis

# OR install locally
# PostgreSQL: https://www.postgresql.org/download/
# Redis: https://redis.io/download
```

### 3. Configure Environment

```bash
# Copy environment file
cp .env.example .env

# Edit with your settings
nano .env
```

### 4. Start API Server

```bash
uvicorn app.main:app --reload --port 8000
```

### 5. Start Celery Worker (New Terminal)

```bash
source venv/bin/activate
celery -A workers.celery_app worker --loglevel=info
```

---

## Test the API

### 1. Get Video Info

```bash
curl -X POST http://localhost:8000/api/info \
  -H "Content-Type: application/json" \
  -d '{"url": "https://youtube.com/watch?v=dQw4w9WgXcQ"}'
```

**Expected Response:**
```json
{
  "videoId": "dQw4w9WgXcQ",
  "title": "Rick Astley - Never Gonna Give You Up",
  "duration": 212,
  "availableQualities": [...]
}
```

### 2. Create a Clip

```bash
curl -X POST http://localhost:8000/api/clip \
  -H "Content-Type: application/json" \
  -d '{
    "videoId": "dQw4w9WgXcQ",
    "startTime": 0,
    "endTime": 10,
    "format": "mp4",
    "quality": "360p"
  }'
```

**Expected Response:**
```json
{
  "status": "queued",
  "clipId": "abc-123-def",
  "message": "Processing started"
}
```

### 3. Check Status

```bash
curl http://localhost:8000/api/status?id=abc-123-def
```

**Expected Response:**
```json
{
  "id": "abc-123-def",
  "status": "PROCESSING",
  "progress": 45,
  "downloadUrl": null
}
```

### 4. Download Clip

Once status is `COMPLETED`:

```bash
# Download URL will be available
curl -O http://localhost:8000/temp/filename.mp4
```

---

## Verify Installation

### Check API Server

```bash
curl http://localhost:8000/health
```

**Expected:**
```json
{
  "status": "healthy",
  "environment": "development"
}
```

### Check Celery Worker

```bash
celery -A workers.celery_app inspect active
```

Should show active workers.

### Check Database Connection

```bash
# Using Docker
docker exec -it clipscutter-postgres psql -U postgres -d clipsCutter -c "SELECT COUNT(*) FROM \"Clip\";"
```

---

## Common Issues

### Port Already in Use

```bash
# Change port in docker-compose.yml or .env
API_PORT=8001
```

### Database Connection Error

```bash
# Ensure PostgreSQL is running
docker-compose up -d postgres

# Check connection
docker exec -it clipscutter-postgres pg_isready
```

### Redis Connection Error

```bash
# Ensure Redis is running
docker-compose up -d redis

# Test connection
docker exec -it clipscutter-redis redis-cli ping
```

### Worker Not Processing

```bash
# Check worker logs
docker-compose logs -f worker

# Restart worker
docker-compose restart worker
```

---

## Next Steps

1. ✅ **Read API Documentation**: http://localhost:8000/docs
2. 📚 **Review Architecture**: [docs/architecture/overview.md](../architecture/overview.md)
3. 🔧 **Configure Settings**: [docs/guides/configuration.md](configuration.md)
4. 🚀 **Deploy to Production**: [docs/guides/production.md](production.md)
5. 🔗 **Integrate with Next.js**: [docs/guides/nextjs-integration.md](nextjs-integration.md)

---

## Stopping Services

### Docker

```bash
# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

### Local

```bash
# Stop API server: Ctrl+C
# Stop Celery worker: Ctrl+C
# Stop PostgreSQL/Redis: docker-compose down postgres redis
```

---

## Getting Help

- 📖 [Full Documentation](../README.md)
- 🐛 [Troubleshooting Guide](troubleshooting.md)
- ❓ [FAQ](faq.md)
