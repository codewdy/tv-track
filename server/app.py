import socket
import signal
from aiohttp import web
import asyncio


def mk_socket(host, port):
    sock = socket.socket(socket.AF_INET6, socket.SOCK_STREAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    sock.bind((host, port))
    return sock


def run_app(app, port, async_start, stop):
    sock = mk_socket("::", port)

    async def run_app_inner():
        try:
            await async_start()
            runner = web.AppRunner(app)
            await runner.setup()
            srv = web.SockSite(runner, sock)
            await srv.start()
            print(f"Serving HTTP on [::] port {port}")
        except Exception as e:
            print(f"Failed to start app: {e}")
            stop()
            exit(1)

    loop = asyncio.new_event_loop()
    loop.create_task(run_app_inner())

    def sigterm_handler(_signo, _stack_frame):
        sock.close()
        stop()
        exit(0)

    signal.signal(signal.SIGTERM, sigterm_handler)
    signal.signal(signal.SIGINT, sigterm_handler)

    loop.run_forever()
