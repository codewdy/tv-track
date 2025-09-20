from pydantic import BaseModel
from .dtype import TimeDelta, to_timedelta


class TrackerConfig(BaseModel):
    resource_dir: str
    save_interval: TimeDelta = to_timedelta("1m")


class Config(BaseModel):
    tracker: TrackerConfig
