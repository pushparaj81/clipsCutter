from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application settings"""
    
    # Database
    database_url: str = "postgresql://postgres:postgres@localhost:5432/clipsCutter"
    
    # Redis
    redis_url: str = "redis://localhost:6379/0"
    
    # Application
    app_env: str = "development"
    debug: bool = True
    api_port: int = 8000
    
    # CORS - can be comma-separated string or JSON array
    allowed_origins: str = "http://localhost:3000"
    
    @property
    def origins_list(self) -> List[str]:
        """Parse allowed_origins into a list"""
        if self.allowed_origins.startswith('['):
            # JSON array format
            import json
            return json.loads(self.allowed_origins)
        else:
            # Comma-separated format
            return [origin.strip() for origin in self.allowed_origins.split(',')]
    
    # File Storage
    temp_dir: str = "./public/temp"
    max_file_age_hours: int = 1
    
    # Video Processing
    max_clip_duration: int = 600  # 10 minutes
    max_concurrent_workers: int = 5
    
    # Timeouts (in seconds)
    video_metadata_timeout: int = 120  # 2 minutes for metadata extraction
    socket_timeout: int = 30  # socket timeout for network operations
    
    # Optional binary paths
    yt_dlp_path: str | None = None
    ffmpeg_path: str | None = None
    
    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
