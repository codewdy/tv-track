from .db_manager import DBManager
from schema.config import Config
from utils.context import Context
from searcher.searchers import Searchers
from schema.api import *
from .path_manager import PathManager
from .local_manager import LocalManager
from utils.path import ensure_path
from downloader.download_manager import DownloadManager
from .error_manager import ErrorManager
from service.api_service import api, mock
from .source_updater import SourceUpdater


class Tracker:
    def __init__(self, config: Config):
        self.config = config
        self.path = PathManager(config)
        self.db_manager = DBManager(self.config)
        self.downloader = DownloadManager(self.config.download)
        self.local_manager = LocalManager(
            config, self.db_manager, self.downloader)
        self.error_manager = ErrorManager(config, self.db_manager)
        self.source_updater = SourceUpdater(
            config, self.db_manager, self.local_manager)

    async def start(self):
        for path in self.path.required_path():
            ensure_path(path)
        self.context = Context(
            use_browser=True, config=self.config)
        self.context.error_handler.add_handler(self.error_manager.handle_error)
        await self.context.__aenter__()
        await self.db_manager.start()
        await self.local_manager.start()
        await self.source_updater.start()
        self.searchers = Searchers()

    async def stop(self):
        await self.db_manager.stop()
        await self.context.__aexit__(None, None, None)

    async def __aenter__(self):
        await self.start()

    async def __aexit__(self, exc_type, exc, tb):
        await self.stop()

    def save(self):
        self.db_manager.save()

    @api
    async def search_tv(self, request: SearchTV.Request):
        return SearchTV.Response(source=await self.searchers.search(request.keyword))

    @api
    async def add_tv(self, request: AddTV.Request):
        tv_id = await self.local_manager.add_tv(request.name, request.source, request.tag)
        return AddTV.Response(id=tv_id)

    @mock
    async def mock_add_tv(self, request: AddTV.Request):
        print(f"mock add tv: ", request)
        return AddTV.Response(id=0)

    @api
    async def remove_tv(self, request: RemoveTV.Request):
        await self.local_manager.remove_tv(request.id)
        return RemoveTV.Response()

    @api
    async def get_tv(self, request: GetTV.Request):
        tv = self.db_manager.tv(request.id)
        return GetTV.Response(
            name=tv.name,
            tag=tv.tag,
            watch=tv.watch,
            episodes=[
                GetTV.Episode(
                    name=e.name,
                    url=self.path.tv_url(tv, e.filename))
                for e in tv.local.episodes])

    @api
    async def get_download_status(self, request: GetDownloadStatus.Request):
        status = self.downloader.get_status()
        return GetDownloadStatus.Response(
            downloading=[
                GetDownloadStatus.DownloadTask(
                    resource=task.meta,
                    status=s)
                for task, s in status["running"]],
            pending=[
                GetDownloadStatus.DownloadTask(
                    resource=task.meta,
                    status="pending")
                for task in status["pending"]])

    @mock
    async def mock_get_download_status(self, request: GetDownloadStatus.Request):
        return GetDownloadStatus.Response(
            downloading=[
                GetDownloadStatus.DownloadTask(
                    resource="三月的狮子1", status="downloading 1M/s"),
                GetDownloadStatus.DownloadTask(
                    resource="三月的狮子2", status="downloading 3M/s")],
            pending=[
                GetDownloadStatus.DownloadTask(
                    resource="三月的狮子3", status="pending")])

    @api
    async def get_errors(self, request: GetErrors.Request):
        error_db = self.db_manager.error()
        return GetErrors.Response(errors=error_db.errors)

    @api
    async def set_watch(self, request: SetWatch.Request):
        tv = self.db_manager.tv(request.id)
        tv.watch = request.watch
        self.db_manager.tv_dirty(tv)
        return SetWatch.Response()


if __name__ == "__main__":
    import asyncio
    from pathlib import Path
    from schema.config import Config
    import sys

    config = Config.model_validate_json(
        open(Path(__file__).parent.parent / "config.json").read())

    async def test1():
        tracker = Tracker(config)
        async with tracker:
            return await tracker.search_tv(SearchTV.Request(keyword="房东妹子"))

    async def test2():
        tracker = Tracker(config)
        async with tracker:
            rst1 = (await tracker.search_tv(SearchTV.Request(keyword="房东妹子"))).source[0]
            rst1.episodes = rst1.episodes[:1]
            await tracker.add_tv(AddTV.Request(name="房东妹子青春期2", source=rst1, tag="dropped"))
            for i in range(100):
                print((await tracker.get_download_status(GetDownloadStatus.Request())).model_dump_json(indent=2))
                await asyncio.sleep(1)

    async def test3():
        tracker = Tracker(config)
        async with tracker:
            return await tracker.remove_tv(RemoveTV.Request(id=1))

    async def test4():
        tracker = Tracker(config)
        async with tracker:
            return await tracker.get_errors(GetErrors.Request())

    async def test5():
        tracker = Tracker(config)
        async with tracker:
            return await tracker.get_tv(GetTV.Request(id=2))

    result = asyncio.run(locals()[sys.argv[1]]()).model_dump_json(indent=2)
    print(result)
    open("result.json", "w").write(result)
