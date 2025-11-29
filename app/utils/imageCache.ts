import * as FileSystem from 'expo-file-system/legacy';
import * as Crypto from 'expo-crypto';

const CACHE_FOLDER = FileSystem.cacheDirectory + 'images/';

export const ensureCacheDirectory = async () => {
    const info = await FileSystem.getInfoAsync(CACHE_FOLDER);
    if (!info.exists) {
        await FileSystem.makeDirectoryAsync(CACHE_FOLDER, { intermediates: true });
    }
};

export const getCacheFilename = async (uri: string) => {
    const hash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        uri
    );
    return `${CACHE_FOLDER}${hash}.jpg`;
};

export const getCachedImage = async (uri: string): Promise<string | null> => {
    try {
        await ensureCacheDirectory();
        const filename = await getCacheFilename(uri);
        const info = await FileSystem.getInfoAsync(filename);
        if (info.exists) {
            return filename;
        }
    } catch (e) {
        console.error('Error checking cache:', e);
    }
    return null;
};

export const downloadAndCacheImage = async (uri: string, headers?: Record<string, string>): Promise<string | null> => {
    try {
        await ensureCacheDirectory();
        const filename = await getCacheFilename(uri);

        const result = await FileSystem.downloadAsync(
            uri,
            filename,
            { headers }
        );

        if (result.status === 200) {
            return result.uri;
        }
    } catch (e) {
        console.error('Error downloading image:', e);
    }
    return null;
};
