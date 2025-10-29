from utils.context import Context
from dataclasses import dataclass


@dataclass
class ManagedFile:
    key: str
    file: str


class FileCache:
    def __init__(self, ext, max_file_count=10):
        self.max_file_count = max_file_count
        self.ext = ext

    def start(self):
        self.tmp = Context.tempdir()
        self.tmp.start()
        self.managed_file = [ManagedFile("", self.tmp.allocate_file(
            f"{i}.{self.ext}")) for i in range(self.max_file_count)]

    def close(self):
        self.tmp.close()

    async def get(self, key, creator):
        for item in self.managed_file:
            if item.key == key:
                self.managed_file.remove(item)
                self.managed_file.append(item)
                return item.file
        file = self.managed_file[0]
        self.managed_file.remove(file)
        try:
            await creator(file.file)
            file.key = key
            self.managed_file.append(file)
        except:
            file.key = ""
            self.managed_file = [file] + self.managed_file
            raise
        return file.file
