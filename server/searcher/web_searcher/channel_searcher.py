from utils.beautiful import request, to_text
from .search_schema import Channel
import urllib


class IndexGroupedParser:
    def __init__(
        self,
        selectChannelNames,
        selectEpisodeLists,
        selectEpisodesFromList,
        selectEpisodeLinksFromList,
        **kwargs,
    ):
        self.selectChannelNames = selectChannelNames
        self.selectEpisodeLists = selectEpisodeLists
        self.selectEpisodesFromList = selectEpisodesFromList
        self.selectEpisodeLinksFromList = selectEpisodeLinksFromList

    def parse_episode_list(self, src, list):
        episodes_tag = [i for i in list.select(self.selectEpisodesFromList)]
        if self.selectEpisodeLinksFromList:
            episode_links = [
                i["href"]
                for i in list.select(self.selectEpisodeLinksFromList)
                if i.has_attr("href") and i["href"] != ""
            ]
        else:
            episode_links = []
        result = []
        for i in range(len(episodes_tag)):
            href = episode_links[i] if i < len(
                episode_links) else episodes_tag[i]["href"]
            if href == "" or href.startswith("javascript:"):
                continue
            result.append(
                Channel.Episode(
                    name=to_text(episodes_tag[i]),
                    url=urllib.parse.urljoin(src, href),
                )
            )

        if len(result) == 0:
            raise FileNotFoundError(f"No Episode Result")
        return result

    def parse(self, src, soup):
        if self.selectChannelNames:
            channel_names = [to_text(i)
                             for i in soup.select(self.selectChannelNames)]
        else:
            channel_names = ["default"]
        episode_lists = [
            self.parse_episode_list(src, i)
            for i in soup.select(self.selectEpisodeLists)
        ]
        return [
            Channel(name=name, episodes=l)
            for name, l in zip(channel_names, episode_lists)
        ]


_PARSER = {
    "index-grouped": IndexGroupedParser,
}


class ChannelSearcher:
    def __init__(self, searchConfig):
        self.parser = _PARSER[searchConfig["parser"]](
            **searchConfig)

    async def search(self, url):
        soup = await request(url)
        result = self.parser.parse(url, soup)
        return result


if __name__ == "__main__":
    import json
    import asyncio
    from pathlib import Path
    from utils.context import Context

    with open(Path(__file__).parent / "searcher.json", "r") as f:
        config = json.load(f)
    searcher = ChannelSearcher(config["searchers"][0]["channdelSearcher"])

    async def run():
        async with Context() as ctx:
            return await searcher.search(
                "https://bgm.girigirilove.com/GV26626/"
            )

    print(asyncio.run(run()))
