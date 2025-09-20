from pydantic import BaseModel
from .dtype import TimeDelta, to_timedelta


class LoggerConfig(BaseModel):
    level: str = "INFO"
    filename: str = "tracker.log"
    rotate_day: int = 7


class TrackerConfig(BaseModel):
    temp_dir: str = "/tmp/tracker"
    resource_dir: str = "test-data"
    save_interval: TimeDelta = to_timedelta("1m")


class Config(BaseModel):
    logger: LoggerConfig = LoggerConfig()
    tracker: TrackerConfig = TrackerConfig()
