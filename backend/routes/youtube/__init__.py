"""
initalised youtube routes
"""

from .video_info import router as info
from .video_subs import router as subs

__all__ = [
    "info",
    "subs",
]
