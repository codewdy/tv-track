from .web_searcher.searcher_list import searcher_list as web_searcher_list
from functools import cache
import asyncio
from utils.context import Context


@cache
def searcher_list():
    return web_searcher_list()


@cache
def searcher_dict():
    return {i.key: i for i in searcher_list()}


class SearchFunctor:
    def __init__(self, keyword):
        self.keyword = keyword

    async def __call__(self, searcher):
        async with Context.handle_error_context():
            return await searcher.search(self.keyword)
        return []


class Searchers:
    def __init__(self):
        self.searcher_list = searcher_list()
        self.searcher_dict = searcher_dict()

    async def search(self, keyword):
        results = await asyncio.gather(
            *map(
                SearchFunctor(keyword),
                self.searcher_list,
            )
        )
        return sum(results, [])

    async def update(self, source):
        async with Context.handle_error_context():
            return await self.searcher_dict[source.key].update(source)
        return source
