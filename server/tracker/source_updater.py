from schema.config import Config
from .db_manager import DBManager
from .local_manager import LocalManager
from utils.timer import Timer
import asyncio
from searcher.searchers import Searchers
from utils.context import Context
from datetime import datetime


class SourceUpdater:
    def __init__(self, config: Config, db: DBManager, local: LocalManager):
        self.config = config
        self.db = db
        self.local = local
        self.timer = Timer(
            self.update, self.config.source_updater.update_interval.total_seconds())
        self.searchers = Searchers()

    async def start(self):
        await self.timer.start()

    async def stop(self):
        await self.timer.stop()

    async def update(self):
        tv_list = self.db.db().tv.keys()
        tv_list = [
            tv_id for tv_id in tv_list if self.db.tv(tv_id).source.tracking]
        await asyncio.gather(*[self.update_tv(tv_id) for tv_id in tv_list])

    async def update_tv(self, tv_id):
        with Context.handle_error_context(f"update tv {tv_id} error"):
            source = self.db.tv(tv_id).source
            new_source = await self.searchers.update(source)
            tv = self.db.tv(tv_id)
            if len(new_source.episodes) > len(source.episodes):
                tv.source = new_source
                tv.source.latest_update = datetime.now()
                self.db.tv_dirty(tv)
                await self.local.update(tv_id)
            else:
                if source.latest_update is None:
                    tv.source.latest_update = datetime.now()
                    self.db.tv_dirty(tv)
                elif datetime.now() - source.latest_update > self.config.source_updater.notrack_timeout:
                    Context.info(f"stop tracking {tv.name}, timeout")
                    tv.source.tracking = False
                    self.db.tv_dirty(tv)
