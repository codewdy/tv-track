from dataclasses import dataclass
from dataclasses import dataclass
from typing import Any, Callable, Optional


@dataclass
class DownloadTask:
    sourceKey: str
    url: str
    dst: str
    timeout: Optional[float] = None
    retry: Optional[int] = None
    retry_interval: Optional[float] = None
    meta: Any = None
    on_finished: Optional[Callable[[], None]] = None
    on_error: Optional[Callable[[Exception], None]] = None
