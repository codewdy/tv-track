from searcher.searchers import Searchers
from downloader.mp4_downloader import MP4Downloader
from downloader.m3u8_downloader import M3U8Downloader
from utils.context import Context
import asyncio


class TaskDownloader:
    def __init__(self, download_task):
        self.download_task = download_task
        self.status = "preparing"
        self.searchers = Searchers()

    def get_downloader(self, video_url):
        if video_url.type == "mp4":
            return MP4Downloader(video_url.url, self.download_task.dst)
        elif video_url.type == "m3u8":
            return M3U8Downloader(video_url.url, self.download_task.dst)
        elif video_url.type == "auto":
            if video_url.url.endswith(".mp4"):
                return MP4Downloader(video_url.url, self.download_task.dst)
            elif video_url.url.endswith(".m3u8"):
                return M3U8Downloader(video_url.url, self.download_task.dst)
        raise ValueError(f"Unknown task type: {video_url.type}")

    async def run_once(self):
        self.status = "searching task"
        video_url = await self.searchers.get_video(self.download_task.sourceKey, self.download_task.url)
        self.downloader = self.get_downloader(video_url)
        self.status = "downloading"
        await self.downloader.run()
        self.status = "done"

    async def run(self):
        for i in range(self.download_task.retry, 0, -1):
            try:
                with Context.handle_error_context(f"download once {self.download_task.meta} error", rethrow=True):
                    await asyncio.wait_for(self.run_once(), timeout=self.download_task.timeout)
                    break
            except Exception as e:
                if i == 1:
                    raise
                else:
                    self.status = f"waiting retry, retry left: {i - 1}"
                    await asyncio.sleep(self.download_task.retry_interval)

    def human_readable_status(self):
        if self.status == "downloading":
            return self.downloader.human_readable_status()
        return self.status


if __name__ == "__main__":
    import asyncio
    from downloader.download_task import DownloadTask
    import sys

    download_task = DownloadTask(
        sourceKey=sys.argv[-3],
        url=sys.argv[-2],
        dst=sys.argv[-1],
        retry=3,
        retry_interval=1.5,
        timeout=1000,
    )

    async def run():
        async with Context(use_browser=True) as ctx:
            downloader = TaskDownloader(download_task)
            task = asyncio.create_task(downloader.run())
            while True:
                await asyncio.sleep(1)
                print(downloader.human_readable_status())
                if task.done():
                    break
            print(downloader.human_readable_status())

    asyncio.run(run())
