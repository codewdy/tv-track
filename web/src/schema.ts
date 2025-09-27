export namespace db {
    export interface Episode {
        name: string
        url: string
    }

    export interface Source {
        source_key: string
        name: string
        channel_name: string
        url: string
        cover_url: string
        tracking: boolean
        episodes: Episode[]
    }

    export enum WatchTag {
        Wanted = "wanted",
        Watching = "watching",
        Watched = "watched",
        Dropped = "dropped",
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