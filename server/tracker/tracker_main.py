from .db_manager import DBManager
from schema.config import Config
from utils.context import Context
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

    async def stop(self):
        await self.db_manager.stop()
        await self.context.__aexit__(None, None, None)

    async def __aenter__(self):
        await self.start()

    async def __aexit__(self, exc_type, exc, tb):
        await self.stop()


if __name__ == "__main__":
    import asyncio
    from pathlib import Path
    from schema.config import Config

    config = Config.model_validate_json(
        open(Path(__file__).parent.parent / "config.json").read())

    async def test1():
        tracker = Tracker(config)
        async with tracker:
            return config

    open("result.json", "w").write(
        asyncio.run(test1()).model_dump_json(indent=2))
