#!/bin/bash

echo "🛑 Stopping Development Environment..."
echo ""

# Stop Docker containers
echo "📦 Stopping Docker services..."
docker compose down

echo ""
echo "✅ All services stopped!"
echo ""
echo "💡 Tip: To start again, run: ./start-dev.sh"
echo ""
