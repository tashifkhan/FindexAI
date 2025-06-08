"""
intialising routes as a module
"""

import youtube
from .ask import router as ask
from .health import router as health

__all__ = [
    "ask",
    "health",
    "youtube",
]
