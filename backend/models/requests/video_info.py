from pydantic import BaseModel


class VideoInfoRequest(BaseModel):
    url: str
