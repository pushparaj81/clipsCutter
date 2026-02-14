# Backend Clip Service Documentation

Welcome to the Backend Clip Service documentation. This service provides a Python-based video clipping API using FastAPI, Celery, yt-dlp, and FFmpeg.

## 📚 Documentation Index

### Getting Started
- [Quick Start Guide](guides/quickstart.md) - Get up and running in 5 minutes
- [Hybrid Setup Guide](guides/hybrid-setup.md) - Docker + Local development
- [Installation Guide](guides/installation.md) - Detailed installation instructions
- [Configuration Guide](guides/configuration.md) - Environment variables and settings

### Architecture
- [System Architecture](architecture/overview.md) - High-level system design
- [Database Schema](architecture/database.md) - Database models and relationships
- [Queue System](architecture/queue.md) - Celery task queue architecture

### API Reference
- [API Overview](api/overview.md) - API endpoints summary
- [Video Info Endpoint](api/info.md) - GET video metadata
- [Clip Creation Endpoint](api/clip.md) - Create clip jobs
- [Status Endpoint](api/status.md) - Check processing status
- [Error Handling](api/errors.md) - Error codes and responses

### Development
- [Development Setup](guides/development.md) - Local development environment
- [Testing Guide](guides/testing.md) - Running tests
- [Contributing Guide](guides/contributing.md) - How to contribute

### Deployment
- [Docker Deployment](guides/docker.md) - Deploy with Docker Compose
- [Production Deployment](guides/production.md) - Production best practices
- [Monitoring](guides/monitoring.md) - Logging and monitoring

### Integration
- [Next.js Integration](guides/nextjs-integration.md) - Frontend integration guide
- [API Client Examples](guides/api-examples.md) - Code examples in different languages

## 🚀 Quick Links

- **API Documentation**: http://localhost:8000/docs (Swagger UI)
- **Alternative API Docs**: http://localhost:8000/redoc (ReDoc)
- **Health Check**: http://localhost:8000/health

## 🏗️ Project Structure

```
Backend-Clip_Service/
├── app/                    # FastAPI application
│   ├── api/               # API endpoints
│   ├── main.py            # Application entry point
│   ├── models.py          # Database models
│   └── schemas.py         # Pydantic schemas
├── workers/               # Celery workers
│   ├── celery_app.py     # Celery configuration
│   └── tasks.py          # Background tasks
├── services/              # Business logic
│   ├── downloader.py     # yt-dlp wrapper
│   └── ffmpeg_service.py # FFmpeg wrapper
├── docs/                  # Documentation (you are here)
├── tests/                 # Test suite
└── docker-compose.yml     # Docker configuration
```

## 🔑 Key Features

- ✅ **FastAPI** - Modern, fast web framework with auto-docs
- ✅ **yt-dlp** - Native Python YouTube downloader
- ✅ **FFmpeg** - Professional video processing
- ✅ **Celery** - Distributed task queue
- ✅ **PostgreSQL** - Reliable database
- ✅ **Docker** - Easy deployment

## 📞 Support

For issues and questions:
- Check the [FAQ](guides/faq.md)
- Review [Troubleshooting Guide](guides/troubleshooting.md)
- Open an issue on GitHub

## 📄 License

MIT License - See LICENSE file for details
