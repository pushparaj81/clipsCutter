import yt_dlp
import os
from typing import Dict, Optional, Callable
from app.config import settings


class VideoDownloader:
    """Video downloader using yt-dlp Python library"""
    
    def __init__(self):
        self.yt_dlp_path = settings.yt_dlp_path
    
    def get_metadata(self, url: str) -> Dict:
        """
        Fetch video metadata using yt-dlp
        
        Args:
            url: YouTube video URL
            
        Returns:
            Dictionary with video metadata
        """
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'extract_flat': False,
            'socket_timeout': settings.socket_timeout,
            'http_chunk_size': 10485760,  # 10MB chunks
            'ratelimit': 100000,  # Prevent rate limiting pauses
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
        progress_callback: Optional[Callable[[float], None]] = None
    ) -> str:
        """
        Download specific video section using yt-dlp
        
        Args:
            video_id: YouTube video ID
            start_time: Start time in seconds
            end_time: End time in seconds
            output_path: Output file path
            format: Output format (mp4, mp3, webm)
            quality: Video quality (e.g., '720p')
            progress_callback: Optional callback for progress updates
            
        Returns:
            Path to downloaded file
        """
        url = f"https://www.youtube.com/watch?v={video_id}"
        
        # Ensure output directory exists
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        # Progress hook
        def progress_hook(d):
            if d['status'] == 'downloading' and progress_callback:
                try:
                    # Extract percentage from downloaded_bytes and total_bytes
                    if 'downloaded_bytes' in d and 'total_bytes' in d:
                        percent = (d['downloaded_bytes'] / d['total_bytes']) * 100
                        progress_callback(percent)
                    elif '_percent_str' in d:
                        percent_str = d['_percent_str'].strip().replace('%', '')
                        progress_callback(float(percent_str))
                except:
                    pass
        
        # Build yt-dlp options
        ydl_opts = {
            'format': self._get_format_string(format, quality),
            'outtmpl': output_path if output_path.endswith(f'.{format}') else f'{output_path}.%(ext)s',
            'progress_hooks': [progress_hook],
            'quiet': False,
            'no_warnings': False,
            'noprogress': True,
            'concurrent_fragment_downloads': 5,
            'http_chunk_size': 10485760, # 10MB
        }
        
        # Force merge format if not mp3
        if format != 'mp3':
            ydl_opts['merge_output_format'] = format
            
        # Add FFmpeg optimization args
        ydl_opts['postprocessor_args'] = {
            'ffmpeg': ['-threads', '0', '-preset', 'veryfast']
        }
        
        # Add download range (section)
        if hasattr(yt_dlp.utils, 'download_range_func'):
            ydl_opts['download_ranges'] = yt_dlp.utils.download_range_func(
                None, [(start_time, end_time)]
            )
        else:
            # Fallback for older yt-dlp versions
            ydl_opts['postprocessor_args'] = [
                '-ss', str(start_time),
                '-to', str(end_time)
            ]
        
        # MP3 specific options
        if format == 'mp3':
            ydl_opts.update({
                'format': 'bestaudio/best',
                'postprocessors': [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'mp3',
                    'preferredquality': quality.replace('p', '') if quality else '192',
                }]
            })
        
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
            raise Exception(f"Download failed: {str(e)}")
    
    def _get_format_string(self, format: str, quality: Optional[str]) -> str:
        """
        Generate yt-dlp format string
        
        Args:
            format: Output format
            quality: Video quality
            
        Returns:
            Format string for yt-dlp
        """
        if format == 'mp3':
            return 'bestaudio/best'
        
        if quality:
            height = quality.replace('p', '')
            return f'bestvideo[height<={height}][ext={format}]+bestaudio/best'
        
        return f'bestvideo[ext={format}]+bestaudio/best'


# Singleton instance
downloader = VideoDownloader()
