# Backend Clip Service

Python-based video clipping microservice using FastAPI, Celery, yt-dlp, and FFmpeg.

## Features

- 🚀 **FastAPI** - Modern, fast web framework
- 🎬 **yt-dlp** - Native Python YouTube downloader
- ✂️ **FFmpeg** - Video processing and trimming
- 📦 **Celery** - Async task queue with Redis
- 🗄️ **PostgreSQL** - Database with SQLAlchemy ORM
- 🐳 **Docker** - Containerized deployment

## Quick Start

### 1. Environment Setup

```bash
# Copy environment file
cp .env.example .env

# Edit .env with your settings
nano .env
```

### 2. Choose Your Setup Mode

#### Option A: Hybrid Mode (Recommended for Development)

**Database & Redis in Docker, Python app runs locally**

```bash
# Start dependencies
./start-dev.sh

# Terminal 1: Run API
source venv/bin/activate
uvicorn app.main:app --reload --port 8000

# Terminal 2: Run Worker
source venv/bin/activate
celery -A workers.celery_app worker --loglevel=info
```

**Benefits:** Fast reload, easy debugging, persistent database

#### Option B: Full Docker Mode

**Everything runs in Docker**

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

**Benefits:** One command, consistent environment

See [Hybrid Setup Guide](docs/guides/hybrid-setup.md) for detailed instructions.

### 3. Run Locally (Development)

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start PostgreSQL and Redis (via Docker)
docker-compose up -d postgres redis

# Run FastAPI server
uvicorn app.main:app --reload --port 8000

# In another terminal, start Celery worker
celery -A workers.celery_app worker --loglevel=info --concurrency=5
```

## API Endpoints

### Base URL: `http://localhost:8000`

### 1. Get Video Info
```bash
POST /api/info
Content-Type: application/json

{
  "url": "https://youtube.com/watch?v=VIDEO_ID"
}
```

### 2. Create Clip
```bash
POST /api/clip
Content-Type: application/json

{
  "videoId": "VIDEO_ID",
  "startTime": 0,
  "endTime": 30,
  "format": "mp4",
  "quality": "720p",
  "title": "My Clip"
}
```

### 3. Check Status
```bash
GET /api/status?id=CLIP_ID
```

## API Documentation

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Project Structure

```
Backend-Clip_Service/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application
│   ├── config.py            # Settings
│   ├── database.py          # Database connection
│   ├── models.py            # SQLAlchemy models
│   ├── schemas.py           # Pydantic schemas
│   └── api/
│       ├── info.py          # Video metadata endpoint
│       ├── clip.py          # Clip creation endpoint
│       └── status.py        # Status check endpoint
├── workers/
│   ├── celery_app.py        # Celery configuration
│   └── tasks.py             # Celery tasks
├── services/
│   ├── downloader.py        # yt-dlp wrapper
│   └── ffmpeg_service.py    # FFmpeg wrapper
├── requirements.txt
├── Dockerfile
├── docker-compose.yml
└── .env.example
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://...` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379/0` |
| `APP_ENV` | Environment (development/production) | `development` |
| `DEBUG` | Debug mode | `True` |
| `API_PORT` | API server port | `8000` |
| `ALLOWED_ORIGINS` | CORS allowed origins | `http://localhost:3000` |
| `TEMP_DIR` | Temporary files directory | `./public/temp` |
| `MAX_CLIP_DURATION` | Max clip duration (seconds) | `600` |
| `MAX_CONCURRENT_WORKERS` | Celery worker concurrency | `5` |

## Development

### Run Tests
```bash
pytest tests/
```

### Check Celery Tasks
```bash
# List active tasks
celery -A workers.celery_app inspect active

# Check registered tasks
celery -A workers.celery_app inspect registered
```

### Monitor with Flower (Optional)
```bash
pip install flower
celery -A workers.celery_app flower --port=5555
# Open http://localhost:5555
```

## Integration with Next.js

Update Next.js to call Python backend:

```typescript
// .env.local
NEXT_PUBLIC_API_URL=http://localhost:8000

// Example API call
const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/clip`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    videoId: 'VIDEO_ID',
    startTime: 0,
    endTime: 30,
    format: 'mp4'
  })
})
```

## Production Deployment

1. **Set production environment variables**
2. **Use managed PostgreSQL and Redis**
3. **Scale workers**: `docker-compose up -d --scale worker=5`
4. **Add reverse proxy** (Nginx/Caddy)
5. **Enable HTTPS**
6. **Set up monitoring** (Sentry, Prometheus)

## License

MIT
