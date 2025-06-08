from flask import Flask, request, jsonify
from flask_cors import CORS

from config import BACKEND_HOST, BACKEND_PORT, get_logger
from models import YTVideoInfo
from youtube_utils import extract_video_id, get_video_info, get_subtitle_content
from youtube_utils.transcript_generator import processed_transcript


logger = get_logger(__name__)

app = Flask(__name__)
CORS(app)


def generate_answer(video_info: YTVideoInfo, question: str) -> str:
    """Generate answer using video information"""

    desc_for_context = (video_info.description if video_info.description else "No description available")[:500]
    tags_for_context = ', '.join(video_info.tags[:10]) if video_info.tags else "None"
    categories_for_context = ', '.join(video_info.categories) if video_info.categories else "None"

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

    display_upload_date = video_info.upload_date \
        if video_info.upload_date \
        else "Unknown"
    
    answer_detail = f"The transcript is available with {len(video_info.transcript)} characters." \
        if video_info.transcript \
        else "No transcript is available for this video."

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


# Routes
@app.route("/ask", methods=["POST"])
def ask():
    try:
        data = request.get_json()

        if not data:
            return jsonify({"error": "No data provided"}), 400

        url = data.get("url")
        question = data.get("question")

        if not url or not question:
            return jsonify({"error": "url and question are required"}), 400

        logger.info(f"Processing question: '{question}' for URL: {url}")

        video_id = extract_video_id(url)
        if not video_id:
            return jsonify({"error": "Invalid YouTube URL"}), 400

        # info using yt-dlp
        video_info_obj = get_video_info(url) # Renamed to avoid confusion, this is a YTVideoInfo object
        if not video_info_obj:
            return jsonify({"error": "Could not fetch video information"}), 500

        # answer
        answer = generate_answer(video_info_obj, question)

        return jsonify(
            {
                "answer": answer,
                "video_title": video_info_obj.title, # Direct attribute access
                "video_channel": video_info_obj.uploader, # Direct attribute access
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

        url = data.get("url")
        lang = data.get("lang", "en")

        if not url:
            return jsonify({"error": "URL is required"}), 400

        logger.info(f"Received /subs request for URL: {url}, lang: {lang}")

        subtitle_text_raw = get_subtitle_content(url, lang)

        if not subtitle_text_raw:
            return jsonify({"error": "Failed to retrieve subtitles or subtitles are empty."}), 404

        # getting error messages from get_subtitle_content 
        known_error_messages = [
            "Video unavailable.",
            "Subtitles not available for the specified language.",
            "Subtitles were requested but could not be retrieved from file.",
            "Subtitles not available for the specified language or download failed."
        ]
        # error prefixes
        known_error_prefixes = [
            "Error downloading subtitles:",
            "An unexpected error occurred while fetching subtitles:"
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
            # server-side/download issues
            if (
                "unavailable" in subtitle_text_raw.lower() or 
                "not found" in subtitle_text_raw.lower() or 
                "not available" in subtitle_text_raw.lower() 
            ):
                status_code = 404 
                # type errors
                return jsonify({
                    "error": subtitle_text_raw
                }), status_code 
        else:
            cleaned_subtitle_text = processed_transcript(subtitle_text_raw)
            
            if not cleaned_subtitle_text: 
                return jsonify({
                    "error": "Subtitles became empty after cleaning. Original may have only contained timestamps/metadata."
                }), 404
            
            return jsonify({"subtitles": cleaned_subtitle_text}), 200

    except Exception as e:
        logger.error(f"Error in /subs route: {e}")
        return jsonify({"error": f"Internal server error in /subs route: {str(e)}"}), 500


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "healthy", "message": "YouTube Q&A Backend is running"})


@app.route("/video-info", methods=["POST"])
def video_info_handler():
    try:
        data = request.get_json()
        if not data or "url" not in data:
            return jsonify({"error": "url is required"}), 400

        url = data["url"]
        logger.info(f"Received /video-info request for URL: {url}")

        video_info_obj = get_video_info(url)
        if not video_info_obj:
            return jsonify({"error": "Could not fetch video information"}), 500

        return jsonify(video_info_obj.model_dump())

    except Exception as e:
        logger.error(f"Error in /video-info route: {e}")
        return jsonify({"error": "Internal server error"}), 500


# server start
if __name__ == "__main__":
    print(f"http://{"localhost" if BACKEND_HOST == "0.0.0.0" else BACKEND_HOST}:{BACKEND_PORT}")
    app.run(debug=True, host=BACKEND_HOST, port=BACKEND_PORT)