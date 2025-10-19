export namespace db {
    export interface Episode {
        source_key: string
        name: string
        url: string
    }

    export interface Source {
        source_key: string
        name: string
        title: string
        channel_name: string
        url: string
        cover_url: string
        tracking: boolean
        episodes: Episode[]
    }

    export interface WatchStatus {
        watched_episode: number
        watched_episode_time: number
        watched_episode_time_ratio: number
    }
}

export namespace monitor {
    export interface TV {
        id: number
        name: string
        tag: string
        watch: db.WatchStatus
        total_episodes: number
        icon_url: string
    }
    export interface Request {
        version: string
    }

    export interface Response {
        is_new: boolean
        version: string
        tvs: TV[]
        critical_errors: number
        errors: number
    }
}

export namespace get_tv {
    export interface Episode {
        name: string
        url: string
        download_status: "running" | "success" | "failed"
    }
    export interface Response {
        name: string
        tag: string
        watch: db.WatchStatus
        episodes: Episode[]
    }
}

export namespace search_tv {
    export interface Request {
        keyword: string
    }

    export interface Response {
        source: db.Source[]
    }
}

export namespace get_download_status {
    export interface DownloadTask {
        resource: string
        status: string
    }

    export interface Response {
        downloading: DownloadTask[]
        pending: DownloadTask[]
    }
}

export namespace get_errors {
    export interface Error {
        id: number
        timestamp: string
        title: string
        error: string
    }
    export interface Response {
        critical_errors: Error[]
        errors: Error[]
    }
}

export namespace get_config {
    export interface TagConfig {
        tag: string
        name: string
    }
    export interface Response {
        watched_ratio: number
        tags: TagConfig[]
    }
}