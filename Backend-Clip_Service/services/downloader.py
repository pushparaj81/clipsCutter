import yt_dlp
import os
import shutil
from typing import Dict, Optional, Callable
from app.config import settings
import logging

logger = logging.getLogger(__name__)


class CancellationLogger:
    def __init__(self, base_logger, cancellation_check):
        self.base_logger = base_logger
        self.cancellation_check = cancellation_check

    def debug(self, msg):
        self._check()
        self.base_logger.debug(msg)

    def info(self, msg):
        self._check()
        self.base_logger.info(msg)

    def warning(self, msg):
        self._check()
        self.base_logger.warning(msg)

    def error(self, msg):
        # If cancelling, downgrade errors to info to keep logs clean
        if self.cancellation_check and self.cancellation_check():
            self.base_logger.info(f"[Suppressing Error during Cancel] {msg}")
        else:
            self.base_logger.error(msg)

    def _check(self):
        if self.cancellation_check and self.cancellation_check():
            raise Exception("Task cancelled by user (heartbeat)")


class VideoDownloader:
    """Video downloader using yt-dlp Python library"""
    
    def __init__(self):
        self.yt_dlp_path = settings.yt_dlp_path
    
    def get_metadata(self, url: str) -> Dict:
        """
        Fetch video metadata using yt-dlp
        """
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'extract_flat': False,
            'socket_timeout': settings.socket_timeout,
            'http_chunk_size': 10485760,  # 10MB chunks
            'noproxy': False,
        }
        
        if self.yt_dlp_path:
            ydl_opts['yt_dlp_path'] = self.yt_dlp_path
        
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                
                # Extract available qualities
                qualities = set()
                for fmt in info.get('formats', []):
                    if fmt.get('height') and fmt.get('vcodec') != 'none':
                        qualities.add(fmt['height'])
                
                available_qualities = [
                    {'label': f'{h}p', 'height': h}
                    for h in sorted(qualities, reverse=True)
                ]
                
                return {
                    'video_id': info['id'],
                    'title': info.get('title', 'Untitled Video'),
                    'thumbnail': info.get('thumbnail'),
                    'duration': float(info.get('duration', 0)),
                    'available_qualities': available_qualities,
                    'available_formats': ['mp4', 'mp3', 'webm']
                }
        except Exception as e:
            raise Exception(f"Failed to fetch video metadata: {str(e)}")
    
    def download_section(
        self,
        video_id: str,
        start_time: float,
        end_time: float,
        output_path: str,
        format: str = 'mp4',
        quality: Optional[str] = None,
        progress_callback: Optional[Callable[[float], None]] = None,
        cancellation_check: Optional[Callable[[], bool]] = None
    ) -> str:
        """
        Download specific video section using yt-dlp
        """
        url = f"https://www.youtube.com/watch?v={video_id}"
        
        # Ensure output directory exists
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        def yt_dlp_hook(d):
            # Check for cancellation
            if cancellation_check and cancellation_check():
                logger.info("[Downloader] Cancellation signal detected in hook, aborting...")
                raise Exception("Task cancelled by user")
            
            # Update progress
            if d['status'] == 'downloading' and progress_callback:
                p = d.get('_percent_str', '0%').replace('%', '')
                try: progress_callback(float(p))
                except: pass

        def postprocessor_hook(d):
            if cancellation_check and cancellation_check():
                logger.info("[Downloader] Cancellation detected in postprocessor, aborting...")
                raise Exception("Task cancelled by user (postprocessor)")

        # Build yt-dlp options
        ydl_opts = {
            'format': self._get_format_string(format, quality),
            'outtmpl': output_path if output_path.endswith(f'.{format}') else f'{output_path}.%(ext)s',
            'logger': CancellationLogger(logger, cancellation_check),
            'quiet': False,
            'no_warnings': False,
            'progress_hooks': [yt_dlp_hook],
            'postprocessor_hooks': [postprocessor_hook],
            'concurrent_fragment_downloads': 15,
            'buffersize': 1024 * 1024, # 1MB buffer
            'retries': 10,
            'fragment_retries': 10,
        }
        
        # Force merge format if not mp3
        if format != 'mp3':
            ydl_opts['merge_output_format'] = format
            
        # Add FFmpeg optimization args - strictly force 'copy'
        ydl_opts['postprocessor_args'] = {
            'ffmpeg': ['-threads', '0', '-preset', 'ultrafast', '-c:v', 'copy', '-c:a', 'copy', '-map', '0']
        }
        
        # Add download range (section)
        if hasattr(yt_dlp.utils, 'download_range_func'):
            ydl_opts['download_ranges'] = yt_dlp.utils.download_range_func(
                None, [(start_time, end_time)]
            )
        else:
            # Fallback for older yt-dlp versions
            ydl_opts['postprocessor_args']['ffmpeg'].extend(['-ss', str(start_time), '-to', str(end_time)])
        
        # MP3 specific options
        if format == 'mp3':
            kbps = quality.replace('p', '').replace('k', '') if quality else '192'
            ydl_opts.update({
                'format': 'bestaudio/best',
                'postprocessors': [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'mp3',
                    'preferredquality': kbps,
                }]
            })
            # Remove stream copying for MP3 conversion
            ydl_opts['postprocessor_args']['ffmpeg'] = ['-threads', '0', '-preset', 'ultrafast']
        
        # Set custom binary paths if provided
        if self.yt_dlp_path:
            ydl_opts['yt_dlp_path'] = self.yt_dlp_path
        
        if settings.ffmpeg_path:
            ydl_opts['ffmpeg_location'] = settings.ffmpeg_path
        
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([url])
            
            if progress_callback:
                progress_callback(100.0)
            
            return output_path
        except Exception as e:
            error_msg = str(e)
            # Re-check cancellation status because a hard-kill (code 15) might not say "cancelled"
            if "cancelled" in error_msg.lower() or (cancellation_check and cancellation_check()):
                logger.info(f"[Downloader] Stop signal processed (Exit/Abort): {error_msg}")
                raise Exception("Task cancelled by user")
            
            logger.exception(f"[Downloader] Fatal download error for {video_id}")
            raise Exception(f"Download failed: {error_msg}")
    
    def _get_format_string(self, format: str, quality: Optional[str]) -> str:
        """
        Generate yt-dlp format string
        """
        if format == 'mp3':
            return 'bestaudio/best'
        
        if quality:
            height = quality.replace('p', '')
            # Strictly prioritize H.264 (avc1) and AAC (m4a) for MP4 instant merging
            return f'bestvideo[height<={height}][vcodec^=avc1]+bestaudio[ext=m4a]/bestvideo[height<={height}]+bestaudio/best[height<={height}]/best'
        
        return f'bestvideo[vcodec^=avc1]+bestaudio[ext=m4a]/bestvideo+bestaudio/best'


# Singleton instance
downloader = VideoDownloader()
