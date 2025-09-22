from pydantic import BaseModel
from .dtype import TimeDelta, to_timedelta


class ServiceConfig(BaseModel):
    port: int = 0
    auth_username: str = ""
    auth_password: str = ""


class LoggerConfig(BaseModel):
    level: str = "INFO"
    filename: str = ""
    rotate_day: int = 7


class TrackerConfig(BaseModel):
    resource_dir: str = "test-data"
    save_interval: TimeDelta = to_timedelta("1m")
    port: int = 9876


class DownloadConfig(BaseModel):
    concurrent: int = 5
    retry: int = 5
    retry_interval: TimeDelta = to_timedelta("1m")
    timeout: TimeDelta = to_timedelta("1h")
    tmp_dir: str = "/tmp/tv_track"


class ErrorConfig(BaseModel):
    max_error_count: int = 1000


class Config(BaseModel):
    service: ServiceConfig = ServiceConfig()
    logger: LoggerConfig = LoggerConfig()
    error: ErrorConfig = ErrorConfig()
    tracker: TrackerConfig = TrackerConfig()
    download: DownloadConfig = DownloadConfig()
