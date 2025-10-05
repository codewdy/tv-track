import asyncio
from utils.beautiful import request, to_text


class WebResourceSearcher:
    def __init__(self, config):
        pass

    async def search(self, url):
        await asyncio.sleep(0.1)
        soup = await request(url)
        result = self.parse(url, soup)
        return result
