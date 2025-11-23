import { MonitorResponse } from '../types';
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
