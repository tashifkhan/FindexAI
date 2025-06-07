from flask import Flask, request, jsonify
from flask_cors import CORS
import yt_dlp
from urllib.parse import urlparse, parse_qs
import dotenv
import os
import logging
import tempfile  # Added import

# logging setup - not nessary can remove also - added coz adat
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# load .env varibles
dotenv.load_dotenv()
FLASK_ENV = os.getenv("FLASK_ENV", "development")
FLASK_DEBUG = os.getenv("FLASK_DEBUG", True if FLASK_ENV == "development" else False)

BACKEND_HOST = os.getenv("BACKEND_HOST", "0.0.0.0")
BACKEND_PORT = int(os.getenv("BACKEND_PORT", 5000))

app = Flask(__name__)
CORS(app)


def extract_video_id(url):
    """Extract YouTube video ID from URL"""
    try:
        parsed_url = urlparse(url)
        if parsed_url.hostname in ["www.youtube.com", "youtube.com"]:
            query_params = parse_qs(parsed_url.query)
            return query_params.get("v", [None])[0]
        elif parsed_url.hostname == "youtu.be":
            return parsed_url.path[1:]
    except Exception as e:
        logger.error(f"Error extracting video ID: {e}")
    return None


def get_video_info(video_url):
    """Get video information using yt-dlp"""
    try:
        ydl_opts = {
            "quiet": True,
            "no_warnings": True,
            "extractaudio": False,
            "writesubtitles": True,
            "writeautomaticsub": True,
            "subtitleslangs": ["en"],
            "skip_download": True,
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(video_url, download=False)

            video_info = {
                "title": info.get("title", "Unknown"),
                "description": info.get("description", ""),
                "duration": info.get("duration", 0),
                "uploader": info.get("uploader", "Unknown"),
                "upload_date": info.get("upload_date", ""),
                "view_count": info.get("view_count", 0),
                "like_count": info.get("like_count", 0),
                "tags": info.get("tags", []),
                "categories": info.get("categories", []),
            }

            subtitles = info.get("subtitles", {})
            auto_captions = info.get("automatic_captions", {})

            captions_text = ""

            if "en" in subtitles:
                captions_text = extract_subtitle_text(subtitles["en"])
            elif "en" in auto_captions:
                captions_text = extract_subtitle_text(auto_captions["en"])

            video_info["captions"] = captions_text

            return video_info

    except Exception as e:
        logger.error(f"Error getting video info: {e}")
        return None


def extract_subtitle_text(subtitle_list):
    """Extract text from subtitle entries"""
    try:
        # Find the best subtitle format (prefer VTT or SRT)
        best_subtitle = None
        for subtitle in subtitle_list:
            if subtitle.get("ext") in ["vtt", "srt"]:
                best_subtitle = subtitle
                break

        if not best_subtitle:
            best_subtitle = subtitle_list[0] if subtitle_list else None

        if best_subtitle:
            # For now, we'll return a placeholder since downloading subtitles
            # requires additional handling
            return "Subtitles available but not extracted in this demo"

    except Exception as e:
        logger.error(f"Error extracting subtitle text: {e}")

    return ""


# change this valla abhi ke liye placeholder with info
def generate_answer(video_info, question):
    """Generate answer using video information"""

    context = f"""
    Video Title: {video_info.get('title', 'Unknown')}
    Channel: {video_info.get('uploader', 'Unknown')}
    Description: {video_info.get('description', 'No description available')[:500]}...
    Duration: {video_info.get('duration', 0)} seconds
    Tags: {', '.join(video_info.get('tags', [])[:10])}
    Categories: {', '.join(video_info.get('categories', []))}
    """

    question_lower = question.lower()
    return f"""
        I can help you with questions about this video: "{video_info.get('title', 'Unknown')}" by {video_info.get('uploader', 'Unknown')}.
        Some information I can provide:
        - Video duration: {video_info.get('duration', 0) // 60} minutes
        - Views: {video_info.get('view_count', 0):,}
        - Upload date: {video_info.get('upload_date', 'Unknown')}

        For more specific answers, try asking about the video's title, channel, duration, views, or topic.
    """


def get_subtitle_content(video_url, lang="en"):
    """Downloads and extracts subtitle content for a given video URL and language."""
    temp_dir = tempfile.mkdtemp()
    try:
        ydl_opts = {
            "writesubtitles": True,
            "writeautomaticsub": True,
            "subtitleslangs": [lang],
            "subtitlesformat": "vtt/srt/best",
            "skip_download": True,  # Skip downloading the video itself
            "outtmpl": os.path.join(temp_dir, "%(id)s.%(ext)s"),  # Save subtitle in temp_dir
            "quiet": True,
            "no_warnings": True,
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            logger.info(f"Attempting to download subtitles for {video_url} in lang {lang}")
            info = ydl.extract_info(video_url, download=True)  # download=True is important for subtitles

            requested_subs = info.get("requested_subtitles")
            if requested_subs and lang in requested_subs:
                subtitle_info = requested_subs[lang]
                subtitle_file_path = subtitle_info.get("filepath")

                if subtitle_file_path and os.path.exists(subtitle_file_path):
                    with open(subtitle_file_path, "r", encoding="utf-8") as f:
                        subtitle_content = f.read()
                    logger.info(f"Successfully extracted subtitles from {subtitle_file_path}")
                    return subtitle_content
                elif subtitle_info.get("data"):  # Check for direct data
                    logger.info(f"Extracted subtitles directly from data field for {video_url}")
                    return subtitle_info["data"]
                else:
                    logger.warning(
                        f"Subtitle file path not found or file does not exist for lang '{lang}' at '{video_url}'. Path: {subtitle_file_path}"
                    )
                    return "Subtitles were requested but could not be retrieved from file."
            else:
                logger.info(f"No subtitles found or downloaded for language '{lang}' for URL '{video_url}'.")
                return "Subtitles not available for the specified language or download failed."
    except yt_dlp.utils.DownloadError as e:
        logger.error(f"yt-dlp DownloadError for subtitles: {e} for URL {video_url}")
        if "video unavailable" in str(e).lower():
            return "Video unavailable."
        if "subtitles not available" in str(e).lower() or "no closed captions found" in str(e).lower():
            return "Subtitles not available for the specified language."
        return f"Error downloading subtitles: {str(e)}"
    except Exception as e:
        logger.error(f"Error getting subtitle content: {e} for URL {video_url}")
        return f"An unexpected error occurred while fetching subtitles: {str(e)}"
    finally:
        try:
            if os.path.exists(temp_dir):
                for f_name in os.listdir(temp_dir):
                    os.remove(os.path.join(temp_dir, f_name))
                os.rmdir(temp_dir)
                logger.info(f"Cleaned up temp directory: {temp_dir}")
        except Exception as e_cleanup:
            logger.error(f"Error cleaning up temp directory {temp_dir}: {e_cleanup}")


# ROutes
@app.route("/ask", methods=["POST"])
def ask():
    try:
        data = request.get_json()

        if not data:
            return jsonify({"error": "No data provided"}), 400

        video_url = data.get("url")
        question = data.get("question")

        if not video_url or not question:
            return jsonify({"error": "URL and question are required"}), 400

        logger.info(f"Processing question: '{question}' for URL: {video_url}")

        video_id = extract_video_id(video_url)
        if not video_id:
            return jsonify({"error": "Invalid YouTube URL"}), 400

        # info using yt-dlp
        video_info = get_video_info(video_url)
        if not video_info:
            return jsonify({"error": "Could not fetch video information"}), 500

        # answer
        answer = generate_answer(video_info, question)

        return jsonify(
            {
                "answer": answer,
                "video_title": video_info.get("title"),
                "video_channel": video_info.get("uploader"),
            }
        )

    except Exception as e:
        logger.error(f"Error processing request: {e}")
        return jsonify({"error": "Internal server error"}), 500


@app.route("/subs", methods=["POST"])
def get_subtitles_handler():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        video_url = data.get("url")
        lang = data.get("lang", "en")

        if not video_url:
            return jsonify({"error": "URL is required"}), 400

        logger.info(f"Received /subs request for URL: {video_url}, lang: {lang}")

        subtitle_text = get_subtitle_content(video_url, lang)

        if subtitle_text:
            # Check if the returned text is an error message from get_subtitle_content
            error_keywords = ["error", "unavailable", "not found", "could not be retrieved", "failed"]
            if any(keyword in subtitle_text.lower() for keyword in error_keywords):
                return jsonify({"error": subtitle_text}), 404  # Or 500 depending on error type
            return jsonify({"subtitles": subtitle_text}), 200
        else:
            # This case should ideally be covered by error messages from get_subtitle_content
            return jsonify({"error": "Subtitles not found or an unknown error occurred."}), 404

    except Exception as e:
        logger.error(f"Error in /subs route: {e}")
        return jsonify({"error": f"Internal server error in /subs route: {str(e)}"}), 500


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "healthy", "message": "YouTube Q&A Backend is running"})


# server start
if __name__ == "__main__":
    print(f"http://{"localhost" if BACKEND_HOST == "0.0.0.0" else BACKEND_HOST}:{BACKEND_PORT}")
    app.run(debug=True, host=BACKEND_HOST, port=BACKEND_PORT)
