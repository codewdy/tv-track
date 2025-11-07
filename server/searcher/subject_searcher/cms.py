from urllib.parse import quote
from utils.beautiful import request_json
from schema.searcher import Subject


class CMSSubjectSearcher:
    def __init__(self, url, url_pattern, **kwargs):
        self.url = url
        self.url_pattern = url_pattern

    def list_url(self, keyword):
        return f"{self.url}?at=list&wd={quote(keyword)}"

    async def search(self, keyword):
        data = await request_json(self.list_url(keyword))
        return [Subject(
            name=item["vod_name"],
            url=self.url_pattern.format(vod_id=item["vod_id"]),
        ) for item in data["list"]]
