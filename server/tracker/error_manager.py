from schema.db import ErrorDB
from .db_manager import DBManager
from datetime import datetime
from schema.config import Config


class ErrorManager:
    def __init__(self, config: Config, db: DBManager):
        self.config = config
        self.db = db

    def handle_error(self, error: str):
        error_db = self.db.error()
        error_db.errors.append(ErrorDB.Error(
            id=error_db.next_id,
            timestamp=datetime.now(),
            error=error))
        error_db.next_id += 1
        if error_db.next_id > self.config.error.max_error_count:
            error_db.errors.pop(0)
        self.db.error_dirty()
