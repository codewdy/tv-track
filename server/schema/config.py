from pydantic import BaseModel
from .dtype import TimeDelta, to_timedelta


class LoggerConfig(BaseModel):
    level: str = "INFO"
    filename: str = "tracker.log"
    rotate_day: int = 7


class TrackerConfig(BaseModel):
    resource_dir: str = "test-data"
    save_interval: TimeDelta = to_timedelta("1m")


class DownloadConfig(BaseModel):
    concurrent: int = 5
    retry: int = 5
    retry_interval: TimeDelta = to_timedelta("1m")
    timeout: TimeDelta = to_timedelta("1h")
    tmp_dir: str = "/tmp/tv_track"


class Config(BaseModel):
    logger: LoggerConfig = LoggerConfig()
    tracker: TrackerConfig = TrackerConfig()
    download: DownloadConfig = DownloadConfig()
