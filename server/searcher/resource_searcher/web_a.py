from .web import WebResourceSearcher
import re
import json
import urllib


class WebAResourceSearcher(WebResourceSearcher):
    def __init__(self, config):
        super().__init__(config)
        self.regex = re.compile(config["regex"])
        self.attr = config["attr"]

    def parse(self, src, soup):
        scripts = soup.select("script")
        for script in scripts:
            search = self.regex.search(script.text)
            if search:
                data = json.loads(search.group(1))
                return urllib.parse.urljoin(src, data[self.attr])
