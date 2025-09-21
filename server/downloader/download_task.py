from dataclasses import dataclass
from dataclasses import dataclass
from typing import Any, Callable, Optional


@dataclass
class DownloadTask:
    sourceKey: str
    url: str
    dst: str
    timeout: float = 3600
    retry: int = 3
    retry_interval: float = 30
    meta: Any = None
    on_finished: Optional[Callable[[], None]] = None
    on_error: Optional[Callable[[Exception], None]] = None
