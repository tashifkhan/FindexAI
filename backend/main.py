from flask import Flask, request, jsonify
from flask_cors import CORS
import yt_dlp
from urllib.parse import urlparse, parse_qs
import dotenv
import os
import logging

# logging setup - not nessary can remove also - added coz adat
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# load .env varibles
dotenv.load_dotenv()
FLASK_ENV=os.getenv("FLASK_ENV", "development")
FLASK_DEBUG=os.getenv("FLASK_DEBUG", True if FLASK_ENV == "development" else False)

BACKEND_HOST=os.getenv("BACKEND_HOST", "0.0.0.0")
BACKEND_PORT=int(os.getenv("BACKEND_PORT", 5000))


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


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "healthy", "message": "YouTube Q&A Backend is running"})


# server start
if __name__ == "__main__":
    print(f"http://{"localhost" if BACKEND_HOST=="0.0.0.0" else BACKEND_HOST}:{BACKEND_PORT}")
    app.run(debug=True, host=BACKEND_HOST, port=BACKEND_PORT)
