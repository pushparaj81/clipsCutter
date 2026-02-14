# Hybrid Development Setup Guide

Run Backend Clip Service in **Docker** or **Local** mode - your choice!

## 🎯 Setup Options

### Option 1: Full Docker (Easiest)
Everything runs in Docker containers.

### Option 2: Hybrid (Recommended for Development)
- Database & Redis in Docker
- Python app runs locally

### Option 3: Full Local
Everything runs on your machine.

---

## Option 1: Full Docker Setup

### Start Everything

```bash
cd Backend-Clip_Service

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

**Services:**
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`
- API: `localhost:8000`
- Worker: Running in background
- Beat: Running in background

**Pros:**
- ✅ One command to start everything
- ✅ Consistent environment
- ✅ Easy cleanup

**Cons:**
- ❌ Slower code reload
- ❌ Harder to debug

---

## Option 2: Hybrid Setup (Recommended)

### Step 1: Start Only Database & Redis

```bash
cd Backend-Clip_Service

# Start only PostgreSQL and Redis
docker-compose up -d postgres redis

# Verify they're running
docker ps
```

### Step 2: Setup Python Environment

```bash
# Create virtual environment (first time only)
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate  # Linux/Mac
# OR
venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt
```

### Step 3: Configure Environment

```bash
# Copy environment file
cp .env.example .env

# Edit .env - use localhost for DB and Redis
nano .env
```

**Important:** Use `localhost` instead of Docker service names:

```bash
# .env for local development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/clipsCutter
REDIS_URL=redis://localhost:6379/0
APP_ENV=development
DEBUG=True
API_PORT=8000
ALLOWED_ORIGINS=http://localhost:3000
```

### Step 4: Run API Server Locally

```bash
# Make sure venv is activated
source venv/bin/activate

# Run API server
uvicorn app.main:app --reload --port 8000
```

**Output:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete.
```

### Step 5: Run Celery Worker Locally (New Terminal)

```bash
# Activate venv
source venv/bin/activate

# Run worker
celery -A workers.celery_app worker --loglevel=info --concurrency=3
```

### Step 6: Test

```bash
# Test API
curl http://localhost:8000/health

# Test video info
curl -X POST http://localhost:8000/api/info \
  -H "Content-Type: application/json" \
  -d '{"url": "https://youtube.com/watch?v=dQw4w9WgXcQ"}'
```

**Pros:**
- ✅ Fast code reload (--reload)
- ✅ Easy debugging
- ✅ See logs directly
- ✅ Database in Docker (consistent)

**Cons:**
- ❌ Need multiple terminals
- ❌ Manual dependency management

---

## Option 3: Full Local Setup

### Prerequisites

```bash
# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Install Redis
sudo apt install redis-server

# Install FFmpeg
sudo apt install ffmpeg

# Install yt-dlp
pip install yt-dlp
```

### Setup Database

```bash
# Start PostgreSQL
sudo systemctl start postgresql

# Create database
sudo -u postgres psql -c "CREATE DATABASE clipsCutter;"
sudo -u postgres psql -c "CREATE USER postgres WITH PASSWORD 'postgres';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE clipsCutter TO postgres;"
```

### Setup Redis

```bash
# Start Redis
sudo systemctl start redis-server

# Test
redis-cli ping
```

### Configure & Run

```bash
# .env for full local
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/clipsCutter
REDIS_URL=redis://localhost:6379/0

# Run API
uvicorn app.main:app --reload --port 8000

# Run worker (new terminal)
celery -A workers.celery_app worker --loglevel=info
```

---

## Quick Reference

### Start Services

| Component | Docker | Local |
|-----------|--------|-------|
| PostgreSQL | `docker-compose up -d postgres` | `sudo systemctl start postgresql` |
| Redis | `docker-compose up -d redis` | `sudo systemctl start redis-server` |
| API | `docker-compose up -d api` | `uvicorn app.main:app --reload` |
| Worker | `docker-compose up -d worker` | `celery -A workers.celery_app worker` |

### Stop Services

| Component | Docker | Local |
|-----------|--------|-------|
| All | `docker-compose down` | Stop terminals + `systemctl stop` |
| PostgreSQL | `docker-compose stop postgres` | `sudo systemctl stop postgresql` |
| Redis | `docker-compose stop redis` | `sudo systemctl stop redis-server` |

### View Logs

| Component | Docker | Local |
|-----------|--------|-------|
| API | `docker logs -f clipscutter-api` | Terminal output |
| Worker | `docker logs -f clipscutter-worker` | Terminal output |
| PostgreSQL | `docker logs clipscutter-postgres` | `sudo journalctl -u postgresql` |

---

## Switching Between Modes

### From Docker to Local

```bash
# 1. Stop Docker services
docker-compose down

# 2. Keep only DB & Redis
docker-compose up -d postgres redis

# 3. Update .env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/clipsCutter
REDIS_URL=redis://localhost:6379/0

# 4. Run locally
source venv/bin/activate
uvicorn app.main:app --reload
```

### From Local to Docker

```bash
# 1. Stop local processes (Ctrl+C)

# 2. Update .env (or use docker-compose env vars)
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/clipsCutter
REDIS_URL=redis://redis:6379/0

# 3. Start Docker
docker-compose up -d
```

---

## Development Workflow (Recommended)

**Daily Workflow:**

```bash
# Morning: Start dependencies
cd Backend-Clip_Service
docker-compose up -d postgres redis

# Activate Python environment
source venv/bin/activate

# Terminal 1: Run API
uvicorn app.main:app --reload --port 8000

# Terminal 2: Run Worker
celery -A workers.celery_app worker --loglevel=info

# Make code changes - API auto-reloads!

# Evening: Stop everything
# Ctrl+C in both terminals
docker-compose stop postgres redis
```

**Benefits:**
- 🚀 Fast development (auto-reload)
- 🐛 Easy debugging
- 💾 Persistent database (Docker volume)
- 🔄 Consistent Redis

---

## Troubleshooting

### Port Already in Use

**PostgreSQL (5432):**
```bash
# Check what's using port
sudo lsof -i :5432

# Stop local PostgreSQL if running
sudo systemctl stop postgresql
```

**Redis (6379):**
```bash
# Check what's using port
sudo lsof -i :6379

# Stop local Redis if running
sudo systemctl stop redis-server
```

**API (8000):**
```bash
# Check what's using port
sudo lsof -i :8000

# Kill process
kill -9 <PID>
```

### Database Connection Error

**Check if PostgreSQL is running:**
```bash
# Docker
docker ps | grep postgres

# Local
sudo systemctl status postgresql
```

**Test connection:**
```bash
# Docker
docker exec -it clipscutter-postgres psql -U postgres -d clipsCutter -c "SELECT 1"

# Local
psql -U postgres -d clipsCutter -c "SELECT 1"
```

### Worker Not Processing

**Check Redis connection:**
```bash
# Docker
docker exec -it clipscutter-redis redis-cli ping

# Local
redis-cli ping
```

**Restart worker:**
```bash
# Docker
docker-compose restart worker

# Local
# Ctrl+C and restart
celery -A workers.celery_app worker --loglevel=info
```

---

## Environment Variables

### Docker Mode

```bash
# docker-compose.yml handles these
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/clipsCutter
REDIS_URL=redis://redis:6379/0
```

### Local Mode

```bash
# .env file
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/clipsCutter
REDIS_URL=redis://localhost:6379/0
```

---

## Helper Scripts

### Start Hybrid Mode

Create `start-dev.sh`:

```bash
#!/bin/bash
echo "🚀 Starting development environment..."

# Start Docker services
echo "📦 Starting PostgreSQL and Redis..."
docker-compose up -d postgres redis

# Wait for services
sleep 3

# Check services
echo "✅ Checking services..."
docker ps | grep -E "postgres|redis"

echo ""
echo "✅ Ready! Now run:"
echo "   Terminal 1: source venv/bin/activate && uvicorn app.main:app --reload"
echo "   Terminal 2: source venv/bin/activate && celery -A workers.celery_app worker --loglevel=info"
```

```bash
chmod +x start-dev.sh
./start-dev.sh
```

### Stop All

Create `stop-dev.sh`:

```bash
#!/bin/bash
echo "🛑 Stopping all services..."

# Stop Docker
docker-compose down

echo "✅ All services stopped"
```

```bash
chmod +x stop-dev.sh
./stop-dev.sh
```

---

## Summary

**Best for Development:** Option 2 (Hybrid)
- Database & Redis in Docker
- Python app runs locally
- Fast reload, easy debugging

**Best for Testing:** Option 1 (Full Docker)
- Everything in containers
- Consistent environment

**Best for Learning:** Option 3 (Full Local)
- Understand each component
- Full control

Choose what works best for you! 🚀
