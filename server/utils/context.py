from playwright.async_api import async_playwright
import aiohttp
import threading
from .temp_manager import TempManager
from .error_handler import ErrorHandler
from .logger import get_logger
from schema.config import Config


class ContextMeta(type):
    def __init__(self, *args, **kwargs):
        self._current_holder = threading.local()

    @property
    def current(cls):
        return cls._current_holder.context

    @property
    def tmp_dir(cls):
        return cls.current.tmp_dir

    @property
    def client(cls):
        return cls.current.client

    @property
    def browser(cls):
        return cls.current.browser

    def add_error_handler(cls, handler):
        cls.current.error_handler.add_handler(handler)

    def handle_error_context(cls, rethrow=False):
        return cls.current.error_handler.handle_error_context(rethrow=rethrow)

    def info(cls, msg, *args, **kwargs):
        cls.current.logger.info(msg, *args, **kwargs)

    def debug(cls, msg, *args, **kwargs):
        cls.current.logger.debug(msg, *args, **kwargs)

    def error(cls, msg, *args, **kwargs):
        cls.current.logger.error(msg, *args, **kwargs)

    def warning(cls, msg, *args, **kwargs):
        cls.current.logger.warning(msg, *args, **kwargs)

    def tempdir(cls):
        return TempManager(cls.current.tmp_dir)


class Context(metaclass=ContextMeta):
    _current_holder = threading.local()

    def __init__(self, config: Config = Config(), use_client=True, use_browser=False):
        self.tmp_dir = config.download.tmp_dir
        self.use_client = use_client
        self.use_browser = use_browser
        self.playwright = None
        self.playwright_ctx = None
        self.browser = None
        self.client = None
        self.error_handler = ErrorHandler()
        self.logger = get_logger(
            config.logger.level, config.logger.filename, config.logger.rotate_day)
        self.error_handler.add_handler(self.logger.error)

    async def __aenter__(self):
        self._current_holder.context = self
        if self.use_client:
            self.client = aiohttp.ClientSession()
            await self.client.__aenter__()
        if self.use_browser:
            self.playwright = async_playwright()
            self.playwright_ctx = await self.playwright.__aenter__()
            self.browser = await self.playwright_ctx.chromium.launch()
        return self

    async def __aexit__(self, exc_type, exc, tb):
        if self.use_browser:
            try:
                await self.browser.close()
            except BaseException:
                pass
            try:
                await self.playwright.__aexit__(exc_type, exc, tb)
            except BaseException:
                pass
            self.playwright_ctx = None
            self.playwright = None
            self.browser = None
        if self.use_client:
            try:
                await self.client.__aexit__(exc_type, exc, tb)
            except BaseException:
                pass
            self.client = None
        del self._current_holder.context
