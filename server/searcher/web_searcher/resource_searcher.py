from urllib.parse import urlparse, parse_qs
from utils.context import Context

_PREFIX = [".mp4", ".m3u8"]


class RequestResourceHandler:
    def __init__(self):
        self.result = None

    async def handle_request(self, route):
        self.result = route.request.url
        await route.abort()

    @staticmethod
    async def get(url):
        result = RequestResourceHandler()
        page = await Context.browser.new_page()
        await page.route("**/*.{mp4,m3u8}", result.handle_request)
        await page.goto(url, timeout=60000)
        await page.title()
        await page.close()
        return result.result


class ResourceParser:
    def __init__(self):
        pass

    def parse(self, url):
        parsed_url = urlparse(url)
        query_params = parse_qs(parsed_url.query)
        if "url" in query_params:
            return query_params["url"][0]
        return url


class ResourceSearcher:
    def __init__(self, searchConfig):
        self.parser = ResourceParser()

    async def search(self, url):
        rst = await RequestResourceHandler.get(url)
        if rst is None:
            raise ValueError(f"cannot get resource: {url}")
        return self.parser.parse(rst)


if __name__ == "__main__":
    import asyncio
    searcher = ResourceSearcher(None)

    async def test():
        async with Context(use_browser=True) as ctx:
            rst = asyncio.gather(
                searcher.search(
                    "https://bgm.girigirilove.com/playGV26626-1-1/"),
                # searcher.search("https://vdm10.com/play/13842-2-1.html"),
                # searcher.search("https://www.fqdm.cc/index.php/vod/play/id/11579/sid/2/nid/1.html"),
                # searcher.search("https://www.yinghua2.com/index.php/vod/play/id/56591/sid/4/nid/1.html"),
                # searcher.search("https://zgacgn.com/play/19246-2-0.html"),
                # searcher.search("https://dm1.xfdm.pro/watch/124/1/1.html"),
                # searcher.search("https://omofun.icu/vod/play/id/136511/sid/4/nid/1.html"),
                # searcher.search("https://www.mxdmp.com/play/2193/1/1/"),
            )
            print(await rst)
    asyncio.run(test())
