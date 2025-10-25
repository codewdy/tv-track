from .dtype import TVTrackBaseModel


class Subject(TVTrackBaseModel):
    name: str
    url: str
    cover_url: str


class Channel(TVTrackBaseModel):
    class Episode(TVTrackBaseModel):
        name: str
        url: str
    name: str
    episodes: list["Channel.Episode"]


class Resource(TVTrackBaseModel):
    url: str
    type: str
