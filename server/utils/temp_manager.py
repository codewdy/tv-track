import uuid
import os
from utils.run_cmd import run_cmd


class TempManager:
    def __init__(self, temp_dir, auto_remove=True):
        self.dir = None
        self.allocated_files = []
        self.auto_remove = auto_remove
        self.temp_dir = temp_dir

    def allocate_file(self, name):
        path = os.path.join(self.dir, name)
        self.allocated_files.append(path)
        return path

    async def start(self):
        while True:
            name = str(uuid.uuid4())
            path = os.path.join(self.temp_dir, name)
            try:
                os.makedirs(path)
            except FileExistsError:
                continue
            self.dir = path
            return

    async def close(self):
        if self.auto_remove:
            try:
                await run_cmd("rm", "-rf", self.dir)
            except ValueError:
                for file in self.allocated_files:
                    try:
                        await run_cmd("rm", "-rf", file)
                    except ValueError:
                        pass

    async def __aenter__(self):
        await self.start()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()


if __name__ == "__main__":
    import asyncio

    async def test():
        async with TempManager() as manager:
            print(manager.allocate_file("test.txt"))
    asyncio.run(test())
