import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, ViewStyle, View, Text, TouchableOpacity, TouchableWithoutFeedback, ActivityIndicator, BackHandler, PanResponder, PanResponderInstance, Dimensions } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import Slider from '@react-native-community/slider';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as Brightness from 'expo-brightness';
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
    onFullScreenChange?: (isFullScreen: boolean) => void;
    onNext?: (keepPlaying: boolean) => void;
    onPrevious?: (keepPlaying: boolean) => void;
    hasPrevious?: boolean;
}

export default function VideoPlayer({ episode, initialPosition = 0, style, onProgressUpdate, onEnd, autoPlay = false, lastKnownPositionRef, lastKnownDurationRef, onPlayingChange, onFullScreenChange, onNext, onPrevious, hasPrevious = false }: Props) {
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
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [brightness, setBrightness] = useState(0);
    const [showBrightnessIndicator, setShowBrightnessIndicator] = useState(false);
    const [volume, setVolume] = useState(1);
    const [showVolumeIndicator, setShowVolumeIndicator] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1.0);
    const [showSpeedSelector, setShowSpeedSelector] = useState(false);
    const [isLongPressFF, setIsLongPressFF] = useState(false);

    // Gesture seeking state
    const [isGestureSeeking, setIsGestureSeeking] = useState(false);
    const [gestureSeekTime, setGestureSeekTime] = useState(0);
    const [gestureSeekOffset, setGestureSeekOffset] = useState(0);

    // Refs for PanResponder to access current values without re-binding
    const currentTimeRef = useRef(0);
    const durationRef = useRef(0);
    const isGestureSeekingRef = useRef(false);
    const lastTapTimeRef = useRef(0);
    const singleTapTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isPlayingRef = useRef(isPlaying);
    const isGestureBrightnessRef = useRef(false);
    const startBrightnessRef = useRef(0);
    const isGestureVolumeRef = useRef(false);
    const startVolumeRef = useRef(0);
    const startTouchXRef = useRef(0);
    const playerHeightRef = useRef(0);
    const playerWidthRef = useRef(0);

    // Long press fast forward refs
    const originalPlaybackRateRef = useRef(playbackRate);
    const isLongPressDetectingRef = useRef(false);
    const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isLongPressFFRef = useRef(false);

    // Update refs when state changes
    useEffect(() => {
        currentTimeRef.current = currentTime;
    }, [currentTime]);

    useEffect(() => {
        durationRef.current = duration;
    }, [duration]);

    useEffect(() => {
        isPlayingRef.current = isPlaying;
    }, [isPlaying]);

    useEffect(() => {
        isLongPressFFRef.current = isLongPressFF;
    }, [isLongPressFF]);

    useEffect(() => {
        (async () => {
            const { status } = await Brightness.requestPermissionsAsync();
            if (status === 'granted') {
                const currentBrightness = await Brightness.getBrightnessAsync();
                setBrightness(currentBrightness);
            }
        })();
    }, []);

    // Handle long press detection
    const handleLongPressDetected = () => {
        // Only start long press FF if no other gestures are active
        if (!isGestureSeekingRef.current && !isGestureBrightnessRef.current && !isGestureVolumeRef.current) {
            // Store original playback rate
            originalPlaybackRateRef.current = playbackRate;
            // Enable long press fast forward
            setIsLongPressFF(true);
            isLongPressFFRef.current = true;
            // Set playback rate to 2x
            handlePlaybackRateChange(2.0);
            if (controlsTimeoutRef.current) {
                clearTimeout(controlsTimeoutRef.current);
            }
        }
    };

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (evt, gestureState) => {
                // 如果长按快进已经激活，不启动新的手势
                if (isLongPressFFRef.current) {
                    return false;
                }

                const width = playerWidthRef.current || Dimensions.get('window').width;
                const isHorizontal = Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dy) < 20;
                const isVerticalLeft = Math.abs(gestureState.dy) > 10 && Math.abs(gestureState.dx) < 20 && evt.nativeEvent.locationX < width * 0.25;
                const isVerticalRight = Math.abs(gestureState.dy) > 10 && Math.abs(gestureState.dx) < 20 && evt.nativeEvent.locationX > width * 0.75;
                return isHorizontal || isVerticalLeft || isVerticalRight;
            },
            onPanResponderGrant: (evt, gestureState) => {
                startTouchXRef.current = evt.nativeEvent.locationX;

                // Start long press detection (300ms delay)
                isLongPressDetectingRef.current = true;
                longPressTimeoutRef.current = setTimeout(() => {
                    handleLongPressDetected();
                }, 300);

                // If we stole the responder (dx > 10), start seeking immediately
                if (Math.abs(gestureState.dx) > 10) {
                    // Cancel long press detection if we're starting to seek
                    if (longPressTimeoutRef.current) {
                        clearTimeout(longPressTimeoutRef.current);
                        longPressTimeoutRef.current = null;
                    }
                    isLongPressDetectingRef.current = false;
                    setIsGestureSeeking(true);
                    isGestureSeekingRef.current = true;
                    setGestureSeekTime(currentTimeRef.current);
                    setGestureSeekOffset(0);
                    if (controlsTimeoutRef.current) {
                        clearTimeout(controlsTimeoutRef.current);
                    }
                }
            },
            onPanResponderMove: async (evt, gestureState) => {
                const width = playerWidthRef.current || Dimensions.get('window').width;
                const height = playerHeightRef.current || Dimensions.get('window').height;

                // Cancel long press detection if any significant movement is detected
                if (isLongPressDetectingRef.current && (Math.abs(gestureState.dx) > 10 || Math.abs(gestureState.dy) > 10)) {
                    if (longPressTimeoutRef.current) {
                        clearTimeout(longPressTimeoutRef.current);
                        longPressTimeoutRef.current = null;
                    }
                    isLongPressDetectingRef.current = false;
                }

                // Check for Brightness Gesture (Left side vertical swipe)
                if (!isGestureSeekingRef.current && !isGestureBrightnessRef.current && !isGestureVolumeRef.current && !isLongPressFFRef.current) {
                    // If vertical movement is significant and touch started on left 25%
                    if (Math.abs(gestureState.dy) > 10 && Math.abs(gestureState.dx) < 10 && startTouchXRef.current < width * 0.25) {
                        // Cancel long press detection if we're starting brightness gesture
                        if (longPressTimeoutRef.current) {
                            clearTimeout(longPressTimeoutRef.current);
                            longPressTimeoutRef.current = null;
                        }
                        isLongPressDetectingRef.current = false;
                        isGestureBrightnessRef.current = true;
                        startBrightnessRef.current = await Brightness.getBrightnessAsync();
                        setShowBrightnessIndicator(true);
                        if (controlsTimeoutRef.current) {
                            clearTimeout(controlsTimeoutRef.current);
                        }
                    }
                    // If vertical movement is significant and touch started on right 25%
                    else if (Math.abs(gestureState.dy) > 10 && Math.abs(gestureState.dx) < 10 && startTouchXRef.current > width * 0.75) {
                        // Cancel long press detection if we're starting volume gesture
                        if (longPressTimeoutRef.current) {
                            clearTimeout(longPressTimeoutRef.current);
                            longPressTimeoutRef.current = null;
                        }
                        isLongPressDetectingRef.current = false;
                        isGestureVolumeRef.current = true;
                        startVolumeRef.current = player.volume;
                        setShowVolumeIndicator(true);
                        if (controlsTimeoutRef.current) {
                            clearTimeout(controlsTimeoutRef.current);
                        }
                    }
                }

                if (isGestureBrightnessRef.current) {
                    // Calculate brightness change
                    // Dragging up (negative dy) increases brightness
                    // Dragging down (positive dy) decreases brightness
                    // Full player height drag = 100% brightness change
                    const delta = -gestureState.dy / height;
                    let newBrightness = startBrightnessRef.current + delta;
                    newBrightness = Math.max(0, Math.min(1, newBrightness));

                    setBrightness(newBrightness);
                    await Brightness.setBrightnessAsync(newBrightness);
                    return;
                }

                if (isGestureVolumeRef.current) {
                    // Calculate volume change
                    // Dragging up (negative dy) increases volume
                    // Dragging down (positive dy) decreases volume
                    // Full player height drag = 100% volume change
                    const delta = -gestureState.dy / height;
                    let newVolume = startVolumeRef.current + delta;
                    newVolume = Math.max(0, Math.min(1, newVolume));

                    setVolume(newVolume);
                    player.volume = newVolume;
                    return;
                }

                // If not yet seeking, check if we should start
                if (!isGestureSeekingRef.current && !isLongPressFFRef.current) {
                    if (Math.abs(gestureState.dx) > 10) {
                        setIsGestureSeeking(true);
                        isGestureSeekingRef.current = true;
                        setGestureSeekTime(currentTimeRef.current);
                        setGestureSeekOffset(0);
                        if (controlsTimeoutRef.current) {
                            clearTimeout(controlsTimeoutRef.current);
                        }
                    }
                    return;
                }

                // Only perform seeking if not in long press fast forward mode
                if (!isLongPressFFRef.current) {
                    // 100 seconds for full screen width
                    const seekSeconds = (gestureState.dx / width) * 100;

                    let newTime = currentTimeRef.current + seekSeconds;
                    // Clamp time
                    newTime = Math.max(0, Math.min(newTime, durationRef.current));

                    setGestureSeekTime(newTime);
                    setGestureSeekOffset(seekSeconds);
                }
            },
            onPanResponderRelease: (evt, gestureState) => {
                // Cancel any pending long press detection
                if (longPressTimeoutRef.current) {
                    clearTimeout(longPressTimeoutRef.current);
                    longPressTimeoutRef.current = null;
                }
                isLongPressDetectingRef.current = false;

                // Restore original playback rate if long press FF was active
                if (isLongPressFFRef.current) {
                    handlePlaybackRateChange(originalPlaybackRateRef.current);
                    setIsLongPressFF(false);
                    isLongPressFFRef.current = false;
                    resetControlsTimeout();
                } else if (isGestureSeekingRef.current) {
                    const width = playerWidthRef.current || Dimensions.get('window').width;
                    const seekSeconds = (gestureState.dx / width) * 100;
                    let targetTime = currentTimeRef.current + seekSeconds;
                    targetTime = Math.max(0, Math.min(targetTime, durationRef.current));

                    if (playerRef.current) {
                        playerRef.current.currentTime = targetTime;
                        setCurrentTime(targetTime);
                    }

                    setIsGestureSeeking(false);
                    isGestureSeekingRef.current = false;
                    resetControlsTimeout();
                } else if (isGestureBrightnessRef.current) {
                    isGestureBrightnessRef.current = false;
                    setShowBrightnessIndicator(false);
                    resetControlsTimeout();
                } else if (isGestureVolumeRef.current) {
                    isGestureVolumeRef.current = false;
                    setShowVolumeIndicator(false);
                    resetControlsTimeout();
                } else {
                    // It was a tap
                    const now = Date.now();
                    const DOUBLE_TAP_DELAY = 300;

                    if (now - lastTapTimeRef.current < DOUBLE_TAP_DELAY) {
                        // Double tap detected
                        if (singleTapTimeoutRef.current) {
                            clearTimeout(singleTapTimeoutRef.current);
                            singleTapTimeoutRef.current = null;
                        }
                        handlePlayPause();
                        lastTapTimeRef.current = 0; // Reset to prevent triple tap triggering another double tap
                    } else {
                        // Single tap detected, wait for potential double tap
                        lastTapTimeRef.current = now;
                        singleTapTimeoutRef.current = setTimeout(() => {
                            toggleControls();
                            singleTapTimeoutRef.current = null;
                        }, DOUBLE_TAP_DELAY);
                    }
                }
            },
            onPanResponderTerminate: () => {
                // Cancel any pending long press detection
                if (longPressTimeoutRef.current) {
                    clearTimeout(longPressTimeoutRef.current);
                    longPressTimeoutRef.current = null;
                }
                isLongPressDetectingRef.current = false;

                // Restore original playback rate if long press FF was active
                if (isLongPressFFRef.current) {
                    handlePlaybackRateChange(originalPlaybackRateRef.current);
                    setIsLongPressFF(false);
                    isLongPressFFRef.current = false;
                }

                setIsGestureSeeking(false);
                isGestureSeekingRef.current = false;
                isGestureBrightnessRef.current = false;
                setShowBrightnessIndicator(false);
                isGestureVolumeRef.current = false;
                setShowVolumeIndicator(false);
                resetControlsTimeout();
            }
        })
    ).current;

    const getVideoUrl = (url: string) => {
        if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('file://')) return url;
        return `${API_CONFIG.BASE_URL}${url}`;
    };

    const player = useVideoPlayer(
        episode ? getVideoUrl(episode.url) : null,
        (player) => {
            player.loop = false;
            player.staysActiveInBackground = true;
            player.playbackRate = playbackRate;
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
        if (!playerRef.current) return;
        if (isPlayingRef.current) {
            playerRef.current.pause();
        } else {
            playerRef.current.play();
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

    // Handle Playback Rate Change
    const handlePlaybackRateChange = (rate: number) => {
        setPlaybackRate(rate);
        setShowSpeedSelector(false);
        if (playerRef.current) {
            playerRef.current.playbackRate = rate;
        }
        resetControlsTimeout();
    };

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

    // Reset orientation on unmount
    useEffect(() => {
        return () => {
            ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
            // Clear long press timeout if component unmounts
            if (longPressTimeoutRef.current) {
                clearTimeout(longPressTimeoutRef.current);
                longPressTimeoutRef.current = null;
            }
        };
    }, []);

    // Update playerRef when player changes
    useEffect(() => {
        playerRef.current = player;
        if (player) {
            player.playbackRate = playbackRate;
        }
    }, [player]);

    // Update playbackRate when state changes
    useEffect(() => {
        if (playerRef.current) {
            playerRef.current.playbackRate = playbackRate;
        }
    }, [playbackRate]);

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
            // Immediately update UI state when episode changes
            setIsPlaying(autoPlay);

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
        <View
            style={[styles.container, style]}
            onLayout={(e) => {
                playerHeightRef.current = e.nativeEvent.layout.height;
                playerWidthRef.current = e.nativeEvent.layout.width;
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
                {...panResponder.panHandlers}
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

                {/* Long Press Fast Forward Indicator */}
                {isLongPressFF && (
                    <View style={styles.centerIndicator}>
                        <Ionicons
                            name="play-forward"
                            size={50}
                            color="#fff"
                        />
                        <Text style={styles.indicatorText}>2x</Text>
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
                                style={{ marginLeft: isPlaying ? 0 : 4 }} // Slight offset for play icon to center visually
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

                {/* Speed Selector */}
                {showSpeedSelector && (
                    <View style={styles.speedSelector}>
                        {[0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0].map((rate) => (
                            <TouchableOpacity
                                key={rate}
                                style={[styles.speedOption, playbackRate === rate && styles.speedOptionSelected]}
                                onPress={() => handlePlaybackRateChange(rate)}
                            >
                                <Text style={[styles.speedText, playbackRate === rate && styles.speedTextSelected]}>
                                    {rate}x
                                </Text>
                            </TouchableOpacity>
                        ))}
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
                        <TouchableOpacity onPress={() => setShowSpeedSelector(!showSpeedSelector)} style={styles.speedButton}>
                            <Text style={styles.speedButtonText}>{playbackRate}x</Text>
                        </TouchableOpacity>
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
    speedButton: {
        padding: 5,
        marginLeft: 5,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 4,
        paddingHorizontal: 8,
    },
    speedButtonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    speedSelector: {
        position: 'absolute',
        bottom: 60,
        right: 10,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        borderRadius: 8,
        padding: 5,
        zIndex: 15,
    },
    speedOption: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 4,
    },
    speedOptionSelected: {
        backgroundColor: '#007AFF',
    },
    speedText: {
        color: '#fff',
        fontSize: 14,
        textAlign: 'center',
    },
    speedTextSelected: {
        fontWeight: 'bold',
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
