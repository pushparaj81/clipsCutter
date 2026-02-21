import yt_dlp
import os
import shutil
from typing import Dict, Optional, Callable
from app.config import settings
import logging

logger = logging.getLogger(__name__)


import re

class CancellationLogger:
    def __init__(self, base_logger, cancellation_check, progress_callback=None, duration=None):
        self.base_logger = base_logger
        self.cancellation_check = cancellation_check
        self.progress_callback = progress_callback
        self.duration = duration
        self.time_regex = re.compile(r'time=(\d{2}):(\d{2}):(\d{2}\.\d{2})')

    def debug(self, msg):
        self._check()
        self._parse_ffmpeg_progress(msg)
        self.base_logger.debug(msg)

    def info(self, msg):
        self._check()
        self._parse_ffmpeg_progress(msg)
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
            
    def _parse_ffmpeg_progress(self, msg):
        if not self.progress_callback or not self.duration or self.duration <= 0:
            return
        # Look for time=00:12:41.00 in ffmpeg output
        match = self.time_regex.search(msg)
        if match:
            try:
                h, m, s = match.groups()
                current_time = int(h) * 3600 + int(m) * 60 + float(s)
                # Calculate percentage
                progress = min(100.0, (current_time / self.duration) * 100.0)
                # ffmpeg progress can go backwards slightly or over 100%, cap it.
                if progress > 0:
                   self.progress_callback(progress)
            except Exception:
                pass

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
        Download specific video section using yt-dlp to get stream URLs and FFmpeg for processing
        """
        url = f"https://www.youtube.com/watch?v={video_id}"
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        # Custom Logger to print yt-dlp download progress on a single line
        import sys
        class YtdlpLogger:
            def debug(self, msg):
                if msg.startswith('[download]'):
                    sys.stdout.write(f'\r{msg}')
                    sys.stdout.flush()
                else:
                    pass
            def warning(self, msg): pass
            def error(self, msg): print(msg)

        # 1. Download the raw stream(s) using yt-dlp's native downloader (Maximizes Network Speed)
        temp_download_path = output_path + ".download"
        ydl_opts = {
            'format': self._get_format_string(format, quality),
            'quiet': False, # Allow output, but we control it with our custom logger
            'logger': YtdlpLogger(),
            'no_warnings': True,
            'outtmpl': temp_download_path,
            'concurrent_fragment_downloads': 15, # Maximize network connections
            'extractor_args': {'youtube': ['player_client=android']},
            'nocheckcertificate': True,
            'prefer_insecure': True,
            # CRITICAL: Prevent yt-dlp from slow-merging video and audio. Leave them as raw files.
            'keepvideo': True,
            'postprocessors': [], 
            'http_headers': {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            }
        }
        
        if self.yt_dlp_path:
            ydl_opts['yt_dlp_path'] = self.yt_dlp_path
            
        # Hook for yt-dlp cancellation and progress (scale to 0-50%)
        # State tracker to handle multiple files (Video + Audio)
        dl_state = {'file_index': 0}
        
        def yt_dlp_hook(d):
            if cancellation_check and cancellation_check():
                logger.warning("[Downloader] yt-dlp hook detected cancellation. Forcing exit.")
                raise yt_dlp.utils.DownloadCancelled("Task cancelled by user")
                
            if d['status'] == 'downloading' and progress_callback:
                p_str = d.get('_percent_str', '').replace('%', '').strip()
                try:
                    # Strip ANSI escape codes that yt-dlp sometimes embeds
                    import re
                    p_str = re.sub(r'\x1b\[[0-9;]*m', '', p_str)
                    p = float(p_str)
                    
                    if format == 'mp3':
                        # Only 1 file for mp3
                        progress_callback(p / 2.0)
                    else:
                        # Video format typically has 2 files (Video then Audio)
                        if dl_state['file_index'] == 0:
                            # 1st file (Video) -> 0% to 40% UI progress
                            progress_callback(p * 0.4)
                        else:
                            # 2nd file (Audio) -> 40% to 50% UI progress
                            progress_callback(40.0 + (p * 0.1))
                except Exception:
                    pass
                    
            elif d['status'] == 'finished':
                dl_state['file_index'] += 1
                
        ydl_opts['progress_hooks'] = [yt_dlp_hook]

        logger.info(f"[Downloader] Natively downloading raw stream for {video_id} at max network speed...")
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([url])
        except yt_dlp.utils.DownloadCancelled as dc:
            logger.info(f"[Downloader] yt-dlp download cancelled cleanly. Cleaning up fragments...")
            import glob
            for f in glob.glob(f"{temp_download_path}*"):
                try: os.remove(f)
                except: pass
            raise Exception("Task cancelled by user")
        except Exception as e:
            raise Exception(f"Failed to fetch video stream natively: {str(e)}")

        if cancellation_check and cancellation_check():
            raise Exception("Task cancelled by user")

        total_duration = end_time - start_time
        if total_duration <= 0:
            total_duration = 1.0

        # Find ALL actual downloaded files (yt-dlp will leave un-merged video and audio files e.g .f137.mp4 and .f140.m4a)
        import glob
        downloaded_files = glob.glob(f"{temp_download_path}*")
        if not downloaded_files:
            raise Exception("Raw video download failed, file not found.")

        # 2. Build FFmpeg command to process and combine the LOCAL raw files instantly 
        logger.info(f"[Downloader] Processing local files with FFmpeg: {downloaded_files}...")
        ffmpeg_cmd = [
            settings.ffmpeg_path or 'ffmpeg', '-y', 
            '-threads', '0'
        ]
        
        # Add all unmerged raw downloaded files as inputs (with -ss before each for fast accurate seeking)
        for f in downloaded_files:
            ffmpeg_cmd.extend(['-ss', str(start_time), '-i', f])
        
        # Add encoding options
        if format == 'mp3':
            kbps = quality.replace('p', '').replace('k', '') if quality else '192'
            ffmpeg_cmd.extend([
                '-t', str(total_duration),
                '-c:a', 'libmp3lame',
                '-b:a', f'{kbps}k',
                '-vn'
            ])
        else:
            ffmpeg_cmd.extend([
                '-t', str(total_duration),
                '-c:v', 'copy',
                '-c:a', 'copy'
            ])
            
        # 3. Add progress pipe
        ffmpeg_cmd.extend([
            '-progress', 'pipe:1',
            output_path
        ])
        
        import subprocess
        import threading
        import queue
        import sys
        
        # Use stderr=None (inherits from parent) to show logs in the console
        process = subprocess.Popen(
            ffmpeg_cmd,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=None,  # This will print FFmpeg logs directly to the worker terminal
            universal_newlines=True,
            bufsize=1
        )
        
        def enqueue_output(out, queue):
            for line in iter(out.readline, ''):
                queue.put(line)
            out.close()

        q = queue.Queue()
        t = threading.Thread(target=enqueue_output, args=(process.stdout, q))
        t.daemon = True
        t.start()
        
        try:
            while True:
                if cancellation_check and cancellation_check():
                    logger.info("[Downloader] Cancellation detected. Terminating FFmpeg...")
                    process.terminate()
                    process.wait(timeout=5)
                    raise Exception("Task cancelled by user")
                
                try:
                    line = q.get(timeout=1.0)
                except queue.Empty:
                    if process.poll() is not None:
                        break
                    continue
                
                if not line and process.poll() is not None:
                    break
                
                if line.startswith('out_time_ms='):
                    try:
                        time_us = int(line.split('=')[1].strip())
                        current_seconds = time_us / 1000000.0
                        
                        # Scale FFmpeg progress to represent 50%-100% of the total UI progress
                        ffmpeg_percentage = min(100.0, (current_seconds / total_duration) * 100.0)
                        final_percentage = 50.0 + (ffmpeg_percentage / 2.0)
                        
                        if final_percentage > 50.0 and progress_callback:
                            progress_callback(final_percentage)
                    except Exception:
                        pass
                elif line.startswith('progress=end'):
                    if progress_callback:
                        progress_callback(100.0)
                    break
            
            process.wait()
            if process.returncode != 0:
                logger.error(f"[Downloader] FFmpeg error: returned non-zero exit status {process.returncode}")
                raise Exception(f"FFmpeg failed with code {process.returncode}")
                
            # Clean up the raw temp files
            for f in downloaded_files:
                try:
                    os.remove(f)
                except: pass
                
            return output_path
            
        except Exception as e:
            try:
                process.terminate()
            except:
                pass
            raise e
    
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
