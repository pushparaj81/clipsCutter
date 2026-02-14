#!/bin/bash

# Setup script for Backend Clip Service

echo "🚀 Setting up Backend Clip Service..."

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.11+"
    exit 1
fi

echo "✅ Python found: $(python3 --version)"

# Create virtual environment
echo "📦 Creating virtual environment..."
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Upgrade pip
echo "⬆️  Upgrading pip..."
pip install --upgrade pip

# Install dependencies
echo "📚 Installing dependencies..."
pip install -r requirements.txt

# Copy environment file
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your configuration"
else
    echo "✅ .env file already exists"
fi

# Create temp directory
mkdir -p public/temp
touch public/temp/.gitkeep

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your database and Redis URLs"
echo "2. Start PostgreSQL and Redis:"
echo "   docker-compose up -d postgres redis"
echo "3. Run the API server:"
echo "   source venv/bin/activate"
echo "   uvicorn app.main:app --reload --port 8000"
echo "4. In another terminal, start Celery worker:"
echo "   source venv/bin/activate"
echo "   celery -A workers.celery_app worker --loglevel=info"
echo ""
echo "Or use Docker Compose to run everything:"
echo "   docker-compose up -d"
echo ""
