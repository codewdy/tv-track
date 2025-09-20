import asyncio


class Timer:
    def __init__(self, callback, interval):
        self.callback = callback
        self.interval = interval

    async def loop(self):
        while True:
            await asyncio.sleep(self.interval)
            await self.callback()

    async def start(self):
        self.task = asyncio.create_task(self.loop())

    async def stop(self):
        self.task.cancel()
        try:
            await self.task
        except asyncio.CancelledError:
            pass
