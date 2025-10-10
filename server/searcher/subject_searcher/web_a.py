from .web import WebSubjectSearcher
from schema.searcher import Subject
from utils.beautiful import to_text
import urllib


class WebASubjectSearcher(WebSubjectSearcher):
    def __init__(self, config):
        super().__init__(config)
        self.token = config["token"]
        self.a = config["a"]
        self.cover = config["cover"]
        self.cover_attr = config["cover_attr"]

    def parse(self, src, soup):
        tokens = soup.select(self.token)
        a_s = soup.select(self.a)
        covers = soup.select(self.cover)

        if len(tokens) != len(a_s):
            raise RuntimeError(
                f"cannot parse search result len(tokens)={len(tokens)} len(a_s)={len(a_s)}"
            )

        if len(tokens) != len(covers):
            raise RuntimeError(
                f"cannot parse search result len(tokens)={len(tokens)} len(covers)={len(covers)}"
            )

        return [
            Subject(
                name=to_text(token),
                url=urllib.parse.urljoin(src, a["href"]),
                cover_url=urllib.parse.urljoin(src, cover[self.cover_attr]))
            for token, a, cover in zip(tokens, a_s, covers)
        ]
