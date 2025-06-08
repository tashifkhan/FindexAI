from pydantic import BaseModel, Field


class SubsRequest(BaseModel):
    url: str
    lang: str = Field(default="en")
