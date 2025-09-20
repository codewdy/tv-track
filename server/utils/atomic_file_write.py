import os


def atomic_file_write(filename: str, content: str):
    temp_filename = filename + ".tmp"
    with open(temp_filename, "w") as f:
        f.write(content)
    os.rename(temp_filename, filename)
