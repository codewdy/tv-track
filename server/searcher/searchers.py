from .web_searcher.searcher_list import searcher_list as web_searcher_list
from functools import cache


@cache
def searcher_list():
    return web_searcher_list()


@cache
def searcher_dict():
    return {i.key: i for i in searcher_list()}


if __name__ == "__main__":
    print(searcher_list())
    print(searcher_dict())
