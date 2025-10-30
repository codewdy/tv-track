from .dtype import TVTrackBaseModel
from .dtype import TimeDelta

_DEFUALT_TAG = [
    {"tag": "watching", "name": "在看"},
    {"tag": "wanted", "name": "想看"},
    {"tag": "watched", "name": "看完"},
    {"tag": "dropped", "name": "搁置"},
    {"tag": "saved", "name": "归档"},
]

_DEFUALT_SYSTEM_MONITOR = [
    {"key": "top", "name": "top", "cmd": "top -bn1", "interval": 3},
    {"key": "disk", "name": "磁盘", "cmd": "df -h", "interval": 0},
]

_DEFUALT_SYSTEM_OPERATION = [
    {"key": "restart-service", "name": "重启服务",
        "cmd": "sudo systemctl restart tv-track"},
    {"key": "restart-system", "name": "重启系统",
        "cmd": "sudo reboot"},
    {"key": "shutdown-system", "name": "关闭系统",
        "cmd": "sudo shutdown now"},
]


class TagConfig(TVTrackBaseModel):
    tag: str = ""
    name: str = ""


class SystemMonitorConfig(TVTrackBaseModel):
    key: str
    name: str
    cmd: str
    interval: int


class SystemOperationConfig(TVTrackBaseModel):
    key: str
    name: str
    cmd: str


class ServiceConfig(TVTrackBaseModel):
    port: int = 0
    auth_username: str = ""
    auth_password: str = ""


class LoggerConfig(TVTrackBaseModel):
    level: str = "INFO"
    filename: str = ""
    rotate_day: int = 7


class TrackerConfig(TVTrackBaseModel):
    resource_dir: str = "test-data"
    save_interval: TimeDelta = "1m"
    watched_ratio: float = 0.9
    tags: list[TagConfig] = _DEFUALT_TAG


class DownloadConfig(TVTrackBaseModel):
    concurrent: int = 5
    retry: int = 5
    retry_interval: TimeDelta = "1m"
    timeout: TimeDelta = "1h"
    tmp_dir: str = "/tmp/tv_track"


class SourceUpdaterConfig(TVTrackBaseModel):
    update_interval: TimeDelta = "1h"
    notrack_timeout: TimeDelta = "30d"
    max_error_times: int = 5


class ErrorConfig(TVTrackBaseModel):
    max_error_count: int = 1000


class MonitorConfig(TVTrackBaseModel):
    check_smart_interval: TimeDelta = "1d"
    check_zpool_interval: TimeDelta = "1d"
    check_searcher_interval: TimeDelta = "1d"


class SystemStatusConfig(TVTrackBaseModel):
    monitor: list[SystemMonitorConfig] = _DEFUALT_SYSTEM_MONITOR
    operation: list[SystemOperationConfig] = _DEFUALT_SYSTEM_OPERATION


class APIKey(TVTrackBaseModel):
    serp_api: str = ""


class Config(TVTrackBaseModel):
    service: ServiceConfig = ServiceConfig()
    logger: LoggerConfig = LoggerConfig()
    error: ErrorConfig = ErrorConfig()
    tracker: TrackerConfig = TrackerConfig()
    download: DownloadConfig = DownloadConfig()
    source_updater: SourceUpdaterConfig = SourceUpdaterConfig()
    monitor: MonitorConfig = MonitorConfig()
    system_status: SystemStatusConfig = SystemStatusConfig()
    api_key: APIKey = APIKey()
