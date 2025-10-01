import subprocess
from zpool_status import ZPool as ZPoolStatus
from utils.timer import Timer
from utils.context import Context
from schema.config import Config


class ZPool:
    @staticmethod
    def get_all_pool():
        output = subprocess.check_output(["zpool", "list", "-H", "-o", "name"])
        return output.decode().strip().split("\n")

    @staticmethod
    def get_pool_status(pool):
        return ZPoolStatus(pool).get_status()

    @staticmethod
    def check_pool(pool):
        status = ZPool.get_pool_status(pool)
        if status["state"] != "ONLINE":
            raise ValueError(
                f"pool {pool} is not online, status: {status["state"]}")
        if status["errors"] != ['No known data errors']:
            raise ValueError(
                f"pool {pool} has errors, error: {status["errors"]}")
        if status["config"][0]["read"] > 0:
            raise ValueError(
                f"pool {pool} has read errors, error: {status["config"][0]["read"]}")
        if status["config"][0]["write"] > 0:
            raise ValueError(
                f"pool {pool} has write errors, error: {status["config"][0]["write"]}")
        if status["config"][0]["cksum"] > 0:
            raise ValueError(
                f"pool {pool} has checksum errors, error: {status["config"][0]["cksum"]}")


class ZPoolMonitor:
    def __init__(self, config: Config):
        self.timer = Timer(
            self.check, config.monitor.check_zpool_interval.total_seconds())

    async def start(self):
        await self.timer.start()

    async def stop(self):
        await self.timer.stop()

    async def check(self):
        with Context.handle_error_context("zpool monitor check error", type="critical"):
            pools = ZPool.get_all_pool()
            for pool in pools:
                with Context.handle_error_context(f"check pool {pool} error", type="critical"):
                    ZPool.check_pool(pool)


if __name__ == "__main__":
    import asyncio
    from utils.context import Context
    from pathlib import Path
    from schema.config import Config
    import sys

    config = Config.model_validate_json(
        open(Path(__file__).parent.parent / "config.json").read())

    async def run():
        zpool_monitor = ZPoolMonitor(config)
        async with Context() as ctx:
            await zpool_monitor.check()
    asyncio.run(run())
