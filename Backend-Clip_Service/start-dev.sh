#!/bin/bash

echo "🚀 Starting Hybrid Development Environment..."
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Start PostgreSQL and Redis in Docker
echo "📦 Starting PostgreSQL and Redis in Docker..."
docker-compose up -d postgres redis

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 5

# Check if services are running
echo ""
echo "✅ Checking services..."
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "NAME|postgres|redis"

# Test connections
echo ""
echo "🔍 Testing connections..."

# Test PostgreSQL
if docker exec clipscutter-postgres pg_isready -U postgres > /dev/null 2>&1; then
    echo "✅ PostgreSQL is ready"
else
    echo "❌ PostgreSQL is not ready"
fi

# Test Redis
if docker exec clipscutter-redis redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis is ready"
else
    echo "❌ Redis is not ready"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ Docker services are ready!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 Next steps:"
echo ""
echo "   Terminal 1 (API Server):"
echo "   $ source venv/bin/activate"
echo "   $ uvicorn app.main:app --reload --port 8000"
echo ""
echo "   Terminal 2 (Celery Worker):"
echo "   $ source venv/bin/activate"
echo "   $ celery -A workers.celery_app worker --loglevel=info"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 Services:"
echo "   PostgreSQL: localhost:5432"
echo "   Redis:      localhost:6379"
echo "   API:        http://localhost:8000 (after starting)"
echo ""
echo "📚 Documentation: docs/guides/hybrid-setup.md"
echo ""
