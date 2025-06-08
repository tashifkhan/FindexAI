from pydantic import BaseModel, Field


class SubsResponse(BaseModel):
    subtitles: str = Field(default="")
    error: str = Field(default="")
    success: bool = Field(default=False)
