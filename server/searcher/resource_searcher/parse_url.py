from schema.searcher import Resource
from urllib.parse import urlparse, parse_qs


class ParseUrlResourceSearcher:
    def __init__(self, key="url", file_type="auto", **kwargs):
        self.file_type = file_type
        self.key = key

    async def search(self, url):
        parsed_url = urlparse(url)
        query_params = parse_qs(parsed_url.query)
        return Resource(url=query_params[self.key][0], type=self.file_type)
