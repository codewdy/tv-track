from re import L
from pydantic import BaseModel
from .db import Source, ErrorDB, WatchTag, WatchStatus
from typing import Optional


class Monitor(BaseModel):
    class TV(BaseModel):
        id: int
        name: str
        tag: WatchTag
        watched_episodes: int
        total_episodes: int

    class Request(BaseModel):
        version: str

    class Response(BaseModel):
        is_new: bool
        version: str
        tvs: list["Monitor.TV"]


class SearchTV(BaseModel):
    class Request(BaseModel):
        keyword: str

    class Response(BaseModel):
        source: list[Source]


class AddTV(BaseModel):
    class Request(BaseModel):
        name: str
        source: Source
        tag: WatchTag

    class Response(BaseModel):
        id: int


class RemoveTV(BaseModel):
    class Request(BaseModel):
        id: int

    class Response(BaseModel):
        pass


class GetTV(BaseModel):
    class Episode(BaseModel):
        name: str
        url: str

    class Request(BaseModel):
        id: int

    class Response(BaseModel):
        name: str
        tag: WatchTag
        watch: WatchStatus
        episodes: list["GetTV.Episode"]


class GetDownloadStatus:
    class DownloadTask(BaseModel):
        resource: str
        status: str

    class Request(BaseModel):
        pass

    class Response(BaseModel):
        downloading: list['GetDownloadStatus.DownloadTask']
        pending: list['GetDownloadStatus.DownloadTask']


class GetErrors(BaseModel):
    class Request(BaseModel):
        pass

    class Response(BaseModel):
        errors: list[ErrorDB.Error]


class SetWatch(BaseModel):
    class Request(BaseModel):
        id: int
        watch: WatchStatus

    class Response(BaseModel):
        pass
