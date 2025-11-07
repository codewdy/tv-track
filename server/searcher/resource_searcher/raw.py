from schema.searcher import Resource


class RawResourceSearcher:
    def __init__(self, file_type="auto", **kwargs):
        self.file_type = file_type

    async def search(self, url):
        return Resource(url=url, type=self.file_type)
