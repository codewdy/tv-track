from .web_a import WebASubjectSearcher
from .web_b import WebBSubjectSearcher

types = {
    "web_a": WebASubjectSearcher,
    "web_b": WebBSubjectSearcher,
}


def create_subject_searcher(config):
    return types[config["type"]](config)
