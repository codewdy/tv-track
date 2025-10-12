from utils.beautiful import request
import asyncio
import re


class WebChannelSearcher:
    def __init__(self, config):
        self.filter = re.compile(config["filter"])

    async def search(self, url):
        soup = await request(url)
        result = self.parse(url, soup)
        result = [
            channel for channel in result
            if self.filter.search(channel.name)]
        return result
