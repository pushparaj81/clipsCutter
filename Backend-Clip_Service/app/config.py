from pydantic_settings import BaseSettings, SettingsConfigDict
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
    max_file_age_hours: int = 6
    
    # Video Processing
    max_clip_duration: int = 3600  # 1 hour (synced with .env)
    max_concurrent_workers: int = 5
    
    # Timeouts (in seconds)
    video_metadata_timeout: int = 180  # 3 minutes (synced with .env)
    socket_timeout: int = 60  # 60 seconds (synced with .env)
    
    # Optional binary paths
    yt_dlp_path: str | None = None
    ffmpeg_path: str | None = None
    
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env", "../../.env"),
        case_sensitive=False,
        extra="ignore"
    )


settings = Settings()
