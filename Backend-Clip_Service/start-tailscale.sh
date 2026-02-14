#!/bin/bash

echo "🌐 Starting Backend Clip Service for Tailscale Network..."
echo ""
echo "📍 Your Tailscale IP: 100.70.7.54"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Start PostgreSQL and Redis in Docker
echo "📦 Starting PostgreSQL and Redis..."
docker compose up -d postgres redis

# Wait for services
echo "⏳ Waiting for services to start..."
sleep 5

# Check services
echo ""
echo "✅ Docker services ready!"
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "NAME|postgres|redis"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ Ready for Tailscale Network Access!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 Next steps:"
echo ""
echo "   Terminal 1 (API Server - Accessible on Tailscale):"
echo "   $ source venv/bin/activate"
echo "   $ uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
echo ""
echo "   Terminal 2 (Celery Worker):"
echo "   $ source venv/bin/activate"
echo "   $ celery -A workers.celery_app worker --loglevel=info"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 Access URLs:"
echo "   Local:     http://localhost:8000"
echo "   Tailscale: http://100.70.7.54:8000"
echo ""
echo "📚 API Docs:"
echo "   Local:     http://localhost:8000/docs"
echo "   Tailscale: http://100.70.7.54:8000/docs"
echo ""
echo "💡 Test from any Tailscale device:"
echo "   curl http://100.70.7.54:8000/health"
echo ""
