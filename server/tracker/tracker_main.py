from .db_manager import DBManager
from schema.config import Config
from utils.context import Context
from searcher.searchers import Searchers
from schema.api import *
import os


class Tracker:
    def __init__(self, config: Config):
        self.config = config

    async def start(self):
        os.makedirs(self.config.tracker.resource_dir, exist_ok=True)
        self.context = Context(
            use_browser=True, config=self.config)
        await self.context.__aenter__()
        self.db_manager = DBManager(self.config)
        await self.db_manager.start()
        self.searchers = Searchers()

    async def stop(self):
        await self.db_manager.stop()
        await self.context.__aexit__(None, None, None)

    async def __aenter__(self):
        await self.start()

    async def __aexit__(self, exc_type, exc, tb):
        await self.stop()

    async def search_tv(self, request: SearchTV.Request):
        return SearchTV.Response(source=await self.searchers.search(request.keyword))


if __name__ == "__main__":
    import asyncio
    from pathlib import Path
    from schema.config import Config

    config = Config.model_validate_json(
        open(Path(__file__).parent.parent / "config.json").read())

    async def test1():
        tracker = Tracker(config)
        async with tracker:
            return await tracker.search_tv(SearchTV.Request(keyword="碧蓝之海"))

    result = asyncio.run(test1()).model_dump_json(indent=2)
    print(result)
    open("result.json", "w").write(result)
