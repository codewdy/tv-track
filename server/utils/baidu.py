from .context import Context


async def baidu_search(query: str):
    api_key = Context.current.config.api_key.serp_api
    url = f"https://serpapi.com/search.json?engine=baidu&q={query}&api_key={api_key}"
    async with Context.current.client.get(url) as resp:
        data = await resp.json()
        return [i['link'] for i in data.get("organic_results", [])]

if __name__ == "__main__":
    import asyncio

    async def run():
        async with Context() as ctx:
            return await baidu_search("site:souerp.com.cn v-detail 宝可梦")
    data = asyncio.run(run())
