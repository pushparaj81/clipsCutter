from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.api import info, clip, status
from app.database import engine, Base
from app.config import settings
import os
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO if not settings.debug else logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

# Create database tables
Base.metadata.create_all(bind=engine)

# Create temp directory
os.makedirs(settings.temp_dir, exist_ok=True)

# Create FastAPI app
app = FastAPI(
    title="ClipsCutter API",
    version="2.0.0",
    description="Python-based video clipping service using yt-dlp and FFmpeg",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(info.router, prefix="/api", tags=["Info"])
app.include_router(clip.router, prefix="/api", tags=["Clip"])
app.include_router(status.router, prefix="/api/clips", tags=["Status"])

# Mount static files for downloads
if os.path.exists(settings.temp_dir):
    app.mount("/temp", StaticFiles(directory=settings.temp_dir), name="temp")


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": "ClipsCutter API",
        "version": "2.0.0",
        "status": "running",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "environment": settings.app_env
    }


@app.on_event("startup")
async def startup_event():
    """Startup event handler"""
    logger.info("=" * 50)
    logger.info("ClipsCutter API Starting...")
    logger.info(f"Environment: {settings.app_env}")
    logger.info(f"Debug Mode: {settings.debug}")
    logger.info(f"Temp Directory: {settings.temp_dir}")
    logger.info(f"Max Clip Duration: {settings.max_clip_duration}s")
    logger.info("=" * 50)


@app.on_event("shutdown")
async def shutdown_event():
    """Shutdown event handler"""
    logger.info("ClipsCutter API Shutting down...")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=settings.api_port,
        reload=settings.debug
    )
