from pydantic import BaseModel
from enum import Enum
from typing import Optional
from datetime import datetime


class Source(BaseModel):
    class Episode(BaseModel):
        name: str
        url: str
    source_key: str = ""
    name: str = ""
    title: str = ""
    channel_name: str = ""
    url: str = ""
    cover_url: str = ""
    tracking: bool = False
    episodes: list["Source.Episode"] = []
    latest_update: Optional[datetime] = None


class LocalStore(BaseModel):
    class DownloadStatus(str, Enum):
        RUNNING = "running"
        SUCCESS = "success"
        FAILED = "failed"

    class Episode(BaseModel):
        name: str = ""
        filename: str = ""
        download: "LocalStore.DownloadStatus" = "running"
        download_error: Optional[str] = None

    episodes: list["LocalStore.Episode"] = []
    cover: Optional[str] = None


class WatchTag(str, Enum):
    Wanted = "wanted"
    Watching = "watching"
    Watched = "watched"
    Dropped = "dropped"


class WatchStatus(BaseModel):
    watched_episode: int = 0
    watched_episode_time: float = 0
    watched_episode_time_ratio: float = 0


class TV(BaseModel):
    id: int = 0
    name: str = ""
    tag: WatchTag = WatchTag.Wanted
    source: Source = Source()
    local: LocalStore = LocalStore()
    watch: WatchStatus = WatchStatus()
    touch_time: Optional[datetime] = datetime(1970, 1, 1)


class DB(BaseModel):
    tv: dict[int, str] = {}
    removed: dict[int, str] = {}
    next_id: int = 1


class ErrorDB(BaseModel):
    class Error(BaseModel):
        id: int
        timestamp: datetime
        title: str
        error: str
    critical_errors: list["ErrorDB.Error"] = []
    errors: list["ErrorDB.Error"] = []
    next_id: int = 1
