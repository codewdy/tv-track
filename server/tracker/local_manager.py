from utils.path import atomic_file_write
from .path_manager import PathManager
import os
from schema.config import Config
from schema.db import TV, LocalStore, Source, WatchTag, WatchStatus
from utils.context import Context
from .db_manager import DBManager
from downloader.download_manager import DownloadManager
from datetime import datetime
import shutil


def _get_ext(url: str):
    return os.path.splitext(url)[1]


def _get_name(name, other):
    if name not in other:
        return name
    idx = 1
    base, ext = os.path.splitext(name)
    while True:
        new_name = f"{base} ({idx}){ext}"
        if new_name not in other:
            return new_name
        idx += 1


class LocalManager:
    def __init__(self, config: Config, db: DBManager, downloader: DownloadManager):
        self.config = config
        self.db = db
        self.path = PathManager(config)
        self.downloader = downloader

    async def add_tv(self, name: str, source: Source, tag: WatchTag):
        db = self.db.db()
        for tv_id, tv_name in db.tv.items():
            if tv_name == name:
                raise ValueError(f"tv {name} already exists")
        tv = TV(id=db.next_id, name=name, source=source, tag=tag)
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
        self.db.db_dirty()

    async def update_source(self, tv_id: int, source: Source, update_downloaded: bool = False):
        tv = self.db.tv(tv_id)
        tv.source = source
        tv.touch_time = datetime.now()
        if update_downloaded:
            tv.local = LocalStore()
            shutil.rmtree(self.path.tv_dir(tv, by="id"))
            os.makedirs(self.path.tv_dir(tv, by="id"), exist_ok=True)
        else:
            for i, e in enumerate(tv.local.episodes):
                if e.download != LocalStore.DownloadStatus.RUNNING:
                    e.download = LocalStore.DownloadStatus.RUNNING
                    self.submit_download(tv.id, i)
        await self.update(tv.id)
        self.db.tv_dirty(tv)

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
        if len(tv.local.episodes) < len(tv.source.episodes):
            for episode_id in range(len(tv.local.episodes), len(tv.source.episodes)):
                name = tv.source.episodes[episode_id].name
                tv.local.episodes.append(LocalStore.Episode(
                    name=name,
                    filename=_get_name(
                        f"{name}.mp4", [i.filename for i in tv.local.episodes]),
                    download=LocalStore.DownloadStatus.RUNNING,
                ))
                self.db.tv_dirty(tv)
                self.submit_download(tv.id, episode_id)

    async def start(self):
        self.submit_download_tasks()

    def submit_download_tasks(self):
        for tv_id in self.db.db().tv:
            for episode_id, episode in enumerate(self.db.tv(tv_id).local.episodes):
                if episode.download == LocalStore.DownloadStatus.RUNNING:
                    self.submit_download(tv_id, episode_id)

    def on_download_finished(self, tv_id: int, episode_id: int):
        tv = self.db.tv(tv_id)
        episode = tv.local.episodes[episode_id]
        download_name = f"{tv.name} - {tv.source.episodes[episode_id].name}"
        Context.info(f"download finished: {download_name}")
        episode.download = LocalStore.DownloadStatus.SUCCESS
        tv.touch_time = datetime.now()
        self.db.tv_dirty(tv)

    def on_download_error(self, tv_id: int, episode_id: int, error: str):
        tv = self.db.tv(tv_id)
        episode = tv.local.episodes[episode_id]
        download_name = f"{tv.name} - {tv.source.episodes[episode_id].name}"
        Context.error(f"download error: {download_name} :\n{error}")
        episode.download = LocalStore.DownloadStatus.FAILED
        episode.download_error = error
        self.db.tv_dirty(tv)

    def submit_download(self, tv_id, episode_id):
        tv = self.db.tv(tv_id)
        episode = tv.source.episodes[episode_id]
        download_name = f"{tv.name} - {tv.source.episodes[episode_id].name}"
        Context.info(f"downloading {download_name}")
        self.downloader.submit(
            sourceKey=episode.source_key or tv.source.source_key,
            url=episode.url,
            dst=self.path.episode(tv, episode_id),
            meta=download_name,
            on_finished=lambda: self.on_download_finished(tv_id, episode_id),
            on_error=lambda e: self.on_download_error(tv_id, episode_id, e),
        )
