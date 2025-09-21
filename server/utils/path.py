import os
from typing import Union


def atomic_file_write(filename: str, content: Union[str, bytes]):
    temp_filename = filename + ".tmp"
    if isinstance(content, str):
        content = content.encode("utf-8")
    with open(temp_filename, "wb") as f:
        f.write(content)
    os.rename(temp_filename, filename)


def ensure_path(path: str):
    os.makedirs(path, exist_ok=True)
