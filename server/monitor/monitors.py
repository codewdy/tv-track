from .smart import SmartMonitor
from .zpool import ZPoolMonitor
from .searcher import SearcherMonitor
from schema.config import Config


class Monitors:
    def __init__(self, config: Config):
        self.monitors = [
            SmartMonitor(config),
            ZPoolMonitor(config),
            SearcherMonitor(config)
        ]

    async def start(self):
        for monitor in self.monitors:
            await monitor.start()

    async def stop(self):
        for monitor in self.monitors:
            await monitor.stop()
