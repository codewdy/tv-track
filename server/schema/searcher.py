from pydantic import BaseModel


class Subject(BaseModel):
    name: str
    url: str
    cover_url: str


class Channel(BaseModel):
    class Episode(BaseModel):
        name: str
        url: str
    name: str
    episodes: list["Channel.Episode"]


class Resource(BaseModel):
    url: str
    type: str
