from utils.beautiful import request
import asyncio
import re


class WebChannelSearcher:
    def __init__(self, filter=None, **kwargs):
        if filter is None:
            self.filter = None
        else:
            self.filter = re.compile(filter)

    async def search(self, url):
        soup = await request(url)
        result = self.parse(url, soup)
        if self.filter is None:
            return result
        else:
            return [channel for channel in result
                    if self.filter.search(channel.name)]
