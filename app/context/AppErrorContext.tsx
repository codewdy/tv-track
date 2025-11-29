import React, { createContext, useState, useContext, ReactNode } from 'react';

interface AppErrorContextType {
    error: string | null;
    reportError: (error: string) => void;
    clearError: () => void;
}

const AppErrorContext = createContext<AppErrorContextType | undefined>(undefined);

export function AppErrorProvider({ children }: { children: ReactNode }) {
    const [error, setError] = useState<string | null>(null);

    const reportError = (errorMessage: string) => {
        setError(errorMessage);
    };

    const clearError = () => {
        setError(null);
    };

    return (
        <AppErrorContext.Provider value={{ error, reportError, clearError }}>
            {children}
        </AppErrorContext.Provider>
    );
}

export function useAppError() {
    const context = useContext(AppErrorContext);
    if (context === undefined) {
        throw new Error('useAppError must be used within an AppErrorProvider');
    }
    return context;
}
