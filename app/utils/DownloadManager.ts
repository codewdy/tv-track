import * as FileSystem from 'expo-file-system/legacy';
import { API_CONFIG } from '../config';

export type DownloadStatus = 'downloading' | 'paused' | 'finished' | 'error';

export interface DownloadItem {
    id: string;
    url: string;
    filename: string;
    tvId: number;
    episodeId: number;
    progress: number;
    status: DownloadStatus;
    localUri?: string;
    resumable?: FileSystem.DownloadResumable;
}

const METADATA_FILE = (FileSystem.documentDirectory || '') + 'downloads_metadata.json';

class DownloadManager {
    private downloads: Map<string, DownloadItem> = new Map();
    private listeners: ((downloads: DownloadItem[]) => void)[] = [];

    constructor() {
        this.loadMetadata();
    }

    private async loadMetadata() {
        try {
            const fileInfo = await FileSystem.getInfoAsync(METADATA_FILE);
            if (fileInfo.exists) {
                const content = await FileSystem.readAsStringAsync(METADATA_FILE);
                const savedDownloads: DownloadItem[] = JSON.parse(content);

                // Rehydrate downloads
                savedDownloads.forEach(item => {
                    if (item.status === 'downloading') {
                        item.status = 'paused';
                    }
                    this.downloads.set(item.id, item);
                });
                this.notifyListeners();
            }
        } catch (e) {
            console.error("Failed to load download metadata", e);
        }
    }

    private async saveMetadata() {
        try {
            const downloadsArray = Array.from(this.downloads.values()).map(item => {
                const { resumable, ...rest } = item;
                return rest;
            });
            await FileSystem.writeAsStringAsync(METADATA_FILE, JSON.stringify(downloadsArray));
        } catch (e) {
            console.error("Failed to save download metadata", e);
        }
    }

    subscribe(listener: (downloads: DownloadItem[]) => void) {
        this.listeners.push(listener);
        listener(this.getDownloads());
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private notifyListeners() {
        const list = this.getDownloads();
        this.listeners.forEach(l => l(list));
        this.saveMetadata();
    }

    getDownloads(): DownloadItem[] {
        return Array.from(this.downloads.values());
    }

    getDownload(tvId: number, episodeId: number): DownloadItem | undefined {
        const id = `tv${tvId}-ep${episodeId}`;
        return this.downloads.get(id);
    }

    private async getUniqueFilename(filename: string): Promise<string> {
        const dir = FileSystem.documentDirectory || '';
        let finalName = filename;
        let counter = 1;

        while (true) {
            const fileInfo = await FileSystem.getInfoAsync(dir + finalName);
            if (!fileInfo.exists) {
                return finalName;
            }

            const dotIndex = filename.lastIndexOf('.');
            if (dotIndex !== -1) {
                const name = filename.substring(0, dotIndex);
                const ext = filename.substring(dotIndex);
                finalName = `${name} (${counter})${ext}`;
            } else {
                finalName = `${filename} (${counter})`;
            }
            counter++;
        }
    }

    async startDownload(url: string, filename: string, tvId: number, episodeId: number) {
        // Use simple ID format: tv{tvId}-ep{episodeId}
        const id = `tv${tvId}-ep${episodeId}`;

        // Check if already downloading or downloaded
        if (this.downloads.has(id)) {
            console.warn(`Download already exists for ${id}`);
            return;
        }

        const uniqueFilename = await this.getUniqueFilename(filename);
        const fileUri = (FileSystem.documentDirectory || '') + uniqueFilename;

        // Handle relative URLs
        const fullUrl = url.startsWith('http') ? url : `${API_CONFIG.BASE_URL}${url}`;

        const callback = (downloadProgress: FileSystem.DownloadProgressData) => {
            const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
            const item = this.downloads.get(id);
            if (item) {
                item.progress = progress;
                this.notifyListeners();
            }
        };

        const downloadResumable = FileSystem.createDownloadResumable(
            fullUrl,
            fileUri,
            {
                headers: {
                    'Authorization': API_CONFIG.AUTH_HEADER
                }
            },
            callback
        );

        const newItem: DownloadItem = {
            id,
            url: fullUrl,
            filename: uniqueFilename,
            tvId,
            episodeId,
            progress: 0,
            status: 'downloading',
            resumable: downloadResumable
        };

        this.downloads.set(id, newItem);
        this.notifyListeners();

        try {
            const result = await downloadResumable.downloadAsync();
            if (result) {
                const item = this.downloads.get(id);
                if (item) {
                    item.status = 'finished';
                    item.localUri = result.uri;
                    item.resumable = undefined;
                    this.notifyListeners();
                }
            }
        } catch (e) {
            console.error(e);
            const item = this.downloads.get(id);
            if (item) {
                item.status = 'error';
                this.notifyListeners();
            }
        }
    }

    async pauseDownload(id: string) {
        const item = this.downloads.get(id);
        if (item && item.status === 'downloading' && item.resumable) {
            try {
                await item.resumable.pauseAsync();
                item.status = 'paused';
                this.notifyListeners();
            } catch (e) {
                console.error("Error pausing", e);
            }
        }
    }

    async resumeDownload(id: string) {
        const item = this.downloads.get(id);
        if (item && item.status === 'paused' && item.resumable) {
            try {
                item.status = 'downloading';
                this.notifyListeners();
                const result = await item.resumable.resumeAsync();
                if (result) {
                    item.status = 'finished';
                    item.localUri = result.uri;
                    item.resumable = undefined;
                    this.notifyListeners();
                }
            } catch (e) {
                console.error("Error resuming, will delete and restart", e);
                // Delete partial download file if it exists
                const fileUri = (FileSystem.documentDirectory || '') + item.filename;
                try {
                    await FileSystem.deleteAsync(fileUri, { idempotent: true });
                } catch (deleteError) {
                    console.error("Error deleting partial file", deleteError);
                }
                // Remove from downloads and restart
                this.downloads.delete(id);
                this.startDownload(item.url, item.filename, item.tvId, item.episodeId);
            }
        } else if (item && item.status === 'paused' && !item.resumable) {
            // If resumable object is missing (e.g. after restart), delete partial file and restart
            console.log("Resumable object missing, deleting partial file and restarting");
            const fileUri = (FileSystem.documentDirectory || '') + item.filename;
            try {
                await FileSystem.deleteAsync(fileUri, { idempotent: true });
            } catch (deleteError) {
                console.error("Error deleting partial file", deleteError);
            }
            this.downloads.delete(id);
            this.startDownload(item.url, item.filename, item.tvId, item.episodeId);
        }
    }

    async deleteDownload(id: string) {
        const item = this.downloads.get(id);
        if (item) {
            if (item.status === 'downloading' && item.resumable) {
                try {
                    await item.resumable.cancelAsync();
                } catch (e) {
                    console.error("Error canceling download", e);
                }
            }
            if (item.localUri) {
                try {
                    await FileSystem.deleteAsync(item.localUri, { idempotent: true });
                } catch (e) {
                    console.error("Error deleting file", e);
                }
            }
            this.downloads.delete(id);
            this.notifyListeners();
        }
    }
}

export const downloadManager = new DownloadManager();
