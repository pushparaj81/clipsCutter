from sqlalchemy import Column, String, Float, Integer, DateTime
from sqlalchemy.sql import func
from app.database import Base
import uuid


class Clip(Base):
    """Clip model matching Prisma schema"""
    __tablename__ = "Clip"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    videoId = Column(String, nullable=False)
    originalUrl = Column(String, nullable=False)
    startTime = Column(Float, nullable=False)
    endTime = Column(Float, nullable=False)
    status = Column(String, nullable=False, default="PENDING")
    format = Column(String, nullable=False, default="mp4")
    quality = Column(String, nullable=True)
    title = Column(String, nullable=True)
    error = Column(String, nullable=True)
    progress = Column(Integer, nullable=False, default=0)
    fileSize = Column(Integer, nullable=True)
    filePath = Column(String, nullable=True)
    downloadUrl = Column(String, nullable=True)
    createdAt = Column(DateTime(timezone=True), server_default=func.now())
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            "id": self.id,
            "videoId": self.videoId,
            "originalUrl": self.originalUrl,
            "startTime": self.startTime,
            "endTime": self.endTime,
            "status": self.status,
            "format": self.format,
            "quality": self.quality,
            "title": self.title,
            "error": self.error,
            "progress": self.progress,
            "fileSize": self.fileSize,
            "filePath": self.filePath,
            "downloadUrl": self.downloadUrl,
            "createdAt": self.createdAt.isoformat() if self.createdAt else None
        }
