from bs4 import BeautifulSoup
from bs4.element import NavigableString
from utils.context import Context
import asyncio


HEADERS = {
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
    "Content-Type": "application/x-www-form-urlencoded",
    "User-Agent": 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3440.106 Safari/537.36',
    "Referer": "https://www.baidu.com/",
    "Accept-Encoding": "gzip, deflate",
    "Accept-Language": "zh-CN,zh;q=0.9"
}


async def request(url, headers=HEADERS, retry=3):
    async with Context.client.get(url, headers=headers) as response:
        if response.status == 429:
            if retry > 0:
                await asyncio.sleep(5)
                return await request(url, headers, retry - 1)
        if response.status != 200:
            raise RuntimeError(
                f"cannot get result status_code={response.status}"
            )
        return BeautifulSoup(await response.text(), features="lxml")


def to_text(token):
    if "title" in token.attrs:
        return token.attrs["title"]
    for child in token.children:
        if isinstance(child, NavigableString):
            return child.text.strip()
    return token.text.strip()
