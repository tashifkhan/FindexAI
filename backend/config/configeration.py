import os
import logging
import dotenv

# load .env varibles
dotenv.load_dotenv()
DEV_ENV = os.getenv("DEV_ENV", "development")
DEBUG = os.getenv("DEBUG", True if DEV_ENV == "development" else False)

BACKEND_HOST = os.getenv("BACKEND_HOST", "0.0.0.0")
BACKEND_PORT = int(os.getenv("BACKEND_PORT", 5454))

# logging setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
