from .web import WebChannelSearcher
from utils.beautiful import to_text
import urllib
from schema.searcher import Channel


class WebAChannelSearcher(WebChannelSearcher):
    def __init__(
        self,
        config,
    ):
        super().__init__(config)
        self.select_channel_names = config["select_channel_names"]
        self.select_episode_lists = config["select_episode_lists"]
        self.select_episodes_from_list = config["select_episodes_from_list"]
        self.select_episode_links_from_list = config["select_episode_links_from_list"]

    def parse_episode_list(self, src, list):
        episodes_tag = [i for i in list.select(self.select_episodes_from_list)]
        if self.select_episode_links_from_list:
            episode_links = [
                i["href"]
                for i in list.select(self.select_episode_links_from_list)
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
        if self.select_channel_names:
            channel_names = [to_text(i)
                             for i in soup.select(self.select_channel_names)]
        else:
            channel_names = ["default"]
        episode_lists = [
            self.parse_episode_list(src, i)
            for i in soup.select(self.select_episode_lists)
        ]
        return [
            Channel(name=name, episodes=l)
            for name, l in zip(channel_names, episode_lists)
        ]
