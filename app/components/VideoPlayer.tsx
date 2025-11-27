import React, { useEffect, useRef } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Episode } from '../types';
import { API_CONFIG } from '../config';

interface ProgressUpdate {
    currentTime: number;
    duration: number;
}

interface Props {
    episode: Episode | null;
    initialPosition?: number; // in seconds
    style?: ViewStyle;
    onProgressUpdate?: (progress: ProgressUpdate) => void;
    onEnd?: () => void;
    autoPlay?: boolean;
    lastKnownPositionRef: React.RefObject<number>;
    lastKnownDurationRef: React.RefObject<number>;
    onPlayingChange?: (isPlaying: boolean) => void;
}

export default function VideoPlayer({ episode, initialPosition = 0, style, onProgressUpdate, onEnd, autoPlay = false, lastKnownPositionRef, lastKnownDurationRef, onPlayingChange }: Props) {
    const lastReportedTimeRef = useRef<number>(0);
    const isEndedRef = useRef<boolean>(false);
    const playerRef = useRef<any>(null);

    const getVideoUrl = (url: string) => {
        if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('file://')) return url;
        return `${API_CONFIG.BASE_URL}${url}`;
    };

    const player = useVideoPlayer(
        episode ? getVideoUrl(episode.url) : null,
        (player) => {
            player.loop = false;
            player.staysActiveInBackground = true;
            playerRef.current = player;
        }
    );

    // Update playerRef when player changes
    useEffect(() => {
        playerRef.current = player;
    }, [player]);

    // Update player source when episode changes
    useEffect(() => {
        lastKnownPositionRef.current = -1;
        lastKnownDurationRef.current = -1;
        if (episode) {
            isEndedRef.current = false; // Reset ended state
            const url = getVideoUrl(episode.url);
            // Use replaceAsync to avoid main thread freeze warning
            if ((player as any).replaceAsync) {
                (player as any).replaceAsync({
                    uri: url,
                    headers: { Authorization: API_CONFIG.AUTH_HEADER }
                });
            } else {
                player.replace({
                    uri: url,
                    headers: { Authorization: API_CONFIG.AUTH_HEADER }
                });
            }
        }
    }, [episode]);

    // Seek to initial position after player is ready
    useEffect(() => {
        if (episode && player) {
            // Set update interval for timeUpdate event (in seconds)
            try {
                (player as any).timeUpdateEventInterval = 0.5;
            } catch (e) {
                // Ignore
            }

            if (initialPosition > 0) {
                // Wait a bit for the video to load before seeking
                const timer = setTimeout(() => {
                    try {
                        player.currentTime = initialPosition;
                        if (autoPlay) {
                            player.play();
                        } else {
                            player.pause();
                        }
                    } catch (error) {
                        console.error('Failed to seek to initial position:', error);
                    }
                }, 500);
                return () => clearTimeout(timer);
            } else {
                if (autoPlay) {
                    player.play();
                } else {
                    player.pause();
                }
            }
        }
    }, [episode, initialPosition, player, autoPlay]);

    // Report progress using event listeners
    useEffect(() => {
        if (!episode || !player) return;

        lastReportedTimeRef.current = initialPosition;

        const reportProgress = (currentTime: number, duration: number) => {
            if (isEndedRef.current) return; // Stop reporting if ended
            try {
                // Only report if we have valid values and time has changed
                if (currentTime > 0 && duration > 0 && Math.abs(currentTime - lastReportedTimeRef.current) > 5) {
                    lastReportedTimeRef.current = currentTime;
                    if (onProgressUpdate) {
                        onProgressUpdate({ currentTime, duration });
                    }
                }
            } catch (error) {
                console.error('Failed to report progress:', error);
            }
        };

        const reportProgressImmediate = (currentTime: number, duration: number) => {
            if (isEndedRef.current) return; // Stop reporting if ended
            try {
                if (currentTime > 0 && duration > 0) {
                    lastReportedTimeRef.current = currentTime;
                    if (onProgressUpdate) {
                        onProgressUpdate({ currentTime, duration });
                    }
                }
            } catch (error) {
                console.error('Failed to report progress immediately:', error);
            }
        };

        // Subscribe to events
        const subscriptions: any[] = [];

        try {
            // Listen for play/pause changes
            if (player.addListener) {
                subscriptions.push(player.addListener('playingChange', (event: { isPlaying: boolean }) => {
                    if (onPlayingChange) {
                        onPlayingChange(event.isPlaying);
                    }
                    if (!event.isPlaying) {
                        try {
                            // Safe to access properties inside event handler usually
                            const currentTime = player.currentTime;
                            const duration = player.duration;
                            lastKnownPositionRef.current = currentTime;
                            lastKnownDurationRef.current = duration;
                            reportProgressImmediate(currentTime, duration);
                        } catch (e) {
                            // Ignore
                        }
                    }
                }));

                // Listen for playback completion
                subscriptions.push(player.addListener('playToEnd', () => {
                    isEndedRef.current = true; // Mark as ended
                    if (onEnd) {
                        onEnd();
                    }
                }));

                // Listen for time updates to detect seeks
                let lastTime = 0;
                subscriptions.push(player.addListener('timeUpdate', (event: { currentTime: number }) => {
                    const currentTime = event.currentTime;
                    const duration = player.duration;

                    lastKnownPositionRef.current = currentTime;
                    lastKnownDurationRef.current = duration;

                    // Check for seek
                    if (Math.abs(currentTime - lastTime) > 2 && lastTime > 0) {
                        reportProgressImmediate(currentTime, duration);
                    }
                    lastTime = currentTime;

                    // Also handle periodic reporting here
                    reportProgress(currentTime, duration);
                }));
            }
        } catch (e) {
            console.error('[VideoPlayer] Failed to add listeners:', e);
        }

        return () => {
            subscriptions.forEach(sub => sub.remove());
        };
    }, [episode, initialPosition, player, onProgressUpdate, onEnd]);

    return (
        <VideoView
            style={[styles.video, style]}
            player={player}
            allowsPictureInPicture
        />
    );
}

const styles = StyleSheet.create({
    video: {
        flex: 1,
    },
});
