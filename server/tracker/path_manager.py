from schema.config import Config
from schema.db import TV
import os


class PathManager:
    def __init__(self, config: Config):
        self.config = config
        self.local_path = config.tracker.resource_dir

    def required_path(self):
        return [
            self.local_path,
            os.path.join(self.local_path, "by-id"),
            os.path.join(self.local_path, "by-name"),
        ]

    def db_json(self):
        return os.path.join(self.local_path, "db.json")

    def tv_dir_by_id(self, tv_id: int):
        return os.path.join(self.local_path, "by-id", str(tv_id))

    def tv_dir_by_name(self, tv_name: str):
        return os.path.join(self.local_path, "by-name", tv_name)

    def tv_json(self, tv_id: int):
        return os.path.join(self.tv_dir_by_id(tv_id), "tv.json")

    def tv_dir(self, tv: TV, by: str = "id"):
        if by == "id":
            return self.tv_dir_by_id(tv.id)
        elif by == "name":
            return self.tv_dir_by_name(tv.name)
        else:
            raise ValueError(f"unknown tv dir by {by}")

    def tv_file(self, tv: TV, filename: str, by: str = "id"):
        return os.path.join(self.tv_dir(tv, by), filename)

    def tv_cover(self, tv: TV, by: str = "id"):
        return self.tv_file(tv, tv.local.cover, by)

    def episode(self, tv: TV, episode_idx: int, by: str = "id"):
        return self.tv_file(tv, tv.local.episodes[episode_idx].filename, by)
