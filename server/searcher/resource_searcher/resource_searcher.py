from .browser import BrowserResourceSearcher
from .web_a import WebAResourceSearcher
from .raw import RawResourceSearcher
from .parse_url import ParseUrlResourceSearcher


types = {
    "browser": BrowserResourceSearcher,
    "web_a": WebAResourceSearcher,
    "raw": RawResourceSearcher,
    "parse_url": ParseUrlResourceSearcher,
}


def create_resource_searcher(config):
    return types[config["type"]](**config)


if __name__ == "__main__":
    import json
    import asyncio
    from pathlib import Path
    from utils.context import Context
    import sys

    src = sys.argv[-2]
    url = sys.argv[-1]

    with open(Path(__file__).parent / ".." / "searcher.json", "r") as f:
        config = json.load(f)
    config = [i for i in config["searchers"] if i["key"] == src][0]
    searcher = create_resource_searcher(config["resource_searcher"])

    async def run():
        async with Context(use_browser=True) as ctx:
            rst = await searcher.search(url)
            print(rst)
    asyncio.run(run())
