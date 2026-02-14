from celery import Task
from workers.celery_app import celery_app
from services.downloader import downloader
from app.database import SessionLocal
from app.models import Clip
from app.config import settings
import os
import logging

logger = logging.getLogger(__name__)


class CallbackTask(Task):
    """Custom task base class with database session management"""
    
    def on_failure(self, exc, task_id, args, kwargs, einfo):
        """Handle task failure"""
        logger.error(f"Task {task_id} failed: {exc}")
        super().on_failure(exc, task_id, args, kwargs, einfo)


@celery_app.task(bind=True, base=CallbackTask, name='workers.tasks.process_clip')
def process_clip(
    self,
    clip_id: str,
    video_id: str,
    start_time: float,
    end_time: float,
    format: str,
    quality: str = None,
    title: str = None
):
    """
    Process video clip task
    
    Args:
        clip_id: Clip database ID
        video_id: YouTube video ID
        start_time: Start time in seconds
        end_time: End time in seconds
        format: Output format (mp4, mp3, webm)
        quality: Video quality (e.g., '720p')
        title: Video title
    
    Returns:
        Dictionary with download URL
    """
    db = SessionLocal()
    
    try:
        logger.info(f"[Worker] Processing clip {clip_id} (Task {self.request.id})")
        
        # Get clip from database
        clip = db.query(Clip).filter(Clip.id == clip_id).first()
        if not clip:
            raise Exception(f"Clip {clip_id} not found in database")
        
        # Update status to PROCESSING
        clip.status = 'PROCESSING'
        clip.progress = 0
        db.commit()
        
        # Progress callback
        last_progress = 0
        def update_progress(percent: float):
            nonlocal last_progress
            percent = int(percent)
            
            # Update every 5% or at 100%
            if percent == 100 or percent - last_progress >= 5:
                last_progress = percent
                clip.progress = percent
                db.commit()
                
                # Update Celery task state
                self.update_state(
                    state='PROGRESS',
                    meta={
                        'progress': percent,
                        'clip_id': clip_id,
                        'status': 'downloading'
                    }
                )
                logger.info(f"[Worker] Clip {clip_id} progress: {percent}%")
        
        # Prepare output path
        output_dir = settings.temp_dir
        os.makedirs(output_dir, exist_ok=True)
        
        ext = 'mp3' if format == 'mp3' else format
        quality_suffix = f"_{quality}" if quality else ""
        output_filename = f"{video_id}_{int(start_time)}_{int(end_time)}{quality_suffix}.{ext}"
        output_path = os.path.join(output_dir, output_filename)
        
        # Download video section
        logger.info(f"[Worker] Downloading {video_id} [{start_time}-{end_time}] as {format}")
        
        downloader.download_section(
            video_id=video_id,
            start_time=start_time,
            end_time=end_time,
            output_path=output_path,
            format=format,
            quality=quality,
            progress_callback=update_progress
        )
        
        # Get actual file path (yt-dlp might have changed the extension)
        actual_path = output_path
        if not os.path.exists(actual_path):
            # Check if it added a secondary extension like .mp4.webm
            possible_paths = [
                f"{output_path}.webm",
                f"{output_path}.mp4",
                f"{output_path}.mkv",
                f"{output_path}.webm"
            ]
            # Strip extension and check matches
            base_path = output_path.rsplit('.', 1)[0]
            import glob
            matches = glob.glob(f"{base_path}*")
            if matches:
                # Find the best match (completed file)
                # Sort by modification time to get the newest if multiple exist
                matches.sort(key=os.path.getmtime, reverse=True)
                actual_path = matches[0]
                logger.info(f"[Worker] Detected actual output path: {actual_path}")
                # Update output_filename for the database
                output_filename = os.path.basename(actual_path)
        
        # Get file size
        if os.path.exists(actual_path):
            file_size = os.path.getsize(actual_path)
            output_path = actual_path # Update to the actual path found
        else:
            raise Exception(f"Output file not found after download: {output_path}")
        
        # Update database with completion
        download_url = f"/temp/{output_filename}"
        
        clip.status = 'COMPLETED'
        clip.filePath = output_path
        clip.downloadUrl = download_url
        clip.fileSize = file_size
        clip.progress = 100
        db.commit()
        
        logger.info(f"[Worker] Successfully completed clip {clip_id}")
        logger.info(f"[Worker] File size: {file_size} bytes, URL: {download_url}")
        
        return {
            'download_url': download_url,
            'file_size': file_size,
            'clip_id': clip_id
        }
        
    except Exception as e:
        error_msg = str(e)
        logger.error(f"[Worker] Job {self.request.id} failed: {error_msg}", exc_info=True)
        
        # Update database with error
        clip.status = 'FAILED'
        clip.error = error_msg
        db.commit()
        
        # Re-raise for Celery to handle
        raise
        
    finally:
        db.close()


@celery_app.task(name='workers.tasks.cleanup_old_files')
def cleanup_old_files():
    """
    Cleanup old temporary files
    Scheduled task to run periodically
    """
    import time
    from pathlib import Path
    
    logger.info("[Cleanup] Starting cleanup of old files")
    
    temp_dir = Path(settings.temp_dir)
    if not temp_dir.exists():
        return
    
    max_age_seconds = settings.max_file_age_hours * 3600
    now = time.time()
    deleted_count = 0
    
    for file_path in temp_dir.glob('*'):
        if file_path.name == '.gitkeep':
            continue
        
        try:
            if file_path.is_file():
                age = now - file_path.stat().st_mtime
                if age > max_age_seconds:
                    file_path.unlink()
                    deleted_count += 1
                    logger.info(f"[Cleanup] Deleted old file: {file_path.name}")
        except Exception as e:
            logger.error(f"[Cleanup] Error deleting {file_path}: {e}")
    
    logger.info(f"[Cleanup] Deleted {deleted_count} old files")
    return {'deleted_count': deleted_count}
