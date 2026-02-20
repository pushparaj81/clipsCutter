from fastapi import APIRouter, HTTPException
from app.schemas import InfoRequest, VideoInfo
from services.downloader import downloader
import logging
import asyncio

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/info", response_model=VideoInfo)
async def get_video_info(request: InfoRequest):
    """
    Get video metadata from YouTube URL
    
    Args:
        request: InfoRequest with URL
        
    Returns:
        VideoInfo with metadata
    """
    try:
        logger.info(f"Fetching metadata for: {request.url}")
        
        # Run in thread pool to prevent blocking
        metadata = await asyncio.to_thread(downloader.get_metadata, request.url)
        
        logger.info(f"Successfully fetched metadata for video: {metadata['video_id']}")
        
        return VideoInfo(**metadata)
        
    except asyncio.TimeoutError:
        logger.error(f"Timeout fetching metadata for: {request.url}")
        raise HTTPException(
            status_code=504,
            detail="Request timeout - video took too long to process. Try a shorter video or try again."
        )
    except Exception as e:
        logger.error(f"Info API error: {str(e)}", exc_info=True)
        error_msg = str(e)
        
        # Provide user-friendly messages
        if "Unsupported URL" in error_msg or "no video found" in error_msg.lower():
            raise HTTPException(
                status_code=400,
                detail="Invalid or unsupported video URL. Please check the link and try again."
            )
        elif "Private video" in error_msg or "Private" in error_msg:
            raise HTTPException(
                status_code=403,
                detail="This video is private and cannot be accessed."
            )
        elif "age-restricted" in error_msg.lower():
            raise HTTPException(
                status_code=403,
                detail="This video is age-restricted and cannot be processed."
            )
        else:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to fetch video metadata: {error_msg}"
            )
