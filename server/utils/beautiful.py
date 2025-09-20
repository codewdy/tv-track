from bs4 import BeautifulSoup
from bs4.element import NavigableString
from utils.context import Context


async def request(url):
    async with Context.client.get(url) as response:
        if response.status != 200:
            raise RuntimeError(
                f"cannot get result status_code={response.status}"
            )
        return BeautifulSoup(await response.text(), features="lxml")


def to_text(token):
    for child in token.children:
        if isinstance(child, NavigableString):
            return child.text.strip()
    return token.text.strip()
