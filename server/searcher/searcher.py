from .resource_searcher.resource_searcher import create_resource_searcher
from .subject_searcher.subject_searcher import create_subject_searcher
from .channel_searcher.channel_searcher import create_channel_searcher
from schema.db import Source
from utils.context import Context


class Searcher:
    _SELFTEST_MAX_ERROR_TIME = 3

    def __init__(self, config):
        self.resource_searcher = create_resource_searcher(
            config["resource_searcher"])
        self.subject_searcher = create_subject_searcher(
            config["subject_searcher"])
        self.channel_searcher = create_channel_searcher(
            config["channel_searcher"])
        self.key = config["key"]
        self.name = config["name"]
        self.self_test_keyword = config["self_test"]["keyword"]
        self.selftest_error_time = 0

    async def search(self, keyword):
        try:
            results = []
            subjects = await self.subject_searcher.search(keyword)
            for subject in subjects:
                channels = await self.channel_searcher.search(subject.url)
                for channel in channels:
                    results.append(Source(
                        source_key=self.key,
                        name=f"{subject.name} - {self.name} - {channel.name}",
                        title=subject.name,
                        channel_name=channel.name,
                        url=subject.url,
                        cover_url=subject.cover_url or channel.cover_url,
                        tracking=False,
                        episodes=[Source.Episode(
                            source_key=self.key,
                            name=e.name, url=e.url) for e in channel.episodes],
                    ))
            return results
        except:
            raise RuntimeError("search error: ", self.name, keyword)

    async def update(self, source: Source):
        try:
            channels = await self.channel_searcher.search(source.url)
            for channel in channels:
                if channel.name == source.channel_name:
                    rst = source.model_copy()
                    rst.episodes = [Source.Episode(
                        source_key=self.key,
                        name=e.name, url=e.url) for e in channel.episodes]
                    return rst
            else:
                raise RuntimeError(
                    f"channel not found: {source.channel_name} channel found: {[i.name for i in channels]}")
        except:
            raise RuntimeError("update error: ", self.name, source.name)

    async def get_video(self, url):
        return await self.resource_searcher.search(url)

    async def self_test(self):
        with Context.handle_error_context(f"self test {self.key} error", type="critical"):
            try:
                rst = await self.search(self.self_test_keyword)
                example_video = await self.get_video(rst[0].episodes[0].url)
                if example_video is None:
                    raise RuntimeError("self test error: ", self.name,
                                       self.self_test_keyword)
                self.selftest_error_time = 0
            except:
                self.selftest_error_time += 1
                if self.selftest_error_time >= Searcher._SELFTEST_MAX_ERROR_TIME:
                    raise


if __name__ == "__main__":
    import json
    import asyncio
    from pathlib import Path
    from utils.context import Context
    import sys

    src = sys.argv[-2]
    keyword = sys.argv[-1]

    with open(Path(__file__).parent / "searcher.json", "r") as f:
        config = json.load(f)
    config = [i for i in config["searchers"] if i["key"] == src][0]
    searcher = Searcher(config)

    async def run():
        async with Context(use_browser=True) as ctx:
            rst = await searcher.search(keyword)
            example_video = await searcher.get_video(rst[0].episodes[0].url)
            rst = {
                "source": [i.model_dump(mode="json") for i in rst],
                "example_video": example_video.model_dump(mode="json"),
            }
            print(rst)
            with open("result.json", "w") as f:
                f.write(json.dumps(rst, ensure_ascii=False, indent=2))
    asyncio.run(run())
