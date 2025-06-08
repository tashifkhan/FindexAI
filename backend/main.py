from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import routes as r

from config import BACKEND_HOST, BACKEND_PORT
from config import get_logger


logger = get_logger(__name__)


app = FastAPI(
    title="FindexAI API - Ctrl + F on Steroids",
    description="Chat with YouTube videos or any webpage, ask questions, and get answers based on video content.",
    version="1.0.0",
)   


# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# register routes
app.include_router(
    r.youtube.info, 
    prefix="/youtube/video-info", 
    tags=["YouTube Video Info"],
)
app.include_router(
    r.youtube.subs, 
    prefix="/youtube/subs", 
    tags=["YouTube Subtitles"],
)
app.include_router(
    r.ask, 
    prefix="/ask", 
    tags=["Ask Questions"],
)


# server start
if __name__ == "__main__":
    import uvicorn
    print(f"http://{"localhost" if BACKEND_HOST == "0.0.0.0" else BACKEND_HOST}:{BACKEND_PORT}")
    uvicorn.run(
        "main:app",
        host=BACKEND_HOST,
        port=BACKEND_PORT,
        reload=True,
        log_level="info",
    )