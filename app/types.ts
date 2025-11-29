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

export interface Episode {
    name: string;
    url: string;
    audio_url?: string;
}

export interface TVDetail {
    name: string;
    tag: string;
    watch: WatchStatus;
    episodes: Episode[];
}

export interface SetWatchRequest {
    id: number;
    watch: WatchStatus;
}

export interface SetTagRequest {
    id: number;
    tag: string;
}

export interface SourceEpisode {
    source_key: string;
    name: string;
    url: string;
}

export interface Source {
    source_key: string;
    name: string;
    title: string;
    channel_name: string;
    url: string;
    cover_url: string;
    tracking: boolean;
    episodes: SourceEpisode[];
    latest_update: string | null;
}

export interface SearchTVResponse {
    source: Source[];
}

export interface AddTVRequest {
    name: string;
    source: Source;
    tag: string;
}

export interface AddTVResponse {
    id: number;
}

export interface DownloadTask {
    resource: string;
    status: string;
}

export interface GetDownloadStatusResponse {
    downloading: DownloadTask[];
    pending: DownloadTask[];
}

export interface SystemError {
    id: number;
    timestamp: string;
    title: string;
    error: string;
}

export interface GetErrorsResponse {
    critical_errors: SystemError[];
    errors: SystemError[];
}
