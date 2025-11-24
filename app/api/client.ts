import { MonitorResponse, ConfigResponse, TVDetail, SetWatchRequest } from '../types';
import { API_CONFIG } from '../config';

export const fetchMonitor = async (version: string = ''): Promise<MonitorResponse> => {
    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/api/monitor`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': API_CONFIG.AUTH_HEADER,
            },
            body: JSON.stringify({ version }),
        });

        if (!response.ok) {
            const text = await response.text();
            console.error(`API Error: ${response.status} ${text}`);
            throw new Error(`API request failed with status ${response.status}: ${text}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Fetch monitor failed:', error);
        throw error;
    }
};

export const fetchConfig = async (): Promise<ConfigResponse> => {
    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/api/get_config`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': API_CONFIG.AUTH_HEADER,
            },
            body: JSON.stringify({}),
        });

        if (!response.ok) {
            const text = await response.text();
            console.error(`API Error: ${response.status} ${text}`);
            throw new Error(`API request failed with status ${response.status}: ${text}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Fetch config failed:', error);
        throw error;
    }
};

export const fetchTV = async (id: number): Promise<TVDetail> => {
    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/api/get_tv`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': API_CONFIG.AUTH_HEADER,
            },
            body: JSON.stringify({ id }),
        });

        if (!response.ok) {
            const text = await response.text();
            console.error(`API Error: ${response.status} ${text}`);
            throw new Error(`API request failed with status ${response.status}: ${text}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Fetch TV failed:', error);
        throw error;
    }
};

export const setWatch = async (request: SetWatchRequest): Promise<void> => {
    try {
        console.log('[API] setWatch request:', JSON.stringify(request, null, 2));

        const response = await fetch(`${API_CONFIG.BASE_URL}/api/set_watch`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': API_CONFIG.AUTH_HEADER,
            },
            body: JSON.stringify(request),
        });

        if (!response.ok) {
            const text = await response.text();
            console.error(`[API] setWatch error: ${response.status} ${text}`);
            throw new Error(`API request failed with status ${response.status}: ${text}`);
        }

        console.log('[API] setWatch success');
    } catch (error) {
        console.error('[API] setWatch failed:', error);
        // Don't throw error to avoid disrupting playback
        // Just log it
    }
};
