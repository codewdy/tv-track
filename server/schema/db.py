from pydantic import BaseModel
from enum import Enum
from typing import Optional


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
        filename: str
        download: "LocalStore.DownloadStatus"
        download_error: Optional[str] = None

    episodes: list["LocalStore.Episode"] = []
    cover: Optional[str] = None


class TV(BaseModel):
    id: int
    name: str
    source: Source
    local: LocalStore


class DB(BaseModel):
    tv: dict[int, str] = {}
    removed: dict[int, str] = {}
    next_id: int = 1
