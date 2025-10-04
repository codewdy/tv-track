from utils.context import Context
from urllib.parse import urlparse, parse_qs

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


class BrowserResourceSearcher:
    def __init__(self, config):
        pass

    async def search(self, url):
        video_url = await RequestResourceHandler.get(url)
        if video_url is None:
            raise ValueError(f"cannot get resource: {url}")
        parsed_url = urlparse(video_url)
        query_params = parse_qs(parsed_url.query)
        if "url" in query_params:
            return query_params["url"][0]
        return video_url
