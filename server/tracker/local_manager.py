from utils.path import atomic_file_write
from .path_manager import PathManager
import os
from schema.config import Config
from schema.db import TV, LocalStore, Source
from utils.context import Context
from .db_manager import DBManager


def _get_ext(url: str):
    return os.path.splitext(url)[1]


class LocalManager:
    def __init__(self, config: Config, db: DBManager):
        self.config = config
        self.db = db
        self.path = PathManager(config)

    async def add_tv(self, name: str, source: Source):
        db = self.db.db()
        for tv_id, tv in db.tv.items():
            if tv.name == name:
                raise ValueError(f"tv {name} already exists")
        tv = TV(id=db.next_id, name=name, source=source, local=LocalStore())
        os.makedirs(self.path.tv_dir(tv), exist_ok=True)
        if os.path.exists(self.path.tv_dir(tv, by="name")):
            os.remove(self.path.tv_dir(tv, by="name"))
        os.symlink(f"../by-id/{tv.id}", self.path.tv_dir(tv, by="name"))
        db.tv[tv.id] = tv.name
        db.next_id += 1
        self.db.db_dirty()
        self.db.tv_new(tv)
        await self.update(tv.id)
        return tv.id

    async def remove_tv(self, tv_id: int):
        db = self.db.db()
        tv = self.db.tv(tv_id)
        if os.path.exists(self.path.tv_dir(tv, by="name")):
            os.remove(self.path.tv_dir(tv, by="name"))
        del db.tv[tv.id]
        db.removed[tv.id] = tv.name
        self.db.tv_del(tv)
        self.db.db_dirty()

    async def update(self, tv_id: int):
        tv = self.db.tv(tv_id)
        if tv.local.cover is None:
            async with Context.client.get(tv.source.cover_url) as resp:
                resp.raise_for_status()
                cover = await resp.read()
                cover_fn = "cover" + _get_ext(tv.source.cover_url)
                atomic_file_write(self.path.tv_file(tv, cover_fn), cover)
                tv.local.cover = cover_fn
                self.db.tv_dirty(tv)
