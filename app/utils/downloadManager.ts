import * as FileSystem from 'expo-file-system/legacy';
import { API_CONFIG } from '../config';

export type DownloadStatus = 'downloading' | 'pending' | 'paused' | 'finished' | 'error';

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
const MAX_CONCURRENT_DOWNLOADS = 5;

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
                    // Reset active/pending states to paused on restart
                    if (item.status === 'downloading' || item.status === 'pending') {
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

    private processQueue() {
        const activeDownloads = Array.from(this.downloads.values()).filter(d => d.status === 'downloading');
        if (activeDownloads.length < MAX_CONCURRENT_DOWNLOADS) {
            // Find pending items (FIFO based on insertion order in Map usually, but let's just pick first pending)
            const pendingItem = Array.from(this.downloads.values()).find(d => d.status === 'pending');
            if (pendingItem) {
                this.runDownload(pendingItem);
            }
        }
    }

    private async runDownload(item: DownloadItem) {
        if (item.status === 'downloading') return;

        item.status = 'downloading';
        this.notifyListeners();

        // If no resumable, create it
        if (!item.resumable) {
            const fileUri = (FileSystem.documentDirectory || '') + item.filename;
            const callback = (downloadProgress: FileSystem.DownloadProgressData) => {
                const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
                // Only update progress if still downloading (might have been paused/cancelled)
                if (item.status === 'downloading') {
                    item.progress = progress;
                    this.notifyListeners();
                }
            };

            item.resumable = FileSystem.createDownloadResumable(
                item.url,
                fileUri,
                {
                    headers: {
                        'Authorization': API_CONFIG.AUTH_HEADER
                    }
                },
                callback
            );
        }

        try {
            let result;
            if (item.resumable) {
                result = await item.resumable.downloadAsync();
            }

            if (result) {
                item.status = 'finished';
                item.localUri = result.uri;
                item.resumable = undefined;
                this.notifyListeners();
                this.processQueue(); // Slot freed
            }
        } catch (e) {
            console.error("Download error", e);
            item.status = 'error';
            this.notifyListeners();
            this.processQueue(); // Slot freed (even if error)
        }
    }

    async startDownload(url: string, filename: string, tvId: number, episodeId: number) {
        const id = `tv${tvId}-ep${episodeId}`;

        if (this.downloads.has(id)) {
            console.warn(`Download already exists for ${id}`);
            return;
        }

        const uniqueFilename = await this.getUniqueFilename(filename);
        const fullUrl = url.startsWith('http') ? url : `${API_CONFIG.BASE_URL}${url}`;

        const newItem: DownloadItem = {
            id,
            url: fullUrl,
            filename: uniqueFilename,
            tvId,
            episodeId,
            progress: 0,
            status: 'pending', // Start as pending
            // Resumable will be created when running
        };

        this.downloads.set(id, newItem);
        this.notifyListeners();
        this.processQueue();
    }

    async pauseDownload(id: string) {
        const item = this.downloads.get(id);
        if (item) {
            if (item.status === 'downloading' && item.resumable) {
                try {
                    await item.resumable.pauseAsync();
                    item.status = 'paused';
                    this.notifyListeners();
                    this.processQueue(); // Slot freed
                } catch (e) {
                    console.error("Error pausing", e);
                }
            } else if (item.status === 'pending') {
                item.status = 'paused';
                this.notifyListeners();
                // No slot freed, but removed from queue
            }
        }
    }

    async resumeDownload(id: string) {
        const item = this.downloads.get(id);
        if (item && item.status === 'paused') {
            item.status = 'pending';
            this.notifyListeners();
            this.processQueue();
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
            this.processQueue(); // Slot freed if it was downloading
        }
    }
}

export const downloadManager = new DownloadManager();
