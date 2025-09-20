from pydantic import BaseModel
from enum import Enum


class Source(BaseModel):
    class Episode(BaseModel):
        name: str
        url: str
    source_key: str
    name: str
    channel_name: str
    url: str
    cover_url: str
    tracking: bool
    episodes: list["Source.Episode"] = []


class LocalStore(BaseModel):
    class DownloadStatus(str, Enum):
        RUNNING = "running"
        SUCCESS = "success"
        FAILED = "failed"

    class Episode(BaseModel):
        name: str
        url: str
        filename: str
        download: "LocalStore.DownloadStatus"

    episodes: list["LocalStore.Episode"] = []
    cover: str = ""


class TV(BaseModel):
    id: int
    name: str
    source: Source
    local: LocalStore


class DB(BaseModel):
    tv: dict[int, str] = {}
    next_id: int = 1
