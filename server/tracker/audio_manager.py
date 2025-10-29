from utils.file_cache import FileCache
from utils.run_cmd import run_cmd


class AudioManager:
    def __init__(self):
        self.file_cache = FileCache("m4a")

    async def create_audio_file(self, src, dst):
        await run_cmd("ffmpeg", "-i", src, "-vn", "-c:a", "copy", dst)

    def get(self, src):
        return self.file_cache.get(src, lambda f: self.create_audio_file(src, f))

    def start(self):
        self.file_cache.start()

    def close(self):
        self.file_cache.close()
