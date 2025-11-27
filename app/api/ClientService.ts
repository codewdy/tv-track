import { MonitorResponse, ConfigResponse, TVDetail, SetWatchRequest } from '../types';
import * as FileSystem from 'expo-file-system/legacy';
import * as apiClient from './client';

const SETTINGS_FILE = (FileSystem.documentDirectory || '') + 'offline_settings.json';

class ClientService {
    private _isOffline: boolean = false;
    private listeners: ((isOffline: boolean) => void)[] = [];

    constructor() {
        this.loadSettings();
    }

    private async loadSettings() {
        try {
            const info = await FileSystem.getInfoAsync(SETTINGS_FILE);
            if (info.exists) {
                const content = await FileSystem.readAsStringAsync(SETTINGS_FILE);
                const settings = JSON.parse(content);
                this._isOffline = !!settings.isOffline;
                this.notifyListeners();
            }
        } catch (e) {
            console.error('Failed to load offline settings', e);
        }
    }

    private async saveSettings() {
        try {
            await FileSystem.writeAsStringAsync(SETTINGS_FILE, JSON.stringify({ isOffline: this._isOffline }));
        } catch (e) {
            console.error('Failed to save offline settings', e);
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

    toggleOfflineMode() {
        this._isOffline = !this._isOffline;
        this.saveSettings();
        this.notifyListeners();
    }

    // API Methods
    async fetchMonitor(version: string = ''): Promise<MonitorResponse> {
        if (this._isOffline) {
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
            console.log('[ClientService] Offline setWatch:', request);
            return;
        }
        return apiClient.setWatch(request);
    }
}

export const clientService = new ClientService();
