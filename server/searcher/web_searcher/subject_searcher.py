from .search_schema import Subject
from utils.beautiful import request, to_text
import urllib


class IndexedParser:
    def __init__(self, selectNames, selectLinks, **kwargs):
        self.selectNames = selectNames
        self.selectLinks = selectLinks

    def parse(self, src, soup):
        text = [to_text(i) for i in soup.select(self.selectNames)]
        href = [
            i["href"]
            for i in soup.select(self.selectLinks)
            if i.has_attr("href") and i["href"] != ""
        ]

        if len(text) != len(href):
            raise RuntimeError(
                f"cannot parse search result len(text)={len(text)} len(href)={len(href)}"
            )

        return [
            {"name": name, "link": urllib.parse.urljoin(src, href)}
            for name, href in zip(text, href)
        ]


class AParser:
    def __init__(self, a, cover, cover_attr="src", **kwargs):
        self.a = a
        self.cover = cover
        self.cover_attr = cover_attr

    def parse(self, src, soup):
        tokens = soup.select(self.a)
        covers = soup.select(self.cover)

        if len(tokens) != len(covers):
            raise RuntimeError(
                f"cannot parse search result len(tokens)={len(tokens)} len(covers)={len(covers)}"
            )

        return [
            Subject(
                name=to_text(token),
                url=urllib.parse.urljoin(src, token["href"]),
                cover_url=urllib.parse.urljoin(src, cover[self.cover_attr]))
            for token, cover in zip(tokens, covers)
        ]


_PARSER = {
    "indexed": IndexedParser,
    "a": AParser,
}


class SubjectSearcher:
    def __init__(self, searchConfig):
        self.searchUrl = searchConfig["searchUrl"]
        self.parser = _PARSER[searchConfig["parser"]](
            **searchConfig)

    def request_url(self, query):
        return self.searchUrl.format(keyword=urllib.parse.quote(query))

    async def search(self, query):
        request_url = self.request_url(query)
        soup = await request(request_url)
        return self.parser.parse(request_url, soup)


if __name__ == "__main__":
    import json
    import asyncio
    from pathlib import Path
    from utils.context import Context

    with open(Path(__file__).parent / "searcher.json", "r") as f:
        config = json.load(f)
    searcher = SubjectSearcher(config["searchers"][0]["subjectSearcher"])

    async def run():
        async with Context() as ctx:
            return await searcher.search("碧蓝之海")

    print(asyncio.run(run()))
