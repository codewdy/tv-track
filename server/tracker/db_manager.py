from dataclasses import dataclass
from pydantic import BaseModel


@dataclass
class DBHolder:
    db: BaseModel
    path: str


class DBManagerImpl:
    def __init__(self, save_interval):
        self.dbs = {}
        self.dirty = set()
        self.save_timer = Timer(self.save, save_interval)

    async def start(self):
        await self.save_timer.start()

    async def stop(self):
        await self.save_timer.stop()

    def load_db(self, key, path, dtype):
        db = dtype.parse_file(path)
        self.dbs[key] = DBHolder(db=db, path=path)

    def new_db(self, key, path, db):
        self.dbs[key] = DBHolder(db=db, path=path)
        self.mark_dirty(key)

    def db(self, key):
        return self.dbs[key].db

    def mark_dirty(self, key):
        self.dirty.add(key)

    async def save(self):
        for key in self.dirty:
            db_dump = self.dbs[key].db.model_dump_json(indent=2)
            atomic_file_write(self.dbs[key].path, db_dump)
        self.dirty.clear()
