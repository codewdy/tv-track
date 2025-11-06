from utils.beautiful import request
import asyncio
import re


class WebChannelSearcher:
    def __init__(self, filter=[], **kwargs):
        self.filter = [re.compile(i) for i in filter]

    async def search(self, url):
        soup = await request(url)
        result = self.parse(url, soup)
        for filter in self.filter:
            result_filtered = [
                channel for channel in result
                if filter.search(channel.name)]
            if len(result_filtered) != 0:
                return result_filtered
        return result
