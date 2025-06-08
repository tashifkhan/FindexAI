"""
initalizing the requests pydantic models
"""

from .video_info import VideoInfoRequest
from .subs import SubsRequest

__all__ = [
    "VideoInfoRequest",
    "SubsRequest",
]
