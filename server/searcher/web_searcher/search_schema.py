from pydantic import BaseModel


class Subject(BaseModel):
    name: str
    url: str
    cover_url: str
