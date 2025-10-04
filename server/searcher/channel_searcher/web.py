from utils.beautiful import request


class WebChannelSearcher:
    def __init__(self, config):
        pass

    async def search(self, url):
        soup = await request(url)
        result = self.parse(url, soup)
        return result
