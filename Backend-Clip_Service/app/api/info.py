from fastapi import APIRouter, HTTPException
from app.schemas import InfoRequest, VideoInfo
from services.downloader import downloader
import logging

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
        
        metadata = downloader.get_metadata(request.url)
        
        logger.info(f"Successfully fetched metadata for video: {metadata['video_id']}")
        
        return VideoInfo(**metadata)
        
    except Exception as e:
        logger.error(f"Info API error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch video metadata: {str(e)}"
        )
