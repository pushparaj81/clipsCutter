# Configuration Guide

Complete guide to configuring the Backend Clip Service.

## Environment Variables

All configuration is done through environment variables, defined in `.env` file.

### Creating .env File

```bash
cp .env.example .env
nano .env
```

---

## Core Settings

### Database

```bash
# PostgreSQL connection string
DATABASE_URL=postgresql://user:password@host:port/database

# Examples:
# Local: postgresql://postgres:postgres@localhost:5432/clipsCutter
# Docker: postgresql://postgres:postgres@postgres:5432/clipsCutter
# Production: postgresql://user:pass@db.example.com:5432/clipscutter
```

**Connection Pool Settings** (in code):
- `pool_size`: 10 connections
- `max_overflow`: 20 connections
- `pool_pre_ping`: True (check connection health)

---

### Redis

```bash
# Redis connection string
REDIS_URL=redis://host:port/db

# Examples:
# Local: redis://localhost:6379/0
# Docker: redis://redis:6379/0
# Production with password: redis://:password@redis.example.com:6379/0
```

---

### Application

```bash
# Environment: development | staging | production
APP_ENV=development

# Debug mode (enables detailed error messages)
DEBUG=True

# API server port
API_PORT=8000
```

---

### CORS

```bash
# Comma-separated list of allowed origins
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,https://yourdomain.com

# For development (allow all - NOT for production):
# ALLOWED_ORIGINS=*
```

---

### File Storage

```bash
# Directory for temporary files
TEMP_DIR=./public/temp

# Maximum file age in hours before cleanup
MAX_FILE_AGE_HOURS=1
```

**Production Recommendation:**
Use object storage (S3, Spaces) instead of local filesystem.

---

### Video Processing

```bash
# Maximum clip duration in seconds (default: 600 = 10 minutes)
MAX_CLIP_DURATION=600

# Maximum concurrent Celery workers
MAX_CONCURRENT_WORKERS=5
```

---

### Optional: Custom Binary Paths

```bash
# Custom yt-dlp binary path (if not in PATH)
YT_DLP_PATH=/usr/local/bin/yt-dlp

# Custom FFmpeg binary path (if not in PATH)
FFMPEG_PATH=/usr/local/bin/ffmpeg
```

---

## Configuration Examples

### Development

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/clipsCutter
REDIS_URL=redis://localhost:6379/0
APP_ENV=development
DEBUG=True
API_PORT=8000
ALLOWED_ORIGINS=http://localhost:3000
TEMP_DIR=./public/temp
MAX_FILE_AGE_HOURS=1
MAX_CLIP_DURATION=600
MAX_CONCURRENT_WORKERS=3
```

### Production

```bash
DATABASE_URL=postgresql://produser:securepass@db.example.com:5432/clipscutter
REDIS_URL=redis://:redispass@redis.example.com:6379/0
APP_ENV=production
DEBUG=False
API_PORT=8000
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
TEMP_DIR=/var/app/temp
MAX_FILE_AGE_HOURS=2
MAX_CLIP_DURATION=600
MAX_CONCURRENT_WORKERS=10
```

### Docker Compose

Environment variables are set in `docker-compose.yml`:

```yaml
environment:
  DATABASE_URL: postgresql://postgres:postgres@postgres:5432/clipsCutter
  REDIS_URL: redis://redis:6379/0
  APP_ENV: production
  DEBUG: "False"
  ALLOWED_ORIGINS: http://localhost:3000
```

---

## Celery Configuration

Celery settings are in `workers/celery_app.py`:

### Task Settings

```python
task_serializer='json'           # Use JSON for serialization
accept_content=['json']          # Accept only JSON
result_serializer='json'         # Results in JSON
timezone='UTC'                   # Use UTC timezone
enable_utc=True                  # Enable UTC
task_track_started=True          # Track when tasks start
task_time_limit=3600             # 1 hour max per task
worker_prefetch_multiplier=1     # Prefetch 1 task at a time
worker_max_tasks_per_child=50    # Restart worker after 50 tasks
```

### Queue Configuration

```python
task_routes = {
    'workers.tasks.process_clip': {'queue': 'clips'},
}
```

### Retry Configuration

In `workers/tasks.py`:

```python
@celery_app.task(
    bind=True,
    max_retries=3,
    default_retry_delay=60  # Retry after 60 seconds
)
```

---

## Database Configuration

### SQLAlchemy Settings

In `app/database.py`:

```python
engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,      # Check connection before using
    pool_size=10,            # Connection pool size
    max_overflow=20          # Max additional connections
)
```

### Migration (Future)

For database migrations, use Alembic:

```bash
# Initialize Alembic
alembic init alembic

# Create migration
alembic revision --autogenerate -m "description"

# Apply migration
alembic upgrade head
```

---

## Logging Configuration

### Log Levels

In `app/main.py`:

```python
logging.basicConfig(
    level=logging.INFO if not settings.debug else logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
```

### Log to File

```python
import logging
from logging.handlers import RotatingFileHandler

handler = RotatingFileHandler(
    'logs/app.log',
    maxBytes=10485760,  # 10MB
    backupCount=5
)
logging.getLogger().addHandler(handler)
```

---

## Security Configuration

### Production Checklist

- [ ] Set `DEBUG=False`
- [ ] Use strong database passwords
- [ ] Enable Redis password authentication
- [ ] Restrict `ALLOWED_ORIGINS` to your domain
- [ ] Use HTTPS/TLS
- [ ] Set up firewall rules
- [ ] Enable rate limiting
- [ ] Implement authentication
- [ ] Regular security updates

### Example: Redis with Password

```bash
# .env
REDIS_URL=redis://:your-strong-password@redis:6379/0
```

```yaml
# docker-compose.yml
redis:
  image: redis:alpine
  command: redis-server --requirepass your-strong-password
```

---

## Performance Tuning

### Worker Concurrency

```bash
# Start worker with custom concurrency
celery -A workers.celery_app worker --concurrency=10
```

### Database Indexes

Add indexes for frequently queried fields:

```sql
CREATE INDEX idx_clip_status ON "Clip"(status);
CREATE INDEX idx_clip_created ON "Clip"("createdAt");
CREATE INDEX idx_clip_videoid ON "Clip"("videoId");
```

### Redis Memory

```bash
# Set max memory in docker-compose.yml
redis:
  command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
```

---

## Monitoring Configuration

### Health Check Endpoint

Already configured at `/health`:

```bash
curl http://localhost:8000/health
```

### Prometheus Metrics (Future)

Install prometheus-fastapi-instrumentator:

```python
from prometheus_fastapi_instrumentator import Instrumentator

Instrumentator().instrument(app).expose(app)
```

---

## Validation

### Test Configuration

```bash
# Check if all required variables are set
python -c "from app.config import settings; print(settings.dict())"
```

### Environment-Specific Validation

```python
# app/config.py
from pydantic import validator

class Settings(BaseSettings):
    @validator('debug')
    def validate_production_debug(cls, v, values):
        if values.get('app_env') == 'production' and v:
            raise ValueError('DEBUG must be False in production')
        return v
```

---

## Troubleshooting

### Configuration Not Loading

1. Check `.env` file exists
2. Verify file permissions
3. Check for syntax errors
4. Restart services

### Database Connection Issues

```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1"
```

### Redis Connection Issues

```bash
# Test connection
redis-cli -u $REDIS_URL ping
```

---

## Next Steps

- [Development Guide](development.md)
- [Production Deployment](production.md)
- [Monitoring Setup](monitoring.md)
