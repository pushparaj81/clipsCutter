# Production Deployment Guide

Complete guide for deploying Backend Clip Service to production.

## Pre-Deployment Checklist

### Security
- [ ] Set `DEBUG=False`
- [ ] Use strong passwords for database and Redis
- [ ] Configure HTTPS/TLS
- [ ] Set up firewall rules
- [ ] Implement rate limiting
- [ ] Add authentication (API keys/JWT)
- [ ] Review CORS settings
- [ ] Enable security headers

### Infrastructure
- [ ] Set up managed PostgreSQL
- [ ] Set up managed Redis
- [ ] Configure object storage (S3/Spaces)
- [ ] Set up CDN
- [ ] Configure load balancer
- [ ] Set up monitoring
- [ ] Configure logging
- [ ] Set up backups

### Application
- [ ] Update environment variables
- [ ] Test all endpoints
- [ ] Run database migrations
- [ ] Configure worker scaling
- [ ] Set up health checks
- [ ] Configure alerts

---

## Deployment Options

### Option 1: Docker on VPS (DigitalOcean, Linode, etc.)

#### 1. Server Setup

```bash
# SSH into server
ssh root@your-server-ip

# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt install docker-compose -y
```

#### 2. Deploy Application

```bash
# Clone repository
git clone https://github.com/your-repo/clipscutter.git
cd clipscutter/Backend-Clip_Service

# Create .env file
nano .env
# Add production environment variables

# Start services
docker-compose up -d

# Check logs
docker-compose logs -f
```

#### 3. Set Up Nginx Reverse Proxy

```nginx
# /etc/nginx/sites-available/clipscutter
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Enable site
ln -s /etc/nginx/sites-available/clipscutter /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx

# Set up SSL with Let's Encrypt
apt install certbot python3-certbot-nginx -y
certbot --nginx -d api.yourdomain.com
```

---

### Option 2: AWS Deployment

#### Architecture

```
┌─────────────┐
│   Route 53  │ (DNS)
└──────┬──────┘
       │
┌──────▼──────┐
│     ALB     │ (Load Balancer)
└──────┬──────┘
       │
┌──────▼──────┐
│     ECS     │ (Container Service)
│  ┌────────┐ │
│  │  API   │ │
│  │ Worker │ │
│  └────────┘ │
└─────────────┘
       │
   ┌───┴───┐
   │       │
┌──▼──┐ ┌──▼──┐
│ RDS │ │Redis│
└─────┘ └─────┘
```

#### 1. Set Up RDS (PostgreSQL)

```bash
# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier clipscutter-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username admin \
  --master-user-password YourPassword \
  --allocated-storage 20
```

#### 2. Set Up ElastiCache (Redis)

```bash
# Create Redis cluster
aws elasticache create-cache-cluster \
  --cache-cluster-id clipscutter-redis \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --num-cache-nodes 1
```

#### 3. Deploy to ECS

```bash
# Build and push Docker image
docker build -t clipscutter-api .
docker tag clipscutter-api:latest your-ecr-repo/clipscutter-api:latest
docker push your-ecr-repo/clipscutter-api:latest

# Create ECS task definition
# Create ECS service
# Configure ALB
```

---

### Option 3: Kubernetes (GKE, EKS, AKS)

#### deployment.yaml

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: clipscutter-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: clipscutter-api
  template:
    metadata:
      labels:
        app: clipscutter-api
    spec:
      containers:
      - name: api
        image: your-registry/clipscutter-api:latest
        ports:
        - containerPort: 8000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: clipscutter-secrets
              key: database-url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: clipscutter-secrets
              key: redis-url
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: clipscutter-worker
spec:
  replicas: 5
  selector:
    matchLabels:
      app: clipscutter-worker
  template:
    metadata:
      labels:
        app: clipscutter-worker
    spec:
      containers:
      - name: worker
        image: your-registry/clipscutter-api:latest
        command: ["celery", "-A", "workers.celery_app", "worker", "--loglevel=info"]
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: clipscutter-secrets
              key: database-url
```

---

## Environment Variables (Production)

```bash
# Database
DATABASE_URL=postgresql://user:pass@prod-db.example.com:5432/clipscutter

# Redis
REDIS_URL=redis://:password@prod-redis.example.com:6379/0

# Application
APP_ENV=production
DEBUG=False
API_PORT=8000

# CORS
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Storage
TEMP_DIR=/var/app/temp
MAX_FILE_AGE_HOURS=2

# Processing
MAX_CLIP_DURATION=600
MAX_CONCURRENT_WORKERS=10

# Optional: Object Storage
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_S3_BUCKET=clipscutter-files
AWS_REGION=us-east-1
```

---

## Scaling

### Horizontal Scaling

#### API Servers

```bash
# Docker Compose
docker-compose up -d --scale api=3

# Kubernetes
kubectl scale deployment clipscutter-api --replicas=5
```

#### Workers

```bash
# Docker Compose
docker-compose up -d --scale worker=10

# Kubernetes
kubectl scale deployment clipscutter-worker --replicas=20
```

### Auto-Scaling (Kubernetes)

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: clipscutter-api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: clipscutter-api
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

---

## Monitoring

### Prometheus + Grafana

```yaml
# docker-compose.yml
prometheus:
  image: prom/prometheus
  volumes:
    - ./prometheus.yml:/etc/prometheus/prometheus.yml
  ports:
    - "9090:9090"

grafana:
  image: grafana/grafana
  ports:
    - "3000:3000"
  environment:
    - GF_SECURITY_ADMIN_PASSWORD=admin
```

### Sentry (Error Tracking)

```python
# app/main.py
import sentry_sdk

sentry_sdk.init(
    dsn="your-sentry-dsn",
    environment=settings.app_env,
    traces_sample_rate=1.0,
)
```

---

## Backups

### Database Backups

```bash
# Automated daily backups
0 2 * * * pg_dump $DATABASE_URL | gzip > /backups/db-$(date +\%Y\%m\%d).sql.gz

# Retention: Keep last 30 days
find /backups -name "db-*.sql.gz" -mtime +30 -delete
```

### Redis Persistence

```yaml
# docker-compose.yml
redis:
  command: redis-server --appendonly yes
  volumes:
    - redis_data:/data
```

---

## Security Best Practices

### 1. Use Secrets Management

```bash
# AWS Secrets Manager
aws secretsmanager create-secret \
  --name clipscutter/database-url \
  --secret-string "postgresql://..."
```

### 2. Enable Rate Limiting

```python
# Install: pip install slowapi
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

@app.post("/api/clip")
@limiter.limit("10/minute")
async def create_clip(...):
    ...
```

### 3. Add API Authentication

```python
from fastapi import Depends, HTTPException, Security
from fastapi.security import APIKeyHeader

api_key_header = APIKeyHeader(name="X-API-Key")

async def verify_api_key(api_key: str = Security(api_key_header)):
    if api_key != settings.api_key:
        raise HTTPException(403, "Invalid API key")
    return api_key

@app.post("/api/clip", dependencies=[Depends(verify_api_key)])
async def create_clip(...):
    ...
```

---

## Health Checks

### Liveness Probe

```yaml
# Kubernetes
livenessProbe:
  httpGet:
    path: /health
    port: 8000
  initialDelaySeconds: 30
  periodSeconds: 10
```

### Readiness Probe

```yaml
readinessProbe:
  httpGet:
    path: /health
    port: 8000
  initialDelaySeconds: 5
  periodSeconds: 5
```

---

## CI/CD Pipeline

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Build Docker image
        run: docker build -t clipscutter-api .
      
      - name: Push to registry
        run: |
          docker tag clipscutter-api registry.example.com/clipscutter-api:latest
          docker push registry.example.com/clipscutter-api:latest
      
      - name: Deploy to server
        run: |
          ssh user@server "cd /app && docker-compose pull && docker-compose up -d"
```

---

## Rollback Strategy

```bash
# Tag releases
docker tag clipscutter-api:latest clipscutter-api:v1.0.0

# Rollback to previous version
docker-compose down
docker pull clipscutter-api:v0.9.0
docker tag clipscutter-api:v0.9.0 clipscutter-api:latest
docker-compose up -d
```

---

## Performance Optimization

### 1. Enable Caching

```python
from fastapi_cache import FastAPICache
from fastapi_cache.backends.redis import RedisBackend

@app.on_event("startup")
async def startup():
    redis = aioredis.from_url(settings.redis_url)
    FastAPICache.init(RedisBackend(redis), prefix="fastapi-cache")
```

### 2. Use CDN

```nginx
# Nginx CDN configuration
location /temp/ {
    proxy_cache my_cache;
    proxy_cache_valid 200 1h;
    proxy_pass http://localhost:8000/temp/;
}
```

### 3. Database Optimization

```sql
-- Add indexes
CREATE INDEX idx_clip_status ON "Clip"(status);
CREATE INDEX idx_clip_created ON "Clip"("createdAt" DESC);

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM "Clip" WHERE status = 'PROCESSING';
```

---

## Troubleshooting Production Issues

See [Troubleshooting Guide](troubleshooting.md) for common issues and solutions.

---

## Cost Optimization

### AWS Cost Estimates

| Service | Configuration | Monthly Cost |
|---------|--------------|--------------|
| RDS (PostgreSQL) | db.t3.micro | ~$15 |
| ElastiCache (Redis) | cache.t3.micro | ~$12 |
| ECS Fargate | 2 vCPU, 4GB RAM | ~$30 |
| ALB | Standard | ~$20 |
| S3 | 100GB storage | ~$3 |
| **Total** | | **~$80/month** |

### DigitalOcean Cost

| Service | Configuration | Monthly Cost |
|---------|--------------|--------------|
| Droplet | 2 vCPU, 4GB RAM | $24 |
| Managed PostgreSQL | 1GB RAM | $15 |
| Managed Redis | 1GB RAM | $15 |
| Spaces (Storage) | 250GB | $5 |
| **Total** | | **~$59/month** |

---

## Next Steps

- [Monitoring Guide](monitoring.md)
- [Troubleshooting Guide](troubleshooting.md)
- [API Documentation](../api/overview.md)
