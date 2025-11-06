from .web_a import WebAChannelSearcher

types = {
    "web_a": WebAChannelSearcher,
}


def create_channel_searcher(config):
    return types[config["type"]](**config)


if __name__ == "__main__":
    import json
    import asyncio
    from pathlib import Path
    from utils.context import Context
    import sys

    src = sys.argv[-2]
    url = sys.argv[-1]

    with open(Path(__file__).parent / ".." / "searcher.json", "r") as f:
        config = json.load(f)
    config = [i for i in config["searchers"] if i["key"] == src][0]
    searcher = create_channel_searcher(config["channel_searcher"])

    async def run():
        async with Context(use_browser=True) as ctx:
            rst = await searcher.search(url)
            print(rst)
            with open("result.json", "w") as f:
                f.write(json.dumps([i.model_dump(mode="json")
                        for i in rst], ensure_ascii=False, indent=2))
    asyncio.run(run())
