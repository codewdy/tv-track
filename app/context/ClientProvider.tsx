import React, { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { clientService } from '../api/ClientService';
import { TVDetail, SetWatchRequest, SetTagRequest, SetDownloadStatusRequest, UpdateSourceRequest, SearchTVResponse, MonitorResponse, ConfigResponse } from '../types';
import { useDownload } from './DownloadContext';
import { useAppError } from './AppErrorContext';

interface ClientContextType {
    fetchTV: (id: number) => Promise<TVDetail>;
    setWatch: (request: SetWatchRequest) => Promise<void>;
    setTag: (request: SetTagRequest) => Promise<void>;
    setDownloadStatus: (request: SetDownloadStatusRequest) => Promise<void>;
    updateSource: (request: UpdateSourceRequest) => Promise<void>;
    searchTV: (keyword: string) => Promise<SearchTVResponse>;
    fetchMonitor: (version?: string) => Promise<MonitorResponse>;
    fetchConfig: () => Promise<ConfigResponse>;
    isOffline: boolean;
    toggleOfflineMode: () => void;
}

const ClientContext = createContext<ClientContextType | undefined>(undefined);

export function ClientProvider({ children }: { children: ReactNode }) {
    const { downloads } = useDownload();
    const { reportError } = useAppError();
    const [isOffline, setIsOffline] = useState(clientService.isOffline);

    useEffect(() => {
        const unsubscribe = clientService.subscribe((offline) => {
            setIsOffline(offline);
        });
        return unsubscribe;
    }, []);

    const toggleOfflineMode = async () => {
        try {
            await clientService.toggleOfflineMode();
        } catch (e: any) {
            reportError(e.message || '切换模式失败');
        }
    };

    const fetchTV = async (id: number): Promise<TVDetail> => {
        const detail = await clientService.fetchTV(id);

        // Check for downloaded episodes and replace URLs
        if (detail.episodes) {
            detail.episodes = detail.episodes.map((episode, index) => {
                const download = downloads.find(d => d.tvId === id && d.episodeId === index);
                if (download && download.localUri) {
                    return {
                        ...episode,
                        url: download.localUri
                    };
                }
                return episode;
            });
        }

        return detail;
    };

    const setWatch = async (request: SetWatchRequest): Promise<void> => {
        return clientService.setWatch(request);
    };

    const setTag = async (request: SetTagRequest): Promise<void> => {
        return clientService.setTag(request);
    };

    const setDownloadStatus = async (request: SetDownloadStatusRequest): Promise<void> => {
        return clientService.setDownloadStatus(request);
    };

    const updateSource = async (request: UpdateSourceRequest): Promise<void> => {
        return clientService.updateSource(request);
    };

    const searchTV = async (keyword: string): Promise<SearchTVResponse> => {
        return clientService.searchTV(keyword);
    };

    const fetchMonitor = async (version?: string): Promise<MonitorResponse> => {
        return clientService.fetchMonitor(version);
    };

    const fetchConfig = async (): Promise<ConfigResponse> => {
        return clientService.fetchConfig();
    };

    return (
        <ClientContext.Provider value={{ fetchTV, setWatch, setTag, setDownloadStatus, updateSource, searchTV, fetchMonitor, fetchConfig, isOffline, toggleOfflineMode }}>
            {children}
        </ClientContext.Provider>
    );
}

export function useClient() {
    const context = useContext(ClientContext);
    if (context === undefined) {
        throw new Error('useClient must be used within a ClientProvider');
    }
    return context;
}
