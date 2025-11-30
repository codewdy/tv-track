import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, ViewStyle, View, Text, TouchableOpacity, TouchableWithoutFeedback, ActivityIndicator } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
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
    const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Control states
    const [showControls, setShowControls] = useState(true);
    const [isPlaying, setIsPlaying] = useState(autoPlay);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isSeeking, setIsSeeking] = useState(false);

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

    // Format time helper
    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        if (h > 0) {
            return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    // Toggle controls visibility
    const toggleControls = () => {
        setShowControls(prev => !prev);
        if (!showControls) {
            resetControlsTimeout();
        } else {
            if (controlsTimeoutRef.current) {
                clearTimeout(controlsTimeoutRef.current);
            }
        }
    };

    const resetControlsTimeout = () => {
        if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current);
        }
        controlsTimeoutRef.current = setTimeout(() => {
            if (isPlaying) {
                setShowControls(false);
            }
        }, 3000);
    };

    // Handle Play/Pause
    const handlePlayPause = () => {
        if (isPlaying) {
            player.pause();
        } else {
            player.play();
        }
        resetControlsTimeout();
    };

    // Handle Seek
    const handleSeek = (value: number) => {
        player.currentTime = value;
        setCurrentTime(value);
        setIsSeeking(false);
        resetControlsTimeout();
    };

    const handleSlidingStart = () => {
        setIsSeeking(true);
        if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current);
        }
    };

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
                    setIsPlaying(event.isPlaying);
                    if (onPlayingChange) {
                        onPlayingChange(event.isPlaying);
                    }

                    if (event.isPlaying) {
                        resetControlsTimeout();
                    } else {
                        setShowControls(true); // Show controls when paused
                        if (controlsTimeoutRef.current) {
                            clearTimeout(controlsTimeoutRef.current);
                        }
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
                    setIsPlaying(false);
                    setShowControls(true);
                    if (onEnd) {
                        onEnd();
                    }
                }));

                // Listen for time updates to detect seeks
                let lastTime = 0;
                subscriptions.push(player.addListener('timeUpdate', (event: { currentTime: number }) => {
                    const currentTime = event.currentTime;
                    const duration = player.duration;

                    if (!isSeeking) {
                        setCurrentTime(currentTime);
                        setDuration(duration);
                    }

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
            if (controlsTimeoutRef.current) {
                clearTimeout(controlsTimeoutRef.current);
            }
        };
    }, [episode, initialPosition, player, onProgressUpdate, onEnd]);

    return (
        <View style={[styles.container, style]}>
            <VideoView
                style={StyleSheet.absoluteFill}
                player={player}
                allowsPictureInPicture
                nativeControls={false}
            />

            <TouchableWithoutFeedback onPress={toggleControls}>
                <View style={[styles.overlay, !showControls && styles.hidden]}>
                    {/* Center Play/Pause Button */}
                    <View style={styles.centerControls}>
                        <TouchableOpacity onPress={handlePlayPause} style={styles.playPauseButton}>
                            <Ionicons
                                name={isPlaying ? "pause" : "play"}
                                size={40}
                                color="#fff"
                                style={{ marginLeft: isPlaying ? 0 : 4 }} // Slight offset for play icon to center visually
                            />
                        </TouchableOpacity>
                    </View>

                    {/* Bottom Control Bar */}
                    <View style={styles.bottomControls}>
                        <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
                        <Slider
                            style={styles.slider}
                            minimumValue={0}
                            maximumValue={duration > 0 ? duration : 1}
                            value={currentTime}
                            onSlidingStart={handleSlidingStart}
                            onSlidingComplete={handleSeek}
                            minimumTrackTintColor="#007AFF"
                            maximumTrackTintColor="#FFFFFF"
                            thumbTintColor="#007AFF"
                        />
                        <Text style={styles.timeText}>{formatTime(duration)}</Text>
                    </View>
                </View>
            </TouchableWithoutFeedback>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
        overflow: 'hidden',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        justifyContent: 'space-between',
        padding: 10,
    },
    hidden: {
        opacity: 0,
    },
    centerControls: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    playPauseButton: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    bottomControls: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        borderRadius: 8,
        padding: 5,
    },
    slider: {
        flex: 1,
        marginHorizontal: 10,
        height: 40,
    },
    timeText: {
        color: '#fff',
        fontSize: 12,
        width: 50,
        textAlign: 'center',
    },
});
