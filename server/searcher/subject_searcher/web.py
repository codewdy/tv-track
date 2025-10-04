from schema.searcher import Subject
from utils.beautiful import request, to_text
import urllib


class WebSubjectSearcher:
    def __init__(self, config):
        self.search_url = config["search_url"]

    def request_url(self, query):
        return self.search_url.format(keyword=urllib.parse.quote(query))

    async def search(self, query):
        request_url = self.request_url(query)
        soup = await request(request_url)
        return self.parse(request_url, soup)
