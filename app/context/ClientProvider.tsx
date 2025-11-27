import React, { createContext, useContext, ReactNode } from 'react';
import { fetchTV as apiFetchTV, setWatch as apiSetWatch, fetchMonitor as apiFetchMonitor, fetchConfig as apiFetchConfig } from '../api/client';
import { TVDetail, SetWatchRequest, MonitorResponse, ConfigResponse } from '../types';
import { useDownload } from './DownloadContext';

interface ClientContextType {
    fetchTV: (id: number) => Promise<TVDetail>;
    setWatch: (request: SetWatchRequest) => Promise<void>;
    fetchMonitor: (version?: string) => Promise<MonitorResponse>;
    fetchConfig: () => Promise<ConfigResponse>;
}

const ClientContext = createContext<ClientContextType | undefined>(undefined);

export function ClientProvider({ children }: { children: ReactNode }) {
    const { downloads } = useDownload();

    const fetchTV = async (id: number): Promise<TVDetail> => {
        const detail = await apiFetchTV(id);

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
        return apiSetWatch(request);
    };

    const fetchMonitor = async (version?: string): Promise<MonitorResponse> => {
        return apiFetchMonitor(version);
    };

    const fetchConfig = async (): Promise<ConfigResponse> => {
        return apiFetchConfig();
    };

    return (
        <ClientContext.Provider value={{ fetchTV, setWatch, fetchMonitor, fetchConfig }}>
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
