from contextlib import contextmanager
import traceback
from collections import defaultdict


class ErrorHandler:
    def __init__(self):
        self.handlers = defaultdict(list)

    def add_handler(self, type, handler):
        self.handlers[type].append(handler)

    def handle_error(self, type, title, error):
        for handler in self.handlers[type]:
            handler(title, error)

    @contextmanager
    def handle_error_context(self, title, type: str = "error", rethrow=False):
        try:
            yield
        except Exception as e:
            self.handle_error(type, title, traceback.format_exc())
            if rethrow:
                raise e


if __name__ == "__main__":
    import asyncio

    async def test():
        eh = ErrorHandler()
        eh.add_handler("error", print)
        with eh.handle_error_context("test error"):
            raise RuntimeError("test error")
    asyncio.run(test())
