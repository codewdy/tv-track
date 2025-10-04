from .web import WebSubjectSearcher
from schema.searcher import Subject
from utils.beautiful import to_text
import urllib


class WebBSubjectSearcher(WebSubjectSearcher):
    def __init__(self, config):
        super().__init__(config)
        self.a = config["a"]
        self.cover = config["cover"]
        self.cover_attr = config["cover_attr"]

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
