from re import L
from symtable import SymbolTable
from .dtype import TVTrackBaseModel
from .db import Source, ErrorDB, WatchStatus, LocalStore
from .config import TagConfig
from typing import Optional


class Monitor(TVTrackBaseModel):
    class TV(TVTrackBaseModel):
        id: int
        name: str
        tag: str
        watch: WatchStatus
        total_episodes: int
        icon_url: str

    class Request(TVTrackBaseModel):
        version: str

    class Response(TVTrackBaseModel):
        is_new: bool
        version: str = ""
        tvs: list["Monitor.TV"] = []
        critical_errors: int = 0
        errors: int = 0


class GetConfig(TVTrackBaseModel):
    class SystemMonitor(TVTrackBaseModel):
        key: str
        name: str

    class Request(TVTrackBaseModel):
        pass

    class Response(TVTrackBaseModel):
        watched_ratio: float
        tags: list[TagConfig]
        system_monitor: list["GetConfig.SystemMonitor"]


class SearchTV(TVTrackBaseModel):
    class Request(TVTrackBaseModel):
        keyword: str

    class Response(TVTrackBaseModel):
        source: list[Source]


class AddTV(TVTrackBaseModel):
    class Request(TVTrackBaseModel):
        name: str
        source: Source
        tag: str

    class Response(TVTrackBaseModel):
        id: int


class RemoveTV(TVTrackBaseModel):
    class Request(TVTrackBaseModel):
        id: int

    class Response(TVTrackBaseModel):
        pass


class GetTV(TVTrackBaseModel):
    class Episode(TVTrackBaseModel):
        name: str
        url: str
        download_status: LocalStore.DownloadStatus

    class Request(TVTrackBaseModel):
        id: int

    class Response(TVTrackBaseModel):
        name: str
        tag: str
        watch: WatchStatus
        episodes: list["GetTV.Episode"]


class GetDownloadStatus:
    class DownloadTask(TVTrackBaseModel):
        resource: str
        status: str

    class Request(TVTrackBaseModel):
        pass

    class Response(TVTrackBaseModel):
        downloading: list['GetDownloadStatus.DownloadTask']
        pending: list['GetDownloadStatus.DownloadTask']


class GetErrors(TVTrackBaseModel):
    class Request(TVTrackBaseModel):
        pass

    class Response(TVTrackBaseModel):
        critical_errors: list[ErrorDB.Error]
        errors: list[ErrorDB.Error]


class ClearErrors(TVTrackBaseModel):
    class Request(TVTrackBaseModel):
        ids: list[int]

    class Response(TVTrackBaseModel):
        pass


class SetWatch(TVTrackBaseModel):
    class Request(TVTrackBaseModel):
        id: int
        watch: WatchStatus

    class Response(TVTrackBaseModel):
        pass


class SetTag(TVTrackBaseModel):
    class Request(TVTrackBaseModel):
        id: int
        tag: str

    class Response(TVTrackBaseModel):
        pass


class SetDownloadStatus(TVTrackBaseModel):
    class Request(TVTrackBaseModel):
        id: int
        episode_idx: int
        status: LocalStore.DownloadStatus

    class Response(TVTrackBaseModel):
        pass


class UpdateEpisodeSource(TVTrackBaseModel):
    class Request(TVTrackBaseModel):
        id: int
        episode_idx: int
        source: Source.Episode

    class Response(TVTrackBaseModel):
        pass


class UpdateSource(TVTrackBaseModel):
    class Request(TVTrackBaseModel):
        id: int
        source: Source
        update_downloaded: bool

    class Response(TVTrackBaseModel):
        pass


class GetSystemMonitor(TVTrackBaseModel):
    class Request(TVTrackBaseModel):
        key: str

    class Response(TVTrackBaseModel):
        result: str
        interval: int


class GetSystemOperation(TVTrackBaseModel):
    class Unit(TVTrackBaseModel):
        key: str
        name: str

    class Request(TVTrackBaseModel):
        pass

    class Response(TVTrackBaseModel):
        result: list["GetSystemOperation.Unit"]


class RunSystemOperation(TVTrackBaseModel):
    class Request(TVTrackBaseModel):
        key: str

    class Response(TVTrackBaseModel):
        pass
