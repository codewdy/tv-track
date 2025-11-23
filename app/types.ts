export interface WatchStatus {
    watched_episode: number;
    watched_episode_time: number;
    watched_episode_time_ratio: number;
}

export interface TV {
    id: number;
    name: string;
    tag: string;
    watch: WatchStatus;
    total_episodes: number;
    icon_url: string;
}

export interface MonitorResponse {
    is_new: boolean;
    version: string;
    tvs: TV[];
    critical_errors: number;
    errors: number;
}

export interface TagConfig {
    tag: string;
    name: string;
}

export interface ConfigResponse {
    watched_ratio: number;
    tags: TagConfig[];
    system_monitor: { key: string; name: string }[];
}
