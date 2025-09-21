from pydantic import BaseModel
from .db import Sorce


class SearchTV(BaseModel):
    class Request(BaseModel):
        keyword: str

    class Response(BaseModel):
        error: Optional[str] = None
        source: list[Source]


class AddTV(BaseModel):
    class Request(BaseModel):
        name: str
        source: Source

    class Response(BaseModel):
        error: Optional[str] = None
        id: int


class RemoveTV(BaseModel):
    class Request(BaseModel):
        id: int

    class Response(BaseModel):
        error: Optional[str] = None
