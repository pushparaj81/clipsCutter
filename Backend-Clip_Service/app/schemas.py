from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime


class VideoQuality(BaseModel):
    """Video quality option"""
    label: str
    height: int


class VideoInfo(BaseModel):
    """Video metadata response"""
    video_id: str = Field(..., alias="videoId")
    title: str
    thumbnail: Optional[str] = None
    duration: float
    available_qualities: List[VideoQuality] = Field(..., alias="availableQualities")
    available_formats: List[str] = Field(..., alias="availableFormats")
    
    class Config:
        populate_by_name = True


class ClipCreate(BaseModel):
    """Request schema for creating a clip"""
    video_id: str = Field(..., alias="videoId")
    start_time: float = Field(..., alias="startTime", ge=0)
    end_time: float = Field(..., alias="endTime", gt=0)
    format: str = "mp4"
    quality: Optional[str] = None
    title: Optional[str] = "Untitled Clip"
    
    @validator('end_time')
    def validate_end_time(cls, v, values):
        if 'start_time' in values and v <= values['start_time']:
            raise ValueError('end_time must be greater than start_time')
        return v
    
    @validator('format')
    def validate_format(cls, v):
        allowed = ['mp4', 'mp3', 'webm']
        if v not in allowed:
            raise ValueError(f'format must be one of {allowed}')
        return v
    
    class Config:
        populate_by_name = True


class ClipResponse(BaseModel):
    """Response schema for clip creation"""
    status: str
    clip_id: str = Field(..., alias="clipId")
    message: str
    
    class Config:
        populate_by_name = True


class ClipStatus(BaseModel):
    """Clip status response"""
    id: str
    video_id: str = Field(..., alias="videoId")
    title: Optional[str] = None
    status: str
    progress: int
    format: Optional[str] = "mp4"
    quality: Optional[str] = None
    start_time: Optional[float] = Field(None, alias="startTime")
    end_time: Optional[float] = Field(None, alias="endTime")
    download_url: Optional[str] = Field(None, alias="downloadUrl")
    error: Optional[str] = None
    file_size: Optional[int] = Field(None, alias="fileSize")
    created_at: Optional[datetime] = Field(None, alias="createdAt")
    
    class Config:
        populate_by_name = True


class InfoRequest(BaseModel):
    """Request schema for video info"""
    url: str
