from utils.baidu import baidu_search
import re


class BaiduSubjectSearcher:
    def __init__(self, config):
        self.search_template = config["search_template"]
        self.filter = re.compile(config["filter"])
        self.match_point = config["match_point"]

    def match(self, keyword: str, title: str):
        s = 0
        for k in keyword:
            if k in title:
                s += 1
        return s / len(keyword) >= self.match_point

    async def search(self, keyword: str):
        rst = await baidu_search(self.search_template.format(keyword=keyword))
        rst = [i for i in rst if self.filter.match(i)]
        rst = [await self.parse(i) for i in rst]
        rst = [i for i in rst if self.match(keyword, i.name)]
        return rst
