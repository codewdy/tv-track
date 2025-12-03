import React, { useEffect, useRef, useState, useCallback } from 'react';
import { StyleSheet, ViewStyle, View, Text, TouchableOpacity, BackHandler } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import Slider from '@react-native-community/slider';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ScreenOrientation from 'expo-screen-orientation';
import { Episode } from '../types';
import { API_CONFIG } from '../config';
import { usePlayerControls } from '../hooks/usePlayerControls';
import { usePlayerGestures } from '../hooks/usePlayerGestures';

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
    onFullScreenChange?: (isFullScreen: boolean) => void;
    onNext?: (keepPlaying: boolean) => void;
    onPrevious?: (keepPlaying: boolean) => void;
    hasPrevious?: boolean;
}

export default function VideoPlayer({
    episode,
    initialPosition = 0,
    style,
    onProgressUpdate,
    onEnd,
    autoPlay = false,
    lastKnownPositionRef,
    lastKnownDurationRef,
    onPlayingChange,
    onFullScreenChange,
    onNext,
    onPrevious,
    hasPrevious = false
}: Props) {
    const lastReportedTimeRef = useRef<number>(0);
    const isEndedRef = useRef<boolean>(false);
    const playerRef = useRef<any>(null);

    // Playback State
    const [isPlaying, setIsPlaying] = useState(autoPlay);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isSeeking, setIsSeeking] = useState(false);
    const [isFullScreen, setIsFullScreen] = useState(false);

    // Video Player Setup
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

    // Controls Hook
    const {
        showControls,
        toggleControls,
        resetControlsTimeout,
        show: showControlsExplicitly
    } = usePlayerControls(isPlaying);

    // Handlers
    const handlePlayPause = useCallback(() => {
        if (isPlaying) {
            player.pause();
        } else {
            player.play();
        }
        resetControlsTimeout();
    }, [isPlaying, player, resetControlsTimeout]);

    const handleSeek = useCallback((value: number) => {
        player.currentTime = value;
        setCurrentTime(value);
        setIsSeeking(false);
        resetControlsTimeout();
    }, [player, resetControlsTimeout]);

    const handleSlidingStart = useCallback(() => {
        setIsSeeking(true);
        resetControlsTimeout();
    }, [resetControlsTimeout]);

    // Gestures Hook
    const {
        panHandlers,
        isGestureSeeking,
        gestureSeekTime,
        gestureSeekOffset,
        brightness,
        showBrightnessIndicator,
        volume,
        showVolumeIndicator,
        setPlayerLayout
    } = usePlayerGestures({
        player,
        currentTime,
        duration,
        onSeek: handleSeek,
        onInteract: resetControlsTimeout,
        onTogglePlayPause: handlePlayPause,
        onToggleControls: toggleControls
    });

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

    const toggleFullScreen = async () => {
        if (isFullScreen) {
            await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
            setIsFullScreen(false);
            if (onFullScreenChange) onFullScreenChange(false);
        } else {
            await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
            setIsFullScreen(true);
            if (onFullScreenChange) onFullScreenChange(true);
        }
        resetControlsTimeout();
    };

    // Effects
    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            if (isFullScreen) {
                toggleFullScreen();
                return true;
            }
            return false;
        });

        return () => {
            backHandler.remove();
        };
    }, [isFullScreen]);

    useEffect(() => {
        return () => {
            ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        };
    }, []);

    useEffect(() => {
        playerRef.current = player;
    }, [player]);

    useEffect(() => {
        lastKnownPositionRef.current = -1;
        lastKnownDurationRef.current = -1;
        if (episode) {
            isEndedRef.current = false;
            const url = getVideoUrl(episode.url);
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

    useEffect(() => {
        if (episode && player) {
            setIsPlaying(autoPlay);
            try {
                (player as any).timeUpdateEventInterval = 0.5;
            } catch (e) { }

            if (initialPosition > 0) {
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

    useEffect(() => {
        if (!episode || !player) return;

        lastReportedTimeRef.current = initialPosition;

        const reportProgress = (currentTime: number, duration: number) => {
            if (isEndedRef.current) return;
            try {
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
            if (isEndedRef.current) return;
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

        const subscriptions: any[] = [];

        try {
            if (player.addListener) {
                subscriptions.push(player.addListener('playingChange', (event: { isPlaying: boolean }) => {
                    setIsPlaying(event.isPlaying);
                    if (onPlayingChange) {
                        onPlayingChange(event.isPlaying);
                    }

                    if (event.isPlaying) {
                        resetControlsTimeout();
                    }

                    if (!event.isPlaying) {
                        try {
                            const currentTime = player.currentTime;
                            const duration = player.duration;
                            lastKnownPositionRef.current = currentTime;
                            lastKnownDurationRef.current = duration;
                            reportProgressImmediate(currentTime, duration);
                        } catch (e) { }
                    }
                }));

                subscriptions.push(player.addListener('playToEnd', () => {
                    isEndedRef.current = true;
                    setIsPlaying(false);
                    showControlsExplicitly();
                    if (onEnd) {
                        onEnd();
                    }
                }));

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

                    if (Math.abs(currentTime - lastTime) > 2 && lastTime > 0) {
                        reportProgressImmediate(currentTime, duration);
                    }
                    lastTime = currentTime;

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
        <View
            style={[styles.container, style]}
            onLayout={(e) => {
                setPlayerLayout(e.nativeEvent.layout.width, e.nativeEvent.layout.height);
            }}
        >
            <VideoView
                style={StyleSheet.absoluteFill}
                player={player}
                allowsPictureInPicture
                nativeControls={false}
            />

            <View
                style={[styles.overlay, !showControls && !isGestureSeeking && !showBrightnessIndicator && !showVolumeIndicator && styles.hidden]}
                {...panHandlers}
            >
                {/* Gesture Indicator */}
                {isGestureSeeking && (
                    <View style={styles.gestureIndicator}>
                        <Text style={styles.gestureTimeText}>
                            {formatTime(gestureSeekTime)} / {formatTime(duration)}
                        </Text>
                        <Text style={styles.gestureOffsetText}>
                            {gestureSeekOffset > 0 ? '+' : ''}{Math.round(gestureSeekOffset)}s
                        </Text>
                    </View>
                )}

                {/* Brightness Indicator */}
                {showBrightnessIndicator && (
                    <View style={styles.centerIndicator}>
                        <MaterialCommunityIcons
                            name={brightness > 0.5 ? "brightness-5" : brightness > 0.2 ? "brightness-6" : "brightness-7"}
                            size={50}
                            color="#fff"
                        />
                        <Text style={styles.indicatorText}>{Math.round(brightness * 100)}%</Text>
                    </View>
                )}

                {/* Volume Indicator */}
                {showVolumeIndicator && (
                    <View style={styles.centerIndicator}>
                        <Ionicons
                            name={volume > 0.5 ? "volume-high" : volume > 0 ? "volume-low" : "volume-mute"}
                            size={50}
                            color="#fff"
                        />
                        <Text style={styles.indicatorText}>{Math.round(volume * 100)}%</Text>
                    </View>
                )}

                {/* Center Play/Pause Button */}
                {!isGestureSeeking && !showBrightnessIndicator && !showVolumeIndicator && (
                    <View style={styles.centerControls} pointerEvents={showControls ? 'auto' : 'none'}>
                        {/* Previous Episode Button */}
                        <TouchableOpacity
                            onPress={() => onPrevious && hasPrevious && onPrevious(isPlaying)}
                            style={[styles.controlButton, !hasPrevious && styles.controlButtonDisabled]}
                            disabled={!hasPrevious}
                        >
                            <MaterialCommunityIcons
                                name="skip-previous"
                                size={30}
                                color={hasPrevious ? "#fff" : "#666"}
                            />
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => handleSeek(currentTime - 5)} style={styles.seekButton}>
                            <MaterialCommunityIcons name="rewind-5" size={30} color="#fff" />
                        </TouchableOpacity>

                        <TouchableOpacity onPress={handlePlayPause} style={styles.playPauseButton}>
                            <Ionicons
                                name={isPlaying ? "pause" : "play"}
                                size={40}
                                color="#fff"
                                style={{ marginLeft: isPlaying ? 0 : 4 }}
                            />
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => handleSeek(currentTime + 15)} style={styles.seekButton}>
                            <MaterialCommunityIcons name="fast-forward-15" size={30} color="#fff" />
                        </TouchableOpacity>

                        {/* Next Episode Button */}
                        <TouchableOpacity onPress={() => onNext && onNext(isPlaying)} style={styles.controlButton}>
                            <MaterialCommunityIcons name="skip-next" size={30} color="#fff" />
                        </TouchableOpacity>
                    </View>
                )}

                {/* Bottom Control Bar */}
                {!isGestureSeeking && !showBrightnessIndicator && !showVolumeIndicator && (
                    <View style={styles.bottomControls} pointerEvents={showControls ? 'auto' : 'none'}>
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
                        <TouchableOpacity onPress={toggleFullScreen} style={styles.fullScreenButton}>
                            <Ionicons
                                name={isFullScreen ? "contract" : "expand"}
                                size={20}
                                color="#fff"
                            />
                        </TouchableOpacity>
                    </View>
                )}
            </View>
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
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 40,
    },
    seekButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    controlButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    controlButtonDisabled: {
        opacity: 0.3,
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
    fullScreenButton: {
        padding: 5,
        marginLeft: 5,
    },
    gestureIndicator: {
        position: 'absolute',
        top: '40%',
        left: 0,
        right: 0,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
    gestureTimeText: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    gestureOffsetText: {
        color: '#ddd',
        fontSize: 18,
        marginTop: 5,
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    centerIndicator: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: [{ translateX: -50 }, { translateY: -50 }],
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        borderRadius: 10,
        padding: 20,
        zIndex: 20,
    },
    indicatorText: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
        marginTop: 10,
    },
});
