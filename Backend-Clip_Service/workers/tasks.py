from celery import Task
from workers.celery_app import celery_app
from services.downloader import downloader
from app.database import SessionLocal
from app.models import Clip
from app.config import settings
import os
import logging
import time
try:
    import psutil
except ImportError:
    psutil = None

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
    """
    db = SessionLocal()
    # Persistent Redis client for the task duration
    from redis import Redis
    import threading
    import psutil
    
    redis_client = None
    try:
        redis_client = Redis.from_url(settings.redis_url)
        logger.info(f"[Worker] Task {clip_id} connected to Redis at {settings.redis_url}")
    except Exception as re:
        logger.error(f"[Worker] Failed to connect to Redis: {re}")

    # Flag to stop the monitor thread
    stop_monitor = threading.Event()
    worker_pid = os.getpid()

    def cancellation_monitor():
        """Thread to monitor cancellation and kill child processes"""
        logger.info(f"[Monitor] Started monitor thread for {clip_id}")
        while not stop_monitor.is_set():
            try:
                if redis_client and redis_client.exists(f"cancel_job:{clip_id}"):
                    logger.warning(f"[Monitor] Cancellation flag DETECTED for job: {clip_id}. Killing children...")
                    
                    if psutil:
                        # Kill child processes (ffmpeg, yt-dlp)
                        parent = psutil.Process(worker_pid)
                        children = parent.children(recursive=True)
                        for child in children:
                            try:
                                logger.info(f"[Monitor] Killing child process: {child.pid} ({child.name()})")
                                child.kill()
                            except: pass
                    else:
                        logger.error("[Monitor] psutil NOT INSTALLED. Cannot kill child processes automatically.")
                    
                    # The main thread should also see the exception if downloader is still running
                    # but killing children usually makes the downloader crash immediately.
                    break
            except Exception as e:
                logger.error(f"[Monitor] error: {e}")
            time.sleep(1)
        logger.info(f"[Monitor] Monitor thread finishing for {clip_id}")

    # Start monitor thread
    monitor_thread = threading.Thread(target=cancellation_monitor, daemon=True)
    monitor_thread.start()

    # Cancellation check function for the downloader hook
    def is_cancelled():
        if not redis_client:
            return False
        try:
            return bool(redis_client.exists(f"cancel_job:{clip_id}"))
        except: return False

    try:
        logger.info(f"[Worker] Processing clip {clip_id}")
        
        # Get clip from database
        clip = db.query(Clip).filter(Clip.id == clip_id).first()
        if not clip:
            raise Exception(f"Clip {clip_id} not found in database")
        
        # Update status to PROCESSING
        clip.status = 'PROCESSING'
        clip.progress = 0
        db.commit()
        
        # Check initial cancellation
        if is_cancelled():
            raise Exception("Task cancelled by user before starting")

        # Prepare output path
        output_dir = settings.temp_dir
        os.makedirs(output_dir, exist_ok=True)
        
        ext = 'mp3' if format == 'mp3' else format
        quality_suffix = f"_{quality}" if quality else ""
        output_filename = f"{video_id}_{int(start_time)}_{int(end_time)}{quality_suffix}.{ext}"
        output_path = os.path.join(output_dir, output_filename)
        
        # Download video section
        start_process_time = time.time()
        logger.info(f"[Worker] Downloading {video_id} [{start_time}-{end_time}] as {format}")
        
        # Define progress callback
        def update_progress(p: float):
            try:
                # Need to use a new session or the existing one depending on thread safety
                # Since yt_dlp runs in the same thread (mostly), this might be safe
                clip.progress = int(p)
                db.commit()
            except Exception as e:
                pass
                
        downloader.download_section(
            video_id=video_id,
            start_time=start_time,
            end_time=end_time,
            output_path=output_path,
            format=format,
            quality=quality,
            progress_callback=update_progress,
            cancellation_check=is_cancelled
        )
        download_duration = time.time() - start_process_time
        logger.info(f"[Worker] Download completed in {download_duration:.2f}s")
        
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
        
        total_duration = time.time() - start_process_time
        logger.info(f"[Worker] Successfully completed clip {clip_id} in {total_duration:.2f}s total")
        logger.info(f"[Worker] File size: {file_size} bytes, URL: {download_url}")
        
        return {
            'download_url': download_url,
            'file_size': file_size,
            'clip_id': clip_id
        }
        
    except Exception as e:
        error_msg = str(e)
        
        # Update database with proper status
        if "cancelled" in error_msg.lower() or is_cancelled():
            logger.info(f"[Worker] Job {clip_id} was successfully CANCELLED (Exit code 15 handled).")
            clip.status = 'CANCELLED'
            
            # Try to cleanup partial file if it exists
            try:
                if 'output_path' in locals() and os.path.exists(output_path):
                    os.remove(output_path)
                    logger.info(f"[Worker] Cleaned up partial file: {output_path}")
            except: pass
        else:
            logger.error(f"[Worker] Job {self.request.id} failed: {error_msg}")
            clip.status = 'FAILED'
            clip.error = error_msg
        
        db.commit()
        
        # Only re-raise if it's a real failure, NOT a user cancellation
        if "cancelled" not in error_msg.lower() and not is_cancelled():
            raise
        
    finally:
        db.close()
        # Stop monitor thread
        stop_monitor.set()
        # Cleanup cancellation flag if it exists
        try:
            from redis import Redis
            r = Redis.from_url(settings.redis_url)
            r.delete(f"cancel_job:{clip_id}")
        except:
            pass


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
