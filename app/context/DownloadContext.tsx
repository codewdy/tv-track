import React, { createContext, useContext, useEffect, useState } from 'react';
import { downloadManager, DownloadItem } from '../utils/downloadManager';

interface DownloadContextType {
    downloads: DownloadItem[];
    startDownload: (url: string, filename: string, tvId: number, episodeId: number) => void;
    pauseDownload: (id: string) => void;
    resumeDownload: (id: string) => void;
    deleteDownload: (id: string) => Promise<void>;
    getDownload: (tvId: number, episodeId: number) => DownloadItem | undefined;
}

const DownloadContext = createContext<DownloadContextType | undefined>(undefined);

export const DownloadProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [downloads, setDownloads] = useState<DownloadItem[]>([]);

    useEffect(() => {
        const unsubscribe = downloadManager.subscribe((list) => {
            setDownloads([...list]); // Create new array to trigger re-render
        });
        return unsubscribe;
    }, []);

    const startDownload = (url: string, filename: string, tvId: number, episodeId: number) => {
        downloadManager.startDownload(url, filename, tvId, episodeId);
    };

    const pauseDownload = (id: string) => {
        downloadManager.pauseDownload(id);
    };

    const resumeDownload = (id: string) => {
        downloadManager.resumeDownload(id);
    };

    const deleteDownload = async (id: string) => {
        await downloadManager.deleteDownload(id);
    };

    const getDownload = (tvId: number, episodeId: number) => {
        return downloadManager.getDownload(tvId, episodeId);
    };

    return (
        <DownloadContext.Provider value={{ downloads, startDownload, pauseDownload, resumeDownload, deleteDownload, getDownload }}>
            {children}
        </DownloadContext.Provider>
    );
};

export const useDownload = () => {
    const context = useContext(DownloadContext);
    if (!context) {
        throw new Error('useDownload must be used within a DownloadProvider');
    }
    return context;
};
