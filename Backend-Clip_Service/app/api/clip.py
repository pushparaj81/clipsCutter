from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Clip
from app.schemas import ClipCreate, ClipResponse
from app.config import settings
from workers.tasks import process_clip
import uuid
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/clip", response_model=ClipResponse)
async def create_clip(clip_data: ClipCreate, db: Session = Depends(get_db)):
    """
    Create new clip job
    
    Args:
        clip_data: ClipCreate request data
        db: Database session
        
    Returns:
        ClipResponse with job status
    """
    try:
        # Additional validation
        duration = clip_data.end_time - clip_data.start_time
        if duration > settings.max_clip_duration:
            raise HTTPException(
                status_code=400,
                detail=f"Clip duration ({duration}s) exceeds maximum ({settings.max_clip_duration}s)"
            )
        
        # Create database record
        clip_id = str(uuid.uuid4())
        clip = Clip(
            id=clip_id,
            videoId=clip_data.video_id,
            startTime=clip_data.start_time,
            endTime=clip_data.end_time,
            format=clip_data.format,
            quality=clip_data.quality,
            title=clip_data.title,
            status='PENDING',
            originalUrl=f"https://youtube.com/watch?v={clip_data.video_id}",
            progress=0
        )
        
        db.add(clip)
        db.commit()
        db.refresh(clip)
        
        logger.info(f"Created clip record: {clip_id}")
        
        # Queue Celery task
        task = process_clip.apply_async(
            args=[
                clip_id,
                clip_data.video_id,
                clip_data.start_time,
                clip_data.end_time,
                clip_data.format,
                clip_data.quality,
                clip_data.title
            ],
            task_id=clip_id  # Use clip_id as task_id for easy tracking
        )
        
        logger.info(f"Queued clip job {clip_id} (Task: {task.id})")
        
        return ClipResponse(
            status="queued",
            clip_id=clip_id,
            message="Processing started"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Clip creation error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create clip: {str(e)}"
        )
