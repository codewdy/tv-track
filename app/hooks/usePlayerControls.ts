import { useState, useRef, useCallback, useEffect } from 'react';

export function usePlayerControls(isPlaying: boolean, autoHideDelay = 3000) {
    const [showControls, setShowControls] = useState(true);
    const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const resetControlsTimeout = useCallback(() => {
        if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current);
        }
        controlsTimeoutRef.current = setTimeout(() => {
            if (isPlaying) {
                setShowControls(false);
            }
        }, autoHideDelay);
    }, [isPlaying, autoHideDelay]);

    const show = useCallback(() => {
        setShowControls(true);
        resetControlsTimeout();
    }, [resetControlsTimeout]);

    const hide = useCallback(() => {
        setShowControls(false);
        if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current);
        }
    }, []);

    const toggleControls = useCallback(() => {
        setShowControls(prev => {
            const willShow = !prev;
            if (willShow) {
                resetControlsTimeout();
            } else {
                if (controlsTimeoutRef.current) {
                    clearTimeout(controlsTimeoutRef.current);
                }
            }
            return willShow;
        });
    }, [resetControlsTimeout]);

    // Update timeout when playing state changes
    useEffect(() => {
        if (isPlaying && showControls) {
            resetControlsTimeout();
        } else if (!isPlaying) {
            // Keep controls visible when paused
            if (controlsTimeoutRef.current) {
                clearTimeout(controlsTimeoutRef.current);
            }
            setShowControls(true);
        }
    }, [isPlaying, showControls, resetControlsTimeout]);

    // Cleanup
    useEffect(() => {
        return () => {
            if (controlsTimeoutRef.current) {
                clearTimeout(controlsTimeoutRef.current);
            }
        };
    }, []);

    return {
        showControls,
        toggleControls,
        resetControlsTimeout,
        show,
        hide
    };
}
