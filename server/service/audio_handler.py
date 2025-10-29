import os
from aiohttp import web


class AudioHandler:
    def __init__(self, path, tracker):
        self.path = path
        self.tracker = tracker

    async def __call__(self, request):
        path = os.path.join(self.path, request.match_info['path'])
        if path.endswith(".m4a"):
            path = path[:-4] + ".mp4"
        else:
            return web.Response(status=404)
        if os.path.exists(path):
            return web.FileResponse(await self.tracker.get_audio(path))
        else:
            return web.Response(status=404)


def audio_routes(web_path, path, tracker):
    if not web_path.endswith('/'):
        web_path += '/'
    return [
        web.get(web_path + '{path:.*}', AudioHandler(path, tracker)),
    ]
