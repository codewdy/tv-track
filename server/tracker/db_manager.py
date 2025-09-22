from dataclasses import dataclass
from pydantic import BaseModel
from utils.timer import Timer
from schema.db import DB, TV, ErrorDB
from utils.path import atomic_file_write
from .path_manager import PathManager
import os


@dataclass
class RowHolder:
    row: BaseModel
    path: str


class DBManagerImpl:
    def __init__(self, save_interval):
        self.rows = {}
        self.dirty = set()
        self.save_timer = Timer(self.async_save, save_interval)

    async def start(self):
        self.save()
        await self.save_timer.start()

    async def stop(self):
        await self.save_timer.stop()
        self.save()

    async def async_save(self):
        self.save()

    def load_row(self, key, path, dtype):
        row = dtype.parse_file(path)
        self.rows[key] = RowHolder(row=row, path=path)

    def new_row(self, key, path, row):
        self.rows[key] = RowHolder(row=row, path=path)
        self.mark_dirty(key)

    def get_row(self, key):
        return self.rows[key].row

    def del_row(self, key):
        del self.rows[key]
        if key in self.dirty:
            self.dirty.remove(key)

    def mark_dirty(self, key):
        self.dirty.add(key)

    def save(self):
        for key in self.dirty:
            row_dump = self.rows[key].row.model_dump_json(indent=2)
            atomic_file_write(self.rows[key].path, row_dump)
        self.dirty.clear()


class DBManager:
    def __init__(self, config):
        self.impl = DBManagerImpl(config.tracker.save_interval.total_seconds())
        self.path = PathManager(config)
        self.resource_dir = config.tracker.resource_dir

    def load(self):
        if os.path.exists(self.path.db_json()):
            self.impl.load_row("db", self.path.db_json(), DB)
        else:
            self.impl.new_row("db", self.path.db_json(), DB())
        if os.path.exists(self.path.error_json()):
            self.impl.load_row("error", self.path.error_json(), ErrorDB)
        else:
            self.impl.new_row("error", self.path.error_json(), ErrorDB())
        for tv_id, tv_name in self.db().tv.items():
            self.impl.load_row(tv_id, self.path.tv_json(tv_id), TV)

    async def start(self):
        self.load()
        await self.impl.start()

    async def stop(self):
        await self.impl.stop()

    def tv(self, tv_id):
        return self.impl.get_row(tv_id)

    def tv_dirty(self, tv):
        self.impl.mark_dirty(tv.id)

    def tv_new(self, tv):
        self.impl.new_row(tv.id, self.path.tv_json(tv.id), tv)

    def tv_del(self, tv):
        self.impl.del_row(tv.id)

    def tv_del(self, tv):
        self.impl.del_row(tv.id)

    def db(self):
        return self.impl.get_row("db")

    def db_dirty(self):
        self.impl.mark_dirty("db")

    def error(self):
        return self.impl.get_row("error")

    def error_dirty(self):
        self.impl.mark_dirty("error")

    def save(self):
        self.impl.save()
