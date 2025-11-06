from .baidu import BaiduSubjectSearcher
from utils.beautiful import request, to_text
from schema.searcher import Subject
import urllib
import asyncio


class BaiduASubjectSearcher(BaiduSubjectSearcher):
    def __init__(self, url_selector, name_selector, cover_selector, **kwargs):
        super().__init__(**kwargs)
        self.url_selector = url_selector
        self.name_selector = name_selector
        self.cover_selector = cover_selector

    async def parse(self, src: str):
        soup = await request(src)
        url = soup.select_one(self.url_selector).get("href")
        name = to_text(soup.select_one(self.name_selector))
        cover = soup.select_one(self.cover_selector).get("src")
        return Subject(
            url=urllib.parse.urljoin(src, url),
            name=name,
            cover_url=urllib.parse.urljoin(src, cover),
        )
