from contextlib import asynccontextmanager
import traceback


class ErrorHandler:
    def __init__(self):
        self.handlers = []

    def add_handler(self, handler):
        self.handlers.append(handler)

    def handle_error(self, error):
        for handler in self.handlers:
            handler(error)

    @asynccontextmanager
    async def handle_error_context(self, rethrow=False):
        try:
            yield
        except Exception as e:
            self.handle_error(traceback.format_exc())
            if rethrow:
                raise e


if __name__ == "__main__":
    import asyncio

    async def test():
        eh = ErrorHandler()
        eh.add_handler(print)
        async with eh.handle_error():
            raise RuntimeError("test error")
    asyncio.run(test())
