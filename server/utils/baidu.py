from .context import Context
from .beautiful import request

HEADERS = {
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
    "Content-Type": "application/x-www-form-urlencoded",
    "User-Agent": 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3440.106 Safari/537.36',
    "Referer": "https://www.baidu.com/",
    "Accept-Encoding": "gzip, deflate",
    "Accept-Language": "zh-CN,zh;q=0.9"
}


async def baidu_search(query: str):
    try:
        result = await baidu_search_by_html(query)
        if len(result) > 0:
            return result
        raise ValueError("no result")
    except:
        return await baidu_search_by_api(query)


async def baidu_search_by_api(query: str):
    api_key = Context.current.config.api_key.serp_api
    url = f"https://serpapi.com/search.json?engine=baidu&q={query}&api_key={api_key}"
    async with Context.current.client.get(url) as resp:
        data = await resp.json()
        return [i['link'] for i in data.get("organic_results", [])]


async def baidu_search_by_html(query: str):
    url = f"https://www.baidu.com/s?ie=utf-8&tn=baidu&wd={query}"
    soup = await request(url)
    links = soup.select("a.sc-link")
    return [await get_raw_html(i.get("href")) for i in links]


async def get_raw_html(url: str):
    async with Context.current.client.get(url, headers=HEADERS, allow_redirects=False) as resp:
        if resp.status != 302:
            raise ValueError(f"unexpected status code: {resp.status}")
        return resp.headers.get("Location")

if __name__ == "__main__":
    import asyncio

    async def run():
        async with Context() as ctx:
            return await baidu_search("site:souerp.com.cn v-detail 宝可梦")
    data = asyncio.run(run())
    print(data)
