from .subject_searcher import SubjectSearcher
from .channel_searcher import ChannelSearcher
from .resource_searcher import ResourceSearcher
from schema.db import Source


class Searcher:
    def __init__(self, config):
        self.key = config["key"]
        self.name = config["name"]
        self.subject_searcher = SubjectSearcher(config["subjectSearcher"])
        self.channel_searcher = ChannelSearcher(config["channelSearcher"])
        self.resource_searcher = ResourceSearcher(config["resourceSearcher"])

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
                        channel_name=channel.name,
                        url=subject.url,
                        cover_url=subject.cover_url,
                        tracking=False,
                        episodes=[Source.Episode(
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
                    return Source(
                        source_key=source.source_key,
                        name=source.name,
                        channel_name=channel.name,
                        url=source.url,
                        cover_url=source.cover_url,
                        tracking=False,
                        episodes=[Source.Episode(
                            name=e.name, url=e.url) for e in channel.episodes],
                    )
            else:
                raise RuntimeError(
                    f"channel not found: {source.channel_name}")
        except:
            raise RuntimeError("update error: ", self.name, source.name)

    async def get_video(self, url):
        return await self.resource_searcher.search(url)


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
                "example_video": example_video,
            }
            print(rst)
            with open("result.json", "w") as f:
                f.write(json.dumps(rst, ensure_ascii=False, indent=2))
    asyncio.run(run())
