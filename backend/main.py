from flask import Flask, request, jsonify
from flask_cors import CORS
import yt_dlp
from urllib.parse import urlparse, parse_qs
import dotenv
import os
import logging
import re 
from typing import List, Dict, Optional
from pydantic import BaseModel, Field

# custoom models/types
class YTVideoInfo(BaseModel):
    title: str = Field(default="Unknown")
    description: str = Field(default="")
    duration: int = Field(default=0)
    uploader: str = Field(default="Unknown")
    upload_date: str = Field(default="")
    view_count: int = Field(default=0)
    like_count: int = Field(default=0)
    tags: List[str] = Field(default_factory=list)
    categories: List[str] = Field(default_factory=list)
    captions: Optional[str] = None
    transcript: Optional[str] = None

# logging setup - not nessary can remove also - added coz adat
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# load .env varibles
dotenv.load_dotenv()
FLASK_ENV = os.getenv("FLASK_ENV", "development")
FLASK_DEBUG = os.getenv("FLASK_DEBUG", True if FLASK_ENV == "development" else False)

BACKEND_HOST = os.getenv("BACKEND_HOST", "0.0.0.0")
BACKEND_PORT = int(os.getenv("BACKEND_PORT", 5000))

# regex patterns for cleaning subtitles
TIMESTAMP_LINE_PATTERN = re.compile(
    r'^(?:\\d{2}:)?\\d{2}:\\d{2}[.,]\\d{3} --> (?:\\d{2}:)?\\d{2}:\\d{2}[.,]\\d{3}.*$'
)
VTT_HEADER_OR_METADATA_PATTERN = re.compile(
    r'^(WEBVTT|Kind:|Language:).*$|^(NOTE|STYLE|REGION\\s*$|\\s*::cue).*$', re.IGNORECASE
)
INLINE_TIMESTAMP_PATTERN = re.compile(
    r'<\\d{2}:\\d{2}:\\d{2}[.,]\\d{3}>'
)
CUE_TAG_PATTERN = re.compile(
    r'</?c.*?>',
)
SPEAKER_TAG_PATTERN = re.compile(
    r'<v\\s+[^>]+>.*?</v>'
)

app = Flask(__name__)
CORS(app)


def extract_video_id(url: str) -> Optional[str]:
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


def get_video_info(video_url: str) -> Optional[YTVideoInfo]:
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
                "transcript": None,  
            }

            raw_transcript = get_subtitle_content(video_url, lang="en")
            
            known_error_messages = [
                "Video unavailable.",
                "Subtitles not available for the specified language.",
                "Subtitles were requested but could not be retrieved from file.",
                "Subtitles not available for the specified language or download failed."
            ]
            known_error_prefixes = [
                "Error downloading subtitles:",
                "An unexpected error occurred while fetching subtitles:"
            ]

            is_actual_error = False
            if raw_transcript in known_error_messages:
                is_actual_error = True
            else:
                for prefix in known_error_prefixes:
                    if raw_transcript and raw_transcript.startswith(prefix):
                        is_actual_error = True
                        break
            
            if raw_transcript and not is_actual_error:
                cleaned_transcript = remove_sentence_repeats(
                    clean_timestamps_and_dedupe(
                        clean_srt_text(
                            clean_transcript(
                                raw_transcript
                            )
                        )
                    )
                )
                video_info["transcript"] = cleaned_transcript
            else:
                logger.info(f"No transcript available or error fetching for {video_url}: {raw_transcript}")

            return YTVideoInfo(**video_info)

    except Exception as e:
        logger.error(f"Error getting video info: {e}")
        return None



# change this valla abhi ke liye placeholder with info
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

    display_upload_date = video_info.upload_date if video_info.upload_date else "Unknown"
    
    answer_detail = f"The transcript is available with {len(video_info.transcript)} characters." if video_info.transcript else "No transcript is available for this video."

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


def clean_transcript(text: str) -> str:
    """  Remove SRT/VTT timestamps and cue tags, dedupe, andmerge into paragraphs. """
    lines = text.splitlines()
    paragraphs = []
    current_para = []
    prev_line = None

    for line in lines:
        # skip full timestamp lines and VTT headers/metadata
        if TIMESTAMP_LINE_PATTERN.match(line) or VTT_HEADER_OR_METADATA_PATTERN.match(line):
            continue
        
        # Remove speaker tags like <v Speaker Name>
        line = SPEAKER_TAG_PATTERN.sub('', line)

        # strip inline timestamps and cue tags
        line = INLINE_TIMESTAMP_PATTERN.sub('', line)
        line = CUE_TAG_PATTERN.sub('', line)
        line = line.strip() # General strip

        # Remove common VTT artifacts like "align:start position:0%" if they are the only content
        if re.fullmatch(r'align:[a-zA-Z]+(?:\\s+position:[\\d%]+)?', line):
            continue

        # paragraph break
        if not line:
            if current_para:
                paragraphs.append(' '.join(current_para))
                current_para = []
            continue

        # skip duplicates
        if line == prev_line:
            continue

        current_para.append(line)
        prev_line = line

    if current_para:
        paragraphs.append(' '.join(current_para))

    # join paragraphs with a blank line
    return '\\n\\n'.join(paragraphs).strip()


def get_subtitle_content(video_url: str, lang:str="en") -> str:
    """Downloads and extracts subtitle content for a given video URL and language."""

    temp_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "temp_subs")
    os.makedirs(temp_dir, exist_ok=True)

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
            info = ydl.extract_info(video_url, download=True)

            requested_subs = info.get("requested_subtitles")

            if requested_subs and lang in requested_subs:
                subtitle_info = requested_subs[lang]
                subtitle_file_path = subtitle_info.get("filepath")

                if subtitle_file_path and os.path.exists(subtitle_file_path):
                    with open(subtitle_file_path, "r", encoding="utf-8") as f:
                        subtitle_content = f.read()
                    logger.info(f"Successfully extracted subtitles from {subtitle_file_path}")
                    return subtitle_content
                
                elif subtitle_info.get("data"):
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

def clean_srt_text(raw: str) -> str:
    """ remove full timestamp lines (with align:… and the literal “\n\n”) """
    full_ts_re = re.compile(
        r'^\d{2}:\d{2}:\d{2}\.\d{3}'
        r'\s*-->\s*\d{2}:\d{2}:\d{2}\.\d{3}'      # the --> timestamp
        r'.*?'
        r'(?:\\n){2}'                             # literal “\n\n”
        , re.MULTILINE | re.DOTALL
    )

    # remove inline time-codes
    inline_ts_re = re.compile(r'<\d{2}:\d{2}:\d{2}\.\d{3}>')

    # remove align directives
    align_re = re.compile(r'align:start position:0%')

    # collapse literal backslash-n sequences into real newlines
    backslash_n_re = re.compile(r'\\n+')

    # apply passes
    text = full_ts_re.sub('', raw)
    text = inline_ts_re.sub('', text)
    text = align_re.sub('', text)
    text = backslash_n_re.sub('\n', text)

    return text.strip()

# 1) matches any timestamp arrow “00:00:02.470 --> 00:00:04.309”
_TIMESTAMP_ARROW_RE = re.compile(
    r"\d{2}:\d{2}:\d{2}\.\d{3}"  
    r"\s*-->\s*"
    r"\d{2}:\d{2}:\d{2}\.\d{3}" 
)

# 2) optional: strip inline cues like <00:00:02.879>
_CUE_RE = re.compile(r"<\d{2}:\d{2}:\d{2}\.\d{3}>")

def clean_timestamps_and_dedupe(text: str) -> str:
    """
    1) Remove all 'hh:mm:ss.mmm --> hh:mm:ss.mmm'
    2) Remove inline <hh:mm:ss.mmm> cues
    3) Split/strip/dedupe lines
    """
    # strip out the timestamp-arrows
    no_arrows = _TIMESTAMP_ARROW_RE.sub("", text)

    # strip any leftover <…> cues
    no_cues = _CUE_RE.sub("", no_arrows)

    seen = set()
    out_lines = []
    for raw_line in no_cues.splitlines():
        line = raw_line.strip()
        if not line or line in seen:
            continue
        seen.add(line)
        out_lines.append(line)

    return "\n".join(out_lines)

def remove_sentence_repeats(text: str) -> str:
    """ Collapse any sentence that is repeated consecutively into a single instance. """
    lines = text.splitlines()

    def is_repeated(idx: int, lines: List[str]) -> bool:
        """Check if the line is a repeat of the previous one."""
        try:
            length_idx = len(lines[idx])
            length_forword = len(lines[idx + 1])

            if length_idx < length_forword:
                if lines[idx] == lines[idx + 1][:length_idx]:
                    return True
                
        except IndexError:
            return False
        
        return False
    
    out_lines = [
        lines[i] 
        for i in range(len(lines)) 
            if not is_repeated(i, lines)
    ]

    return "\n".join(out_lines)

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
        video_info_obj = get_video_info(video_url) # Renamed to avoid confusion, this is a YTVideoInfo object
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

        video_url = data.get("url")
        lang = data.get("lang", "en")

        if not video_url:
            return jsonify({"error": "URL is required"}), 400

        logger.info(f"Received /subs request for URL: {video_url}, lang: {lang}")

        subtitle_text_raw = get_subtitle_content(video_url, lang)

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
            cleaned_subtitle_text \
                = remove_sentence_repeats(
                    clean_timestamps_and_dedupe(
                        clean_srt_text(
                            clean_transcript(
                                subtitle_text_raw
                                )
                            )
                        )
                    )
            
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


# server start
if __name__ == "__main__":
    print(f"http://{"localhost" if BACKEND_HOST == "0.0.0.0" else BACKEND_HOST}:{BACKEND_PORT}")
    app.run(debug=True, host=BACKEND_HOST, port=BACKEND_PORT)
