from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Clip
from app.schemas import ClipStatus
from workers.celery_app import celery_app
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/progress")
async def get_progress(
    clip_id: str = Query(..., description="The ID of the clip"),
    db: Session = Depends(get_db)
):
    """Simple endpoint to return only progress percentage for HTTP polling"""
    try:
        clip = db.query(Clip).filter(Clip.id == clip_id).first()
        if not clip:
            raise HTTPException(status_code=404, detail="Clip not found")
        
        return {"progress": float(clip.progress) if clip.progress is not None else 0.0}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Progress check error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


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
            title=clip.title,
            status=clip.status,
            progress=clip.progress,
            format=clip.format,
            quality=clip.quality,
            start_time=clip.startTime,
            end_time=clip.endTime,
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


@router.post("/{id}/cancel")
async def cancel_clip(
    id: str,
    db: Session = Depends(get_db)
):
    """Cancel a running clip job"""
    logger.info(f"Received cancellation request for job: {id}")
    try:
        clip = db.query(Clip).filter(Clip.id == id).first()
        if not clip:
            logger.warning(f"Clip not found for cancellation: {id}")
            raise HTTPException(status_code=404, detail="Clip not found")
        
        # Set cancellation flag in Redis
        try:
            from redis import Redis
            from app.config import settings
            logger.info(f"Connecting to Redis at {settings.redis_url} for cancellation")
            r = Redis.from_url(settings.redis_url)
            r.setex(f"cancel_job:{id}", 3600, "1")  # Expire in 1 hour
            logger.info(f"SUCCESS: Set cancellation flag in Redis for job: {id}")
        except Exception as re:
            logger.error(f"FAILED to set Redis cancel flag: {re}")

        # Fallback to standard revocation
        try:
            celery_app.control.revoke(id, terminate=True)
            logger.info(f"Sent Celery revoke signal for task: {id}")
        except Exception as e:
            logger.error(f"Error revoking Celery task {id}: {e}")
        
        # Update database status
        clip.status = 'CANCELLED'
        db.commit()
        
        return {"success": True, "message": "Task cancellation signal sent"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Cancel task endpoint error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
