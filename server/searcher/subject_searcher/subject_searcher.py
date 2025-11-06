from .web_a import WebASubjectSearcher
from .baidu_a import BaiduASubjectSearcher

types = {
    "web_a": WebASubjectSearcher,
    "baidu_a": BaiduASubjectSearcher,
}


def create_subject_searcher(config):
    return types[config["type"]](**config)


if __name__ == "__main__":
    import json
    import asyncio
    from pathlib import Path
    from utils.context import Context
    import sys

    src = sys.argv[-2]
    keyword = sys.argv[-1]

    with open(Path(__file__).parent / ".." / "searcher.json", "r") as f:
        config = json.load(f)
    config = [i for i in config["searchers"] if i["key"] == src][0]
    searcher = create_subject_searcher(config["subject_searcher"])

    async def run():
        async with Context(use_browser=True) as ctx:
            rst = await searcher.search(keyword)
            print(rst)
            with open("result.json", "w") as f:
                f.write(json.dumps([i.model_dump(mode="json")
                        for i in rst], ensure_ascii=False, indent=2))
    asyncio.run(run())
