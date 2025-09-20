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
        async with Context.handle_error:
            try:
                results = []
                subjects = await self.subject_searcher.search(keyword)
                for subject in subjects:
                    channels = await self.channel_searcher.search(subject.url)
                    for channel in channels:
                        results.append(Source(
                            source_key=self.key,
                            name=subject.name + " - " + channel.name,
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
        async with Context.handle_error:
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


if __name__ == "__main__":
    import json
    import asyncio
    from pathlib import Path
    from utils.context import Context

    with open(Path(__file__).parent / "searcher.json", "r") as f:
        config = json.load(f)
    searcher = Searcher(config["searchers"][0])

    async def run():
        async with Context() as ctx:
            rst = await searcher.search("碧蓝之海")
            print(rst)
            rst2 = await searcher.update(rst[0])
            print(rst2)

    asyncio.run(run())
