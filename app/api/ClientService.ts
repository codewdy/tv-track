import { MonitorResponse, ConfigResponse, TVDetail, SetWatchRequest, TV } from '../types';
import * as FileSystem from 'expo-file-system/legacy';
import * as apiClient from './client';
import { downloadManager } from '../utils/downloadManager';

const OFFLINE_DATA_FILE = (FileSystem.documentDirectory || '') + 'offline_data.json';
const LEGACY_SETTINGS_FILE = (FileSystem.documentDirectory || '') + 'offline_settings.json';

interface OfflineData {
    isOffline: boolean;
    monitor: MonitorResponse | null;
    config: ConfigResponse | null;
    tvDetails: [number, TVDetail][]; // Serialize Map as array of entries
    pendingSyncTvIds: number[];
}

class ClientService {
    private _isOffline: boolean = false;
    private listeners: ((isOffline: boolean) => void)[] = [];
    private offlineMonitorData: MonitorResponse | null = null;
    private offlineConfigData: ConfigResponse | null = null;
    private offlineTVDetails: Map<number, TVDetail> = new Map();
    private pendingSyncTvIds: Set<number> = new Set();

    constructor() {
        this.loadOfflineData();
    }

    private async loadOfflineData() {
        try {
            // Cleanup legacy settings file if it exists
            const legacyInfo = await FileSystem.getInfoAsync(LEGACY_SETTINGS_FILE);
            if (legacyInfo.exists) {
                await FileSystem.deleteAsync(LEGACY_SETTINGS_FILE, { idempotent: true });
            }

            const info = await FileSystem.getInfoAsync(OFFLINE_DATA_FILE);
            if (info.exists) {
                const content = await FileSystem.readAsStringAsync(OFFLINE_DATA_FILE);
                const data: OfflineData = JSON.parse(content);

                this._isOffline = !!data.isOffline;
                if (this._isOffline) {
                    this.offlineMonitorData = data.monitor;
                    this.offlineConfigData = data.config;
                    this.offlineTVDetails = new Map(data.tvDetails);
                    this.pendingSyncTvIds = new Set(data.pendingSyncTvIds || []);
                }
                this.notifyListeners();
            }
        } catch (e) {
            console.error('Failed to load offline data', e);
        }
    }

    private async saveOfflineData() {
        try {
            const data: OfflineData = {
                isOffline: this._isOffline,
                monitor: this.offlineMonitorData,
                config: this.offlineConfigData,
                tvDetails: Array.from(this.offlineTVDetails.entries()),
                pendingSyncTvIds: Array.from(this.pendingSyncTvIds)
            };
            await FileSystem.writeAsStringAsync(OFFLINE_DATA_FILE, JSON.stringify(data));
        } catch (e) {
            console.error('Failed to save offline data', e);
        }
    }

    subscribe(listener: (isOffline: boolean) => void) {
        this.listeners.push(listener);
        listener(this._isOffline);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private notifyListeners() {
        this.listeners.forEach(l => l(this._isOffline));
    }

    get isOffline() {
        return this._isOffline;
    }

    async toggleOfflineMode() {
        if (!this._isOffline) {
            // Going offline: Prepare data
            try {
                // 1. Fetch Monitor
                const monitorData = await apiClient.fetchMonitor('');
                const downloads = downloadManager.getDownloads();
                const downloadedTvIds = new Set(downloads.map(d => d.tvId));

                const offlineTvs = monitorData.tvs.filter(tv => downloadedTvIds.has(tv.id));

                this.offlineMonitorData = {
                    ...monitorData,
                    tvs: offlineTvs,
                    version: 'offline'
                };

                // 2. Fetch Config
                this.offlineConfigData = await apiClient.fetchConfig();

                // 3. Fetch TV Details for all downloaded TVs
                this.offlineTVDetails.clear();
                await Promise.all(offlineTvs.map(async (tv) => {
                    try {
                        const detail = await apiClient.fetchTV(tv.id);
                        this.offlineTVDetails.set(tv.id, detail);
                    } catch (e) {
                        console.error(`Failed to fetch details for TV ${tv.id}`, e);
                    }
                }));

                this._isOffline = true;
            } catch (e) {
                console.error('Failed to prepare offline data', e);
                // Optionally handle error, maybe don't switch to offline if fetch fails?
                // For now, we proceed but with empty data if fetch failed
                this._isOffline = true;
            }
        } else {
            // Going online
            // Sync pending changes
            if (this.pendingSyncTvIds.size > 0) {
                console.log(`Syncing ${this.pendingSyncTvIds.size} pending TV updates...`);
                const tvIdsToSync = Array.from(this.pendingSyncTvIds);

                // We process them sequentially or parallel, here parallel is fine
                await Promise.all(tvIdsToSync.map(async (tvId) => {
                    const detail = this.offlineTVDetails.get(tvId);
                    if (detail) {
                        try {
                            await apiClient.setWatch({
                                id: tvId,
                                watch: detail.watch
                            });
                            this.pendingSyncTvIds.delete(tvId);
                        } catch (e) {
                            console.error(`Failed to sync TV ${tvId}`, e);
                        }
                    } else {
                        // Should not happen, but if detail is missing, remove from pending
                        this.pendingSyncTvIds.delete(tvId);
                    }
                }));
            }

            this._isOffline = false;
            this.offlineMonitorData = null;
            this.offlineConfigData = null;
            this.offlineTVDetails.clear();
            this.pendingSyncTvIds.clear();
        }

        this.saveOfflineData();
        this.notifyListeners();
    }

    // API Methods
    async fetchMonitor(version: string = ''): Promise<MonitorResponse> {
        if (this._isOffline) {
            if (this.offlineMonitorData) {
                return this.offlineMonitorData;
            }
            return {
                is_new: false,
                version: 'offline',
                tvs: [],
                critical_errors: 0,
                errors: 0
            };
        }
        return apiClient.fetchMonitor(version);
    }

    async fetchConfig(): Promise<ConfigResponse> {
        if (this._isOffline) {
            if (this.offlineConfigData) {
                return this.offlineConfigData;
            }
            return {
                watched_ratio: 0.9,
                tags: [
                    { tag: 'watching', name: 'Watching' },
                    { tag: 'finished', name: 'Finished' }
                ],
                system_monitor: []
            };
        }
        return apiClient.fetchConfig();
    }

    async fetchTV(id: number): Promise<TVDetail> {
        if (this._isOffline) {
            const detail = this.offlineTVDetails.get(id);
            if (detail) {
                return detail;
            }
            return {
                name: 'Offline TV Show',
                tag: 'watching',
                watch: {
                    watched_episode: 0,
                    watched_episode_time: 0,
                    watched_episode_time_ratio: 0
                },
                episodes: []
            };
        }
        return apiClient.fetchTV(id);
    }

    async setWatch(request: SetWatchRequest): Promise<void> {
        if (this._isOffline) {
            const detail = this.offlineTVDetails.get(request.id);
            if (detail) {
                // Update local offline state
                detail.watch = request.watch;
                this.offlineTVDetails.set(request.id, detail);

                // Mark for sync
                this.pendingSyncTvIds.add(request.id);

                // Persist changes
                this.saveOfflineData();
            }
            return;
        }
        return apiClient.setWatch(request);
    }
}

export const clientService = new ClientService();
