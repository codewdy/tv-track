from .web_a import WebAChannelSearcher

types = {
    "web_a": WebAChannelSearcher,
}


def create_channel_searcher(config):
    return types[config["type"]](config)
