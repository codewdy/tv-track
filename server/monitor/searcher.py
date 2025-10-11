from utils.timer import Timer
from searcher.searchers import Searchers
from schema.config import Config


class SearcherMonitor:
    def __init__(self, config: Config):
        self.timer = Timer(
            self.check, config.monitor.check_searcher_interval.total_seconds())
        self.searchers = Searchers()

    async def start(self):
        await self.timer.start()

    async def stop(self):
        await self.timer.stop()

    async def check(self):
        await self.searchers.self_test()
