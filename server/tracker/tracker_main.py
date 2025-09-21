from .db_manager import DBManager
from schema.config import Config
from utils.context import Context
from searcher.searchers import Searchers
from schema.api import *
from .path_manager import PathManager
from .local_manager import LocalManager
from utils.path import ensure_path


class Tracker:
    def __init__(self, config: Config):
        self.config = config
        self.path = PathManager(config)
        self.db_manager = DBManager(self.config)
        self.local_manager = LocalManager(config, self.db_manager)

    async def start(self):
        for path in self.path.required_path():
            ensure_path(path)
        self.context = Context(
            use_browser=True, config=self.config)
        await self.context.__aenter__()
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

    async def add_tv(self, request: AddTV.Request):
        tv_id = await self.local_manager.add_tv(request.name, request.source)
        return AddTV.Response(id=tv_id)


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

    async def test2():
        tracker = Tracker(config)
        async with tracker:
            rst1 = (await tracker.search_tv(SearchTV.Request(keyword="碧蓝之海"))).source[0]
            return await tracker.add_tv(AddTV.Request(name="碧蓝之海2", source=rst1))

    result = asyncio.run(test2()).model_dump_json(indent=2)
    print(result)
    open("result.json", "w").write(result)
