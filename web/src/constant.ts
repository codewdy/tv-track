import { db } from "./schema";

export const WatchTagName: { [id: string]: string; } = {
    [db.WatchTag.Watching]: "在看",
    [db.WatchTag.Wanted]: "想看",
    [db.WatchTag.Watched]: "看完",
    [db.WatchTag.Dropped]: "搁置",
}

export const WatchTagKeys = [
    db.WatchTag.Watching,
    db.WatchTag.Wanted,
    db.WatchTag.Watched,
    db.WatchTag.Dropped,
]