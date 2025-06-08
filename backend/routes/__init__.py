"""
intialising routes as a module
"""

from .asker import router as ask
from .health import router as health
from . import youtube

__all__ = [
    "ask",
    "health",
    "youtube",
]
