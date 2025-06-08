from fastapi import APIRouter, HTTPException, Request
from config import get_logger
from models import YTVideoInfo
from youtube_utils import get_video_info, extract_video_id


router = APIRouter()
logger = get_logger(__name__)


async def generate_answer(video_info: YTVideoInfo, question: str) -> str:
    """Generate answer using video information"""

    desc_for_context = (
        video_info.description if video_info.description else "No description available"
    )[:500]
    tags_for_context = ", ".join(video_info.tags[:10]) if video_info.tags else "None"
    categories_for_context = (
        ", ".join(video_info.categories) if video_info.categories else "None"
    )

    context = (
        f"  Title: {video_info.title}\n"
        f"  Channel: {video_info.uploader}\n"
        f"  Description: {desc_for_context}...\n"
        f"  Duration: {video_info.duration} seconds\n"
        f"  Tags: {tags_for_context}\n"
        f"  Categories: {categories_for_context}\n"
        f"  Transcript: {video_info.transcript[:200] if video_info.transcript else 'Not available'}...\n"
    )

    question_lower = question.lower()

    display_upload_date = (
        video_info.upload_date if video_info.upload_date else "Unknown"
    )

    answer_detail = (
        f"The transcript is available with {len(video_info.transcript)} characters."
        if video_info.transcript
        else "No transcript is available for this video."
    )

    return (
        f'I can help you with questions about this video: "{video_info.title}" by {video_info.uploader}.\n'
        f"{answer_detail}\n"
        f"Some information I can provide:\n"
        f"  - Video duration: {video_info.duration // 60} minutes\n"
        f"  - Views: {video_info.view_count:,}\n"
        f"  - Upload date: {display_upload_date}\n"
        f"\n"
        f"For more specific answers, try asking about the video's title, channel, duration, views, or topic.\n"
        f"Context used:\n"
        f"{''.join(context)}\n"
    )


# route
@router.post("/", response_model=dict)
async def ask(request: Request):
    try:
        data = request.get_json()

        if not data:
            return ({"error": "No data provided"}), 400

        url = data.get("url")
        question = data.get("question")

        if not url or not question:
            raise HTTPException(
                status_code=400,
                detail=f"url and question are required",
            )

        logger.info(f"Processing question: '{question}' for URL: {url}")

        video_id = extract_video_id(url)
        if not video_id:
            return ({"error": "Invalid YouTube URL"}), 400

        # info using yt-dlp
        video_info_obj = get_video_info(
            url
        )  # Renamed to avoid confusion, this is a YTVideoInfo object
        if not video_info_obj:
            raise HTTPException(
                status_code=500,
                detail=f"Could not fetch video information",
            )

        # answer
        answer = generate_answer(video_info_obj, question)

        return {
            "answer": answer,
            "video_title": video_info_obj.title,  # Direct attribute access
            "video_channel": video_info_obj.uploader,  # Direct attribute access
        }

    except Exception as e:
        logger.error(f"Error processing request: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error \n{str(e)}",
        )
