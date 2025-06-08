from fastapi import APIRouter, HTTPException
from config import get_logger
from models.requests import SubsRequest
from models.response import SubsResponse
from youtube_utils import get_subtitle_content, processed_transcript


router = APIRouter()
logger = get_logger(__name__)


@router.post("/", response_model=SubsResponse)
async def get_subtitles_handler(request: SubsRequest):
    url = request.url
    lang = request.lang

    if not url:
        raise HTTPException(status_code=400, detail="URL is required")

    logger.info(f"Received /subs request for URL: {url}, lang: {lang}")

    subtitle_text_raw = get_subtitle_content(url, lang)

    if not subtitle_text_raw:
        raise HTTPException(
            status_code=404,
            detail="Failed to retrieve subtitles or subtitles are empty.",
        )

    known_error_messages = [
        "Video unavailable.",
        "Subtitles not available for the specified language.",
        "Subtitles were requested but could not be retrieved from file.",
        "Subtitles not available for the specified language or download failed.",
    ]
    known_error_prefixes = [
        "Error downloading subtitles:",
        "An unexpected error occurred while fetching subtitles:",
    ]

    is_actual_error = False
    if subtitle_text_raw in known_error_messages:
        is_actual_error = True
    else:
        for prefix in known_error_prefixes:
            if subtitle_text_raw.startswith(prefix):
                is_actual_error = True
                break

    if is_actual_error:
        status_code = 500
        if (
            "unavailable" in subtitle_text_raw.lower()
            or "not found" in subtitle_text_raw.lower()
            or "not available" in subtitle_text_raw.lower()
        ):
            status_code = 404
        raise HTTPException(status_code=status_code, detail=subtitle_text_raw)

    cleaned_subtitle_text = processed_transcript(subtitle_text_raw)

    if not cleaned_subtitle_text:
        raise HTTPException(
            status_code=404,
            detail="Subtitles became empty after cleaning. Original may have only contained timestamps/metadata.",
        )

    return {
        "success": True,
        "subtitles": cleaned_subtitle_text,
    }
