from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Clip
from app.schemas import ClipStatus
from workers.celery_app import celery_app
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/{id}", response_model=ClipStatus)
async def get_clip_status(
    id: str,
    db: Session = Depends(get_db)
):
    """Get clip processing status by ID"""
    try:
        clip = db.query(Clip).filter(Clip.id == id).first()
        if not clip:
            raise HTTPException(status_code=404, detail="Clip not found")
        
        # Check Celery task state
        job_state = None
        try:
            task = celery_app.AsyncResult(id)
            job_state = task.state
        except:
            pass
        
        return ClipStatus(
            id=clip.id,
            video_id=clip.videoId,
            status=clip.status,
            progress=clip.progress,
            download_url=clip.downloadUrl,
            error=clip.error,
            file_size=clip.fileSize,
            created_at=clip.createdAt
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Status check error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/video/{video_id}")
async def list_video_clips(
    video_id: str,
    db: Session = Depends(get_db)
):
    """List all clips for a specific video"""
    try:
        clips = db.query(Clip).filter(Clip.videoId == video_id).order_by(Clip.createdAt.desc()).all()
        return [
            ClipStatus(
                id=clip.id,
                video_id=clip.videoId,
                status=clip.status,
                progress=clip.progress,
                download_url=clip.downloadUrl,
                error=clip.error,
                file_size=clip.fileSize,
                created_at=clip.createdAt,
                format=clip.format,
                quality=clip.quality,
                start_time=clip.startTime,
                end_time=clip.endTime,
                title=clip.title
            )
            for clip in clips
        ]
    except Exception as e:
        logger.error(f"List clips error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/video/{video_id}")
async def delete_video_clips(
    video_id: str,
    db: Session = Depends(get_db)
):
    """Delete all clips for a specific video and their local files"""
    try:
        clips = db.query(Clip).filter(Clip.videoId == video_id).all()
        
        for clip in clips:
            if clip.file_path and os.path.exists(clip.file_path):
                try:
                    os.remove(clip.file_path)
                except Exception as e:
                    logger.error(f"Error removing file {clip.file_path}: {e}")
            
            db.delete(clip)
        
        db.commit()
        return {"success": True, "message": f"Deleted {len(clips)} clips for video {video_id}"}
    except Exception as e:
        db.rollback()
        logger.error(f"Delete clips error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
