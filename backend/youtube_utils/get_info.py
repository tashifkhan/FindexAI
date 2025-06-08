from . import get_subtitle_content
from models import YTVideoInfo
from config import get_logger
from .transcript_generator import processed_transcript
import yt_dlp
from urllib.parse import urlparse, parse_qs
import os
from typing import Optional


logger = get_logger(__name__)


def get_video_info(video_url: str) -> Optional[YTVideoInfo]:
    """Get video information using yt-dlp"""
    try:
        ydl_opts = {
            "quiet": True,
            "no_warnings": True,
            "extractaudio": False,
            # Subtitle fetching is handled by get_subtitle_content,
            # but we might need basic info if subtitles are requested directly here.
            # "writesubtitles": True, # Keep this if you want ydl to attempt download for info dict
            # "writeautomaticsub": True,
            # "subtitleslangs": ["en"],
            "skip_download": True,
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(video_url, download=False)

            video_data = {
                "title": info.get("title", "Unknown"),
                "description": info.get("description", ""),
                "duration": info.get("duration", 0),
                "uploader": info.get("uploader", "Unknown"),
                "upload_date": info.get("upload_date", ""),
                "view_count": info.get("view_count", 0),
                "like_count": info.get("like_count", 0),
                "tags": info.get("tags", []),
                "categories": info.get("categories", []),
                "transcript": None,
            }

            raw_transcript = get_subtitle_content(video_url, lang="en")

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
            if raw_transcript in known_error_messages:
                is_actual_error = True
            else:
                if raw_transcript:  # Ensure raw_transcript is not None
                    for prefix in known_error_prefixes:
                        if raw_transcript.startswith(prefix):
                            is_actual_error = True
                            break

            if raw_transcript and not is_actual_error:
                cleaned_transcript = processed_transcript(raw_transcript)
                video_data["transcript"] = cleaned_transcript
            else:
                logger.info(
                    f"No transcript available or error fetching for {video_url}: {raw_transcript}"
                )

            return YTVideoInfo(**video_data)

    except Exception as e:
        logger.error(f"Error getting video info: {e}")
        return None
