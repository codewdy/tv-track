from .browser import BrowserResourceSearcher

types = {
    "browser": BrowserResourceSearcher,
}


def create_resource_searcher(config):
    return types[config["type"]](config)
