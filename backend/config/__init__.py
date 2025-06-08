"""
initalised the config module
"""

from . import configeration as c

DEV_ENV = c.DEV_ENV
DEBUG = c.DEBUG
BACKEND_HOST = c.BACKEND_HOST
BACKEND_PORT = c.BACKEND_PORT
logger = c.logger
get_logger = c.get_logger

__all__ = [
    "DEV_ENV",
    "DEBUG",
    "BACKEND_HOST",
    "BACKEND_PORT",
    "logger",
    "get_logger",
]
