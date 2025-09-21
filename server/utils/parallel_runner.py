import asyncio


class ParallelRunner:
    def __init__(self, max_concurrent):
        self._max_concurrent = max_concurrent
        self._running_task = []
        self._pending_task = []
        self._waiting_exit = False
        self._exit_event = asyncio.Event()

    def submit(self, coro):
        if self._waiting_exit:
            raise RuntimeError("Cannot submit task after join")
        self._pending_task.append(coro)
        self._schedule()

    async def join(self):
        self._waiting_exit = True
        if self._running_task:
            await self._exit_event.wait()

    async def cancel(self):
        for task in self._pending_task:
            task.close()
        self._pending_task.clear()
        for task in self._running_task:
            task.cancel()
        await self.join()

    def _create_task(self, coro):
        task = asyncio.create_task(coro)
        task.add_done_callback(lambda fut: self._on_task_done(task))
        return task

    def _on_task_done(self, task):
        self._running_task.remove(task)
        self._schedule()
        if self._waiting_exit and not self._running_task:
            self._exit_event.set()

    def _schedule(self):
        while len(self._running_task) < self._max_concurrent and self._pending_task:
            coro = self._pending_task[0]
            self._pending_task = self._pending_task[1:]
            self._running_task.append(self._create_task(coro))


if __name__ == "__main__":
    async def test_task(name, k):
        for i in range(k):
            print(f"RUNNING: {name} {i}/{k}")
            await asyncio.sleep(1)

    async def test():
        runner = ParallelRunner(2)
        runner.submit(test_task("a", 2))
        runner.submit(test_task("b", 2))
        runner.submit(test_task("c", 2))
        runner.submit(test_task("d", 2))
        runner.submit(test_task("e", 2))
        runner.submit(test_task("f", 2))
        for i in range(7):
            print(f"WAITING: {i}")
            await asyncio.sleep(1)
        await runner.cancel()
    asyncio.run(test())
