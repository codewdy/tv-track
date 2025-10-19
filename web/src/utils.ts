import type { db } from "@/schema"

export function watched_episode(watch: db.WatchStatus, watched_ratio: number) {
    return watch.watched_episode +
        (watch.watched_episode_time_ratio > watched_ratio ? 1 : 0)
}