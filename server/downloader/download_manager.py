from utils.parallel_runner import ParallelRunner
from .task_downloader import TaskDownloader
from .download_task import DownloadTask
import asyncio
import traceback
from utils.context import Context
from schema.config import DownloadConfig


class DownloadManager:
    def __init__(self, config: DownloadConfig):
        self.runner = ParallelRunner(max_concurrent=config.concurrent)
        self.config = config
        self.pending_tasks = []
        self.downloaders = []

    async def stop(self):
        await self.runner.cancel()

    async def join(self):
        await self.runner.join()

    def get_status(self):
        return {
            "pending": self.pending_tasks,
            "running": [(downloader.download_task, downloader.human_readable_status()) for downloader in self.downloaders],
        }

    def submit(self, **kwargs):
        task = DownloadTask(**kwargs)
        task.timeout = task.timeout or self.config.timeout.total_seconds()
        task.retry = task.retry or self.config.retry
        task.retry_interval = task.retry_interval or self.config.retry_interval.total_seconds()
        self.pending_tasks.append(task)
        self.runner.submit(self.process(task))

    async def process(self, task):
        self.pending_tasks.remove(task)
        downloader = TaskDownloader(task)
        self.downloaders.append(downloader)
        try:
            async with Context.handle_error_context(type="critical", rethrow=True):
                await downloader.run()
                if task.on_finished:
                    async with Context.handle_error_context():
                        task.on_finished()
        except Exception as e:
            error = traceback.format_exc()
            async with Context.handle_error_context():
                task.on_error(error)
        self.downloaders.remove(downloader)


if __name__ == "__main__":
    from downloader.download_task import DownloadTask
    from context import Context

    def on_error(err):
        print("ERROR", err)

    def on_finished():
        print("FINISHED")

    async def test():
        async with Context(use_browser=True) as ctx:
            download_manager = DownloadManager(2)
            download_manager.submit(DownloadTask(sourceKey="girigirilove", url="https://anime.girigirilove.com/playGV26626-1/",
                                    dst="/tmp/1.mp4", on_error=on_error, on_finished=on_finished))
            download_manager.submit(DownloadTask(sourceKey="girigirilove", url="https://anime.girigirilove.com/playGV26626-2-2/",
                                    dst="/tmp/2.mp4", on_error=on_error, on_finished=on_finished))
            download_manager.submit(DownloadTask(sourceKey="girigirilove", url="https://anime.girigirilove.com/playGV26626-2-3/",
                                    dst="/tmp/3.mp4", on_error=on_error, on_finished=on_finished))
            while True:
                print(download_manager.get_status())
                await asyncio.sleep(1)
                if len(download_manager.downloaders) == 0:
                    break
            await download_manager.join()
    asyncio.run(test())
