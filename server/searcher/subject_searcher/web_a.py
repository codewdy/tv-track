from .web import WebSubjectSearcher
from schema.searcher import Subject
from utils.beautiful import to_text
import urllib


class WebASubjectSearcher(WebSubjectSearcher):
    def __init__(self, config):
        super().__init__(config)
        self.select_names = config["select_names"]
        self.select_links = config["select_links"]

    def parse(self, src, soup):
        text = [to_text(i) for i in soup.select(self.select_names)]
        href = [
            i["href"]
            for i in soup.select(self.select_links)
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
