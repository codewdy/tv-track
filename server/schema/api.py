from re import L
from pydantic import BaseModel
from .db import Source
from typing import Optional


class SearchTV(BaseModel):
    class Request(BaseModel):
        keyword: str

    class Response(BaseModel):
        source: list[Source]


class AddTV(BaseModel):
    class Request(BaseModel):
        name: str
        source: Source

    class Response(BaseModel):
        id: int


class RemoveTV(BaseModel):
    class Request(BaseModel):
        id: int

    class Response(BaseModel):
        pass


class GetDownloadStatus:
    class DownloadTask(BaseModel):
        resource: str
        status: str

    class Request(BaseModel):
        pass

    class Response(BaseModel):
        downloading: list['GetDownloadStatus.DownloadTask']
        pending: list['GetDownloadStatus.DownloadTask']
