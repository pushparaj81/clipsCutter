import ffmpeg
import os
from typing import Dict
from app.config import settings


class FFmpegService:
    """FFmpeg service using ffmpeg-python library"""
    
    def __init__(self):
        self.ffmpeg_path = settings.ffmpeg_path
    
    def trim_video(
        self,
        input_path: str,
        output_path: str,
        start_time: float,
        duration: float
    ) -> str:
        """
        Trim video using ffmpeg-python
        
        Args:
            input_path: Input video file path
            output_path: Output video file path
            start_time: Start time in seconds
            duration: Duration in seconds
            
        Returns:
            Path to trimmed video
        """
        try:
            # Ensure output directory exists
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            
            # Build ffmpeg command
            stream = ffmpeg.input(input_path, ss=start_time, t=duration)
            stream = ffmpeg.output(
                stream,
                output_path,
                vcodec='copy',
                acodec='copy',
                avoid_negative_ts='make_zero'
            )
            
            # Run with custom ffmpeg path if provided
            if self.ffmpeg_path:
                ffmpeg.run(
                    stream,
                    cmd=self.ffmpeg_path,
                    overwrite_output=True,
                    quiet=True
                )
            else:
                ffmpeg.run(stream, overwrite_output=True, quiet=True)
            
            return output_path
        except ffmpeg.Error as e:
            error_msg = e.stderr.decode() if e.stderr else str(e)
            raise Exception(f"FFmpeg error: {error_msg}")
    
    def get_video_info(self, file_path: str) -> Dict:
        """
        Get video metadata using ffprobe
        
        Args:
            file_path: Path to video file
            
        Returns:
            Dictionary with video metadata
        """
        try:
            probe = ffmpeg.probe(file_path)
            
            # Find video stream
            video_stream = next(
                (s for s in probe['streams'] if s['codec_type'] == 'video'),
                None
            )
            
            if not video_stream:
                raise Exception("No video stream found")
            
            return {
                'duration': float(probe['format']['duration']),
                'size': int(probe['format']['size']),
                'width': video_stream['width'],
                'height': video_stream['height'],
                'codec': video_stream.get('codec_name'),
                'bitrate': int(probe['format'].get('bit_rate', 0))
            }
        except Exception as e:
            raise Exception(f"Failed to get video info: {str(e)}")
    
    def convert_format(
        self,
        input_path: str,
        output_path: str,
        output_format: str,
        quality: str = None
    ) -> str:
        """
        Convert video to different format
        
        Args:
            input_path: Input video file path
            output_path: Output video file path
            output_format: Target format (mp4, webm, etc.)
            quality: Video quality/bitrate
            
        Returns:
            Path to converted video
        """
        try:
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            
            stream = ffmpeg.input(input_path)
            
            output_opts = {}
            if quality:
                output_opts['b:v'] = quality
            
            stream = ffmpeg.output(stream, output_path, **output_opts)
            
            if self.ffmpeg_path:
                ffmpeg.run(
                    stream,
                    cmd=self.ffmpeg_path,
                    overwrite_output=True
                )
            else:
                ffmpeg.run(stream, overwrite_output=True)
            
            return output_path
        except ffmpeg.Error as e:
            error_msg = e.stderr.decode() if e.stderr else str(e)
            raise Exception(f"Conversion error: {error_msg}")


# Singleton instance
ffmpeg_service = FFmpegService()
