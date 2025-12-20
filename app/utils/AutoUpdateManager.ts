import * as FileSystem from 'expo-file-system/legacy';
import { Alert } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';
import { API_CONFIG } from '../config';

const LAST_CHECK_FILE = FileSystem.documentDirectory + 'last_check.txt';

export class AutoUpdateManager {
    private static instance: AutoUpdateManager;
    private updateUrl: string;
    private versionUrl: string;
    private downloadProgressCallback?: (progress: number) => void;
    private downloadResumable?: FileSystem.DownloadResumable;

    private constructor() {
        this.versionUrl = `${API_CONFIG.BASE_URL}/resource/app/version.txt`;
        this.updateUrl = `${API_CONFIG.BASE_URL}/resource/app/release.apk`;
    }

    public static getInstance(): AutoUpdateManager {
        if (!AutoUpdateManager.instance) {
            AutoUpdateManager.instance = new AutoUpdateManager();
        }
        return AutoUpdateManager.instance;
    }

    public setDownloadProgressCallback(callback: (progress: number) => void): void {
        this.downloadProgressCallback = callback;
    }

    public async checkForUpdates(): Promise<{ hasUpdate: boolean; latestVersion: string }> {
        try {
            const response = await fetch(this.versionUrl, {
                headers: {
                    'Authorization': API_CONFIG.AUTH_HEADER
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const latestVersion = (await response.text()).trim();
            const currentVersion = API_CONFIG.VERSION;

            console.log(`Current version: ${encodeURIComponent(currentVersion)}`);
            console.log(`Latest version: ${encodeURIComponent(latestVersion)}`);

            const hasUpdate = latestVersion !== currentVersion;
            if (hasUpdate) {
                console.log('New update available!');
            }
            return { hasUpdate, latestVersion };
        } catch (error) {
            console.error('Error checking for updates:', error);
            throw error;
        }
    }

    public async downloadUpdate(): Promise<string> {
        try {
            const fileUri = FileSystem.documentDirectory + 'update.apk';

            // Clean up any existing update file
            const existingFile = await FileSystem.getInfoAsync(fileUri);
            if (existingFile.exists) {
                await FileSystem.deleteAsync(fileUri);
            }

            const callback = (downloadProgress: FileSystem.DownloadProgressData) => {
                const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
                if (this.downloadProgressCallback) {
                    this.downloadProgressCallback(progress);
                }
            };

            this.downloadResumable = FileSystem.createDownloadResumable(
                this.updateUrl,
                fileUri,
                {
                    headers: {
                        'Authorization': API_CONFIG.AUTH_HEADER
                    }
                },
                callback
            );

            const result = await this.downloadResumable.downloadAsync();
            if (!result) {
                throw new Error('Download failed: no result');
            }
            return result.uri;
        } catch (error) {
            console.error('Error downloading update:', error);
            throw error;
        } finally {
            this.downloadResumable = undefined;
        }
    }

    public async cancelDownload(): Promise<void> {
        if (this.downloadResumable) {
            try {
                await this.downloadResumable.cancelAsync();
            } catch (error) {
                console.error('Error canceling download:', error);
            } finally {
                this.downloadResumable = undefined;
            }
        }
    }

    public async installUpdate(apkUri: string): Promise<void> {
        try {
            // For Android
            // Convert file:// URI to content:// URI to avoid FileUriExposedException
            const contentUri = await FileSystem.getContentUriAsync(apkUri);

            await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
                data: contentUri,
                flags: 1, // ActivityFlags.GRANT_READ_URI_PERMISSION
                type: 'application/vnd.android.package-archive'
            });
        } catch (error) {
            console.error('Error installing update:', error);
            Alert.alert('安装失败', '安装更新时出现错误，请手动安装', [
                { text: '确定', onPress: () => console.log('OK Pressed') }
            ]);
            throw error;
        }
    }

    /**
     * Get the last time updates were checked
     */
    private async getLastCheckTime(): Promise<number | null> {
        try {
            const fileInfo = await FileSystem.getInfoAsync(LAST_CHECK_FILE);
            if (fileInfo.exists) {
                const content = await FileSystem.readAsStringAsync(LAST_CHECK_FILE);
                const time = parseInt(content, 10);
                return isNaN(time) ? null : time;
            }
            return null;
        } catch (error) {
            console.error('Error getting last check time:', error);
            return null;
        }
    }

    /**
     * Save the current time as the last check time
     */
    public async saveLastCheckTime(): Promise<void> {
        try {
            const now = Date.now();
            await FileSystem.writeAsStringAsync(LAST_CHECK_FILE, now.toString());
        } catch (error) {
            console.error('Error saving last check time:', error);
        }
    }

    /**
     * Check if we should check for updates (interval of 24 hours)
     */
    public async shouldCheckForUpdates(): Promise<boolean> {
        const lastCheck = await this.getLastCheckTime();
        const now = Date.now();
        const twentyFourHours = 24 * 60 * 60 * 1000;

        // If never checked before or more than 24 hours passed
        return lastCheck === null || (now - lastCheck) > twentyFourHours;
    }

    /**
     * Check for updates with time interval consideration
     */
    public async checkForUpdatesWithInterval(): Promise<{ hasUpdate: boolean; latestVersion: string } | null> {
        const shouldCheck = await this.shouldCheckForUpdates();
        if (!shouldCheck) {
            console.log('Skipping update check - last check was within 24 hours');
            return null;
        }

        try {
            const result = await this.checkForUpdates();
            await this.saveLastCheckTime();
            return result;
        } catch (error) {
            console.error('Error checking for updates with interval:', error);
            return null;
        }
    }
}

export const autoUpdateManager = AutoUpdateManager.getInstance();
