from playwright.async_api import async_playwright
import aiohttp
import threading
from utils.temp_manager import TempManager


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

    def tempdir(cls):
        return TempManager(cls.current.tmp_dir)


class Context(metaclass=ContextMeta):
    _current_holder = threading.local()

    def __init__(self, tmp_dir="/tmp/ani_track", use_client=True, use_browser=False):
        self.tmp_dir = tmp_dir
        self.use_client = use_client
        self.use_browser = use_browser
        self.playwright = None
        self.playwright_ctx = None
        self.browser = None
        self.client = None

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
