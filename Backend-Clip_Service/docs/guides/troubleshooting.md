# Troubleshooting Guide

Common issues and solutions for Backend Clip Service.

## Table of Contents

- [Installation Issues](#installation-issues)
- [Connection Issues](#connection-issues)
- [Worker Issues](#worker-issues)
- [API Issues](#api-issues)
- [Performance Issues](#performance-issues)
- [Docker Issues](#docker-issues)

---

## Installation Issues

### Python Version Error

**Error:**
```
ERROR: This package requires Python 3.11 or higher
```

**Solution:**
```bash
# Check Python version
python3 --version

# Install Python 3.11
sudo apt install python3.11 python3.11-venv

# Use specific version
python3.11 -m venv venv
```

### Dependency Installation Fails

**Error:**
```
ERROR: Could not build wheels for psycopg2
```

**Solution:**
```bash
# Install system dependencies
sudo apt install python3-dev libpq-dev

# Or use binary version
pip install psycopg2-binary
```

---

## Connection Issues

### Database Connection Refused

**Error:**
```
sqlalchemy.exc.OperationalError: could not connect to server
```

**Solutions:**

1. **Check if PostgreSQL is running:**
```bash
docker ps | grep postgres
# OR
systemctl status postgresql
```

2. **Verify connection string:**
```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1"
```

3. **Check firewall:**
```bash
# Allow PostgreSQL port
sudo ufw allow 5432
```

4. **Check PostgreSQL logs:**
```bash
docker logs clipscutter-postgres
```

### Redis Connection Error

**Error:**
```
redis.exceptions.ConnectionError: Error connecting to Redis
```

**Solutions:**

1. **Check if Redis is running:**
```bash
docker ps | grep redis
# OR
redis-cli ping
```

2. **Test connection:**
```bash
redis-cli -u $REDIS_URL ping
```

3. **Check Redis logs:**
```bash
docker logs clipscutter-redis
```

### CORS Error

**Error:**
```
Access to fetch at 'http://localhost:8000/api/clip' has been blocked by CORS policy
```

**Solution:**

Update `ALLOWED_ORIGINS` in `.env`:
```bash
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

Or in `app/config.py`:
```python
allowed_origins: List[str] = ["http://localhost:3000"]
```

---

## Worker Issues

### Worker Not Processing Tasks

**Symptoms:**
- Clips stuck in PENDING status
- No worker logs

**Solutions:**

1. **Check if worker is running:**
```bash
# Docker
docker ps | grep worker

# Local
ps aux | grep celery
```

2. **Start worker:**
```bash
# Docker
docker-compose up -d worker

# Local
celery -A workers.celery_app worker --loglevel=info
```

3. **Check worker logs:**
```bash
docker logs -f clipscutter-worker
```

4. **Inspect active tasks:**
```bash
celery -A workers.celery_app inspect active
```

### Task Failures

**Error:**
```
Task workers.tasks.process_clip[uuid] raised unexpected: Exception('Download failed')
```

**Solutions:**

1. **Check worker error logs:**
```bash
cat logs/worker-error.log
```

2. **Check yt-dlp logs:**
```bash
cat logs/yt-dlp.log
```

3. **Test yt-dlp manually:**
```bash
yt-dlp --version
yt-dlp "https://youtube.com/watch?v=dQw4w9WgXcQ" --dump-json
```

4. **Check disk space:**
```bash
df -h
```

### Worker Memory Issues

**Error:**
```
MemoryError: Unable to allocate memory
```

**Solutions:**

1. **Reduce worker concurrency:**
```bash
celery -A workers.celery_app worker --concurrency=2
```

2. **Increase Docker memory:**
```yaml
# docker-compose.yml
worker:
  mem_limit: 2g
```

3. **Enable worker max tasks:**
```python
# workers/celery_app.py
worker_max_tasks_per_child=50  # Restart after 50 tasks
```

---

## API Issues

### 404 Not Found

**Error:**
```
{"detail":"Not Found"}
```

**Solutions:**

1. **Check endpoint URL:**
```bash
# Correct
POST http://localhost:8000/api/clip

# Wrong
POST http://localhost:8000/clip
```

2. **View available routes:**
```bash
curl http://localhost:8000/docs
```

### 500 Internal Server Error

**Error:**
```
{"detail":"Internal Server Error"}
```

**Solutions:**

1. **Check API logs:**
```bash
docker logs -f clipscutter-api
```

2. **Enable debug mode:**
```bash
DEBUG=True
```

3. **Check database connection:**
```bash
curl http://localhost:8000/health
```

### Request Timeout

**Error:**
```
Request timeout after 30 seconds
```

**Solutions:**

1. **Increase timeout:**
```python
# app/main.py
import uvicorn

uvicorn.run(app, timeout_keep_alive=120)
```

2. **Check if task is queued:**
```bash
celery -A workers.celery_app inspect active
```

---

## Performance Issues

### Slow Video Downloads

**Symptoms:**
- Downloads taking very long
- Progress stuck

**Solutions:**

1. **Check network speed:**
```bash
speedtest-cli
```

2. **Check yt-dlp version:**
```bash
yt-dlp --version
# Update if needed
pip install --upgrade yt-dlp
```

3. **Use lower quality:**
```json
{
  "quality": "360p"  // Instead of 1080p
}
```

4. **Check YouTube throttling:**
```bash
# Test download speed
yt-dlp "URL" --newline
```

### High Database Load

**Symptoms:**
- Slow API responses
- High CPU on database

**Solutions:**

1. **Add database indexes:**
```sql
CREATE INDEX idx_clip_status ON "Clip"(status);
CREATE INDEX idx_clip_created ON "Clip"("createdAt");
```

2. **Reduce progress update frequency:**
```python
# workers/tasks.py
if percent - last_progress >= 10:  # Update every 10% instead of 5%
    update_progress(percent)
```

3. **Use connection pooling:**
```python
# app/database.py
engine = create_engine(
    settings.database_url,
    pool_size=20,
    max_overflow=40
)
```

### High Memory Usage

**Solutions:**

1. **Limit worker concurrency:**
```bash
celery -A workers.celery_app worker --concurrency=3
```

2. **Enable worker recycling:**
```python
worker_max_tasks_per_child=50
```

3. **Monitor memory:**
```bash
docker stats
```

---

## Docker Issues

### Container Keeps Restarting

**Solutions:**

1. **Check container logs:**
```bash
docker logs clipscutter-api
docker logs clipscutter-worker
```

2. **Check health:**
```bash
docker inspect clipscutter-api | grep Health
```

3. **Remove restart policy temporarily:**
```yaml
# docker-compose.yml
api:
  restart: "no"  # Instead of "always"
```

### Port Already in Use

**Error:**
```
Error starting userland proxy: listen tcp 0.0.0.0:8000: bind: address already in use
```

**Solutions:**

1. **Find process using port:**
```bash
lsof -i :8000
# OR
netstat -tulpn | grep 8000
```

2. **Kill process:**
```bash
kill -9 <PID>
```

3. **Change port:**
```yaml
# docker-compose.yml
api:
  ports:
    - "8001:8000"
```

### Volume Permission Issues

**Error:**
```
PermissionError: [Errno 13] Permission denied: '/app/public/temp'
```

**Solutions:**

1. **Fix permissions:**
```bash
sudo chown -R $USER:$USER ./public/temp
chmod -R 755 ./public/temp
```

2. **Run as current user:**
```yaml
# docker-compose.yml
api:
  user: "${UID}:${GID}"
```

---

## Debugging Tips

### Enable Verbose Logging

```python
# app/main.py
import logging

logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
```

### Check System Resources

```bash
# CPU and Memory
htop

# Disk usage
df -h

# Docker stats
docker stats

# Process list
ps aux | grep python
```

### Test Components Individually

```bash
# Test database
psql $DATABASE_URL -c "SELECT COUNT(*) FROM \"Clip\""

# Test Redis
redis-cli -u $REDIS_URL ping

# Test yt-dlp
yt-dlp "https://youtube.com/watch?v=dQw4w9WgXcQ" --dump-json

# Test FFmpeg
ffmpeg -version
```

### Interactive Debugging

```python
# Add breakpoint in code
import pdb; pdb.set_trace()

# Or use ipdb
import ipdb; ipdb.set_trace()
```

---

## Getting Help

### Check Logs

```bash
# API logs
docker logs -f clipscutter-api

# Worker logs
docker logs -f clipscutter-worker

# All logs
docker-compose logs -f

# Application logs
tail -f logs/worker-error.log
tail -f logs/yt-dlp.log
```

### Health Checks

```bash
# API health
curl http://localhost:8000/health

# Database health
docker exec clipscutter-postgres pg_isready

# Redis health
docker exec clipscutter-redis redis-cli ping
```

### Community Support

- 📖 [Documentation](../README.md)
- 🐛 GitHub Issues
- 💬 Discord/Slack Community

---

## Common Error Codes

| Error Code | Meaning | Common Cause |
|------------|---------|--------------|
| 400 | Bad Request | Invalid input data |
| 404 | Not Found | Wrong endpoint or clip not found |
| 500 | Internal Server Error | Application error, check logs |
| 503 | Service Unavailable | Database/Redis down |

---

## Prevention

### Regular Maintenance

```bash
# Update dependencies
pip install --upgrade -r requirements.txt

# Clean old files
find ./public/temp -mtime +1 -delete

# Vacuum database
docker exec clipscutter-postgres vacuumdb -U postgres -d clipsCutter

# Restart services weekly
docker-compose restart
```

### Monitoring

Set up alerts for:
- High error rates
- Slow response times
- High memory usage
- Disk space low
- Worker queue length

---

## Still Having Issues?

1. Check [FAQ](faq.md)
2. Review [Configuration Guide](configuration.md)
3. Enable debug logging
4. Collect logs and error messages
5. Open GitHub issue with details
