import React, { useEffect, useRef, useCallback, useMemo, useReducer } from 'react';
import { StyleSheet, ViewStyle, View, Text, TouchableOpacity, PanResponder, Dimensions, BackHandler } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import Slider from '@react-native-community/slider';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as Brightness from 'expo-brightness';
import { Episode } from '../types';
import { API_CONFIG } from '../config';

// ============= Types =============
interface ProgressUpdate {
    currentTime: number;
    duration: number;
}

interface Props {
    episode: Episode | null;
    initialPosition?: number;
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

// ============= State Reducer =============
interface PlayerState {
    // Playback
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    isSeeking: boolean;
    // UI
    showControls: boolean;
    isFullScreen: boolean;
    // Gestures
    gestureType: 'none' | 'seek' | 'brightness' | 'volume';
    gestureSeekTime: number;
    gestureSeekOffset: number;
    brightness: number;
    volume: number;
}

type PlayerAction =
    | { type: 'SET_PLAYING'; payload: boolean }
    | { type: 'SET_TIME'; payload: { currentTime: number; duration: number } }
    | { type: 'SET_SEEKING'; payload: boolean }
    | { type: 'TOGGLE_CONTROLS' }
    | { type: 'SET_CONTROLS'; payload: boolean }
    | { type: 'SET_FULLSCREEN'; payload: boolean }
    | { type: 'START_GESTURE'; payload: { type: 'seek' | 'brightness' | 'volume'; startTime?: number } }
    | { type: 'UPDATE_GESTURE_SEEK'; payload: { time: number; offset: number } }
    | { type: 'SET_BRIGHTNESS'; payload: number }
    | { type: 'SET_VOLUME'; payload: number }
    | { type: 'END_GESTURE' };

const initialState: PlayerState = {
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    isSeeking: false,
    showControls: true,
    isFullScreen: false,
    gestureType: 'none',
    gestureSeekTime: 0,
    gestureSeekOffset: 0,
    brightness: 0,
    volume: 1,
};

function playerReducer(state: PlayerState, action: PlayerAction): PlayerState {
    switch (action.type) {
        case 'SET_PLAYING':
            return { ...state, isPlaying: action.payload };
        case 'SET_TIME':
            return state.isSeeking ? state : { ...state, ...action.payload };
        case 'SET_SEEKING':
            return { ...state, isSeeking: action.payload };
        case 'TOGGLE_CONTROLS':
            return { ...state, showControls: !state.showControls };
        case 'SET_CONTROLS':
            return { ...state, showControls: action.payload };
        case 'SET_FULLSCREEN':
            return { ...state, isFullScreen: action.payload };
        case 'START_GESTURE':
            return {
                ...state,
                gestureType: action.payload.type,
                gestureSeekTime: action.payload.startTime ?? state.currentTime,
                gestureSeekOffset: 0,
            };
        case 'UPDATE_GESTURE_SEEK':
            return { ...state, gestureSeekTime: action.payload.time, gestureSeekOffset: action.payload.offset };
        case 'SET_BRIGHTNESS':
            return { ...state, brightness: action.payload };
        case 'SET_VOLUME':
            return { ...state, volume: action.payload };
        case 'END_GESTURE':
            return { ...state, gestureType: 'none' };
        default:
            return state;
    }
}

// ============= Utilities =============
const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return h > 0
        ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
        : `${m}:${s.toString().padStart(2, '0')}`;
};

const getVideoUrl = (url: string): string => {
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('file://')) return url;
    return `${API_CONFIG.BASE_URL}${url}`;
};

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

// ============= Sub-Components =============
interface GestureIndicatorProps {
    type: 'seek' | 'brightness' | 'volume';
    seekTime?: number;
    duration?: number;
    seekOffset?: number;
    brightness?: number;
    volume?: number;
}

const GestureIndicator = React.memo(({ type, seekTime = 0, duration = 0, seekOffset = 0, brightness = 0, volume = 0 }: GestureIndicatorProps) => {
    if (type === 'seek') {
        return (
            <View style={styles.gestureIndicator}>
                <Text style={styles.gestureTimeText}>
                    {formatTime(seekTime)} / {formatTime(duration)}
                </Text>
                <Text style={styles.gestureOffsetText}>
                    {seekOffset > 0 ? '+' : ''}{Math.round(seekOffset)}s
                </Text>
            </View>
        );
    }

    if (type === 'brightness') {
        const iconName = brightness > 0.5 ? "brightness-5" : brightness > 0.2 ? "brightness-6" : "brightness-7";
        return (
            <View style={styles.centerIndicator}>
                <MaterialCommunityIcons name={iconName} size={50} color="#fff" />
                <Text style={styles.indicatorText}>{Math.round(brightness * 100)}%</Text>
            </View>
        );
    }

    if (type === 'volume') {
        const iconName = volume > 0.5 ? "volume-high" : volume > 0 ? "volume-low" : "volume-mute";
        return (
            <View style={styles.centerIndicator}>
                <Ionicons name={iconName} size={50} color="#fff" />
                <Text style={styles.indicatorText}>{Math.round(volume * 100)}%</Text>
            </View>
        );
    }

    return null;
});

interface CenterControlsProps {
    isPlaying: boolean;
    hasPrevious: boolean;
    onPlayPause: () => void;
    onSeekBackward: () => void;
    onSeekForward: () => void;
    onPrevious: () => void;
    onNext: () => void;
}

const CenterControls = React.memo(({ isPlaying, hasPrevious, onPlayPause, onSeekBackward, onSeekForward, onPrevious, onNext }: CenterControlsProps) => (
    <View style={styles.centerControls}>
        <TouchableOpacity
            onPress={onPrevious}
            style={[styles.controlButton, !hasPrevious && styles.controlButtonDisabled]}
            disabled={!hasPrevious}
        >
            <MaterialCommunityIcons name="skip-previous" size={30} color={hasPrevious ? "#fff" : "#666"} />
        </TouchableOpacity>

        <TouchableOpacity onPress={onSeekBackward} style={styles.seekButton}>
            <MaterialCommunityIcons name="rewind-5" size={30} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity onPress={onPlayPause} style={styles.playPauseButton}>
            <Ionicons
                name={isPlaying ? "pause" : "play"}
                size={40}
                color="#fff"
                style={{ marginLeft: isPlaying ? 0 : 4 }}
            />
        </TouchableOpacity>

        <TouchableOpacity onPress={onSeekForward} style={styles.seekButton}>
            <MaterialCommunityIcons name="fast-forward-15" size={30} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity onPress={onNext} style={styles.controlButton}>
            <MaterialCommunityIcons name="skip-next" size={30} color="#fff" />
        </TouchableOpacity>
    </View>
));

interface BottomControlsProps {
    currentTime: number;
    duration: number;
    isFullScreen: boolean;
    onSlidingStart: () => void;
    onSeek: (value: number) => void;
    onToggleFullScreen: () => void;
}

const BottomControls = React.memo(({ currentTime, duration, isFullScreen, onSlidingStart, onSeek, onToggleFullScreen }: BottomControlsProps) => (
    <View style={styles.bottomControls}>
        <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
        <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={duration > 0 ? duration : 1}
            value={currentTime}
            onSlidingStart={onSlidingStart}
            onSlidingComplete={onSeek}
            minimumTrackTintColor="#007AFF"
            maximumTrackTintColor="#FFFFFF"
            thumbTintColor="#007AFF"
        />
        <Text style={styles.timeText}>{formatTime(duration)}</Text>
        <TouchableOpacity onPress={onToggleFullScreen} style={styles.fullScreenButton}>
            <Ionicons name={isFullScreen ? "contract" : "expand"} size={20} color="#fff" />
        </TouchableOpacity>
    </View>
));

// ============= Custom Hooks =============
interface GestureRefs {
    currentTime: number;
    duration: number;
    isPlaying: boolean;
    volume: number;
    showControls: boolean;
}

function useGestureHandler(
    dispatch: React.Dispatch<PlayerAction>,
    gestureRefs: React.RefObject<GestureRefs>,
    playerRef: React.RefObject<any>,
    playerDimensionsRef: React.RefObject<{ width: number; height: number }>,
    resetControlsTimeout: () => void,
    clearControlsTimeout: () => void
) {
    const gestureStateRef = useRef({
        isGestureSeeking: false,
        isGestureBrightness: false,
        isGestureVolume: false,
        startTouchX: 0,
        startBrightness: 0,
        startVolume: 0,
        lastTapTime: 0,
    });
    const singleTapTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleTap = useCallback((isDoubleTap: boolean, wasShowingControls: boolean) => {
        if (isDoubleTap) {
            // Double tap - toggle play/pause
            const player = playerRef.current;
            if (player) {
                if (gestureRefs.current!.isPlaying) {
                    player.pause();
                } else {
                    player.play();
                }
            }
            resetControlsTimeout();
        } else {
            // Single tap - toggle controls
            dispatch({ type: 'TOGGLE_CONTROLS' });
            // Match original behavior: only reset timeout when showing controls
            if (!wasShowingControls) {
                resetControlsTimeout();
            } else {
                clearControlsTimeout();
            }
        }
    }, [dispatch, playerRef, gestureRefs, resetControlsTimeout, clearControlsTimeout]);

    const panResponder = useMemo(() => PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (evt, gestureState) => {
            const { width } = playerDimensionsRef.current!;
            const isHorizontal = Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dy) < 20;
            const isVerticalLeft = Math.abs(gestureState.dy) > 10 && Math.abs(gestureState.dx) < 20 && evt.nativeEvent.locationX < width * 0.25;
            const isVerticalRight = Math.abs(gestureState.dy) > 10 && Math.abs(gestureState.dx) < 20 && evt.nativeEvent.locationX > width * 0.75;
            return isHorizontal || isVerticalLeft || isVerticalRight;
        },
        onPanResponderGrant: (evt, gestureState) => {
            const gs = gestureStateRef.current;
            gs.startTouchX = evt.nativeEvent.locationX;

            if (Math.abs(gestureState.dx) > 10) {
                gs.isGestureSeeking = true;
                dispatch({ type: 'START_GESTURE', payload: { type: 'seek', startTime: gestureRefs.current!.currentTime } });
                clearControlsTimeout();
            }
        },
        onPanResponderMove: async (evt, gestureState) => {
            const gs = gestureStateRef.current;
            const { width, height } = playerDimensionsRef.current!;
            const refs = gestureRefs.current!;

            // Check for brightness/volume gesture start
            if (!gs.isGestureSeeking && !gs.isGestureBrightness && !gs.isGestureVolume) {
                if (Math.abs(gestureState.dy) > 10 && Math.abs(gestureState.dx) < 10) {
                    if (gs.startTouchX < width * 0.25) {
                        gs.isGestureBrightness = true;
                        gs.startBrightness = await Brightness.getBrightnessAsync();
                        dispatch({ type: 'START_GESTURE', payload: { type: 'brightness' } });
                        clearControlsTimeout();
                    } else if (gs.startTouchX > width * 0.75) {
                        gs.isGestureVolume = true;
                        gs.startVolume = refs.volume;
                        dispatch({ type: 'START_GESTURE', payload: { type: 'volume' } });
                        clearControlsTimeout();
                    }
                }
            }

            if (gs.isGestureBrightness) {
                const delta = -gestureState.dy / height;
                const newBrightness = clamp(gs.startBrightness + delta, 0, 1);
                dispatch({ type: 'SET_BRIGHTNESS', payload: newBrightness });
                await Brightness.setBrightnessAsync(newBrightness);
                return;
            }

            if (gs.isGestureVolume) {
                const delta = -gestureState.dy / height;
                const newVolume = clamp(gs.startVolume + delta, 0, 1);
                dispatch({ type: 'SET_VOLUME', payload: newVolume });
                if (playerRef.current) {
                    playerRef.current.volume = newVolume;
                }
                return;
            }

            // Start seek gesture if not already
            if (!gs.isGestureSeeking && Math.abs(gestureState.dx) > 10) {
                gs.isGestureSeeking = true;
                dispatch({ type: 'START_GESTURE', payload: { type: 'seek', startTime: refs.currentTime } });
                clearControlsTimeout();
                return;
            }

            if (gs.isGestureSeeking) {
                const seekSeconds = (gestureState.dx / width) * 90;
                const newTime = clamp(refs.currentTime + seekSeconds, 0, refs.duration);
                dispatch({ type: 'UPDATE_GESTURE_SEEK', payload: { time: newTime, offset: seekSeconds } });
            }
        },
        onPanResponderRelease: (evt, gestureState) => {
            const gs = gestureStateRef.current;
            const { width } = playerDimensionsRef.current!;
            const refs = gestureRefs.current!;

            if (gs.isGestureSeeking) {
                const seekSeconds = (gestureState.dx / width) * 90;
                const targetTime = clamp(refs.currentTime + seekSeconds, 0, refs.duration);
                if (playerRef.current) {
                    playerRef.current.currentTime = targetTime;
                    // Update UI state immediately to match original behavior
                    dispatch({ type: 'SET_TIME', payload: { currentTime: targetTime, duration: refs.duration } });
                }
                gs.isGestureSeeking = false;
                dispatch({ type: 'END_GESTURE' });
                resetControlsTimeout();
            } else if (gs.isGestureBrightness) {
                gs.isGestureBrightness = false;
                dispatch({ type: 'END_GESTURE' });
                resetControlsTimeout();
            } else if (gs.isGestureVolume) {
                gs.isGestureVolume = false;
                dispatch({ type: 'END_GESTURE' });
                resetControlsTimeout();
            } else {
                // Handle tap
                const now = Date.now();
                const DOUBLE_TAP_DELAY = 300;
                const wasShowingControls = gestureRefs.current!.showControls;

                if (now - gs.lastTapTime < DOUBLE_TAP_DELAY) {
                    if (singleTapTimeoutRef.current) {
                        clearTimeout(singleTapTimeoutRef.current);
                        singleTapTimeoutRef.current = null;
                    }
                    handleTap(true, wasShowingControls);
                    gs.lastTapTime = 0;
                } else {
                    gs.lastTapTime = now;
                    singleTapTimeoutRef.current = setTimeout(() => {
                        handleTap(false, gestureRefs.current!.showControls);
                        singleTapTimeoutRef.current = null;
                    }, DOUBLE_TAP_DELAY);
                }
            }
        },
        onPanResponderTerminate: () => {
            const gs = gestureStateRef.current;
            gs.isGestureSeeking = false;
            gs.isGestureBrightness = false;
            gs.isGestureVolume = false;
            dispatch({ type: 'END_GESTURE' });
            resetControlsTimeout();
        }
    }), [dispatch, gestureRefs, playerRef, playerDimensionsRef, resetControlsTimeout, clearControlsTimeout, handleTap]);

    return panResponder;
}

function useControlsTimeout(dispatch: React.Dispatch<PlayerAction>, isPlayingRef: React.RefObject<boolean>) {
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const clear = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    }, []);

    const reset = useCallback(() => {
        clear();
        timeoutRef.current = setTimeout(() => {
            // Use ref to get current isPlaying value, avoiding stale closure
            if (isPlayingRef.current) {
                dispatch({ type: 'SET_CONTROLS', payload: false });
            }
        }, 3000);
    }, [dispatch, isPlayingRef, clear]);

    useEffect(() => () => clear(), [clear]);

    return { reset, clear };
}

// ============= Main Component =============
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
    // State
    const [state, dispatch] = useReducer(playerReducer, { ...initialState, isPlaying: autoPlay });
    const { isPlaying, currentTime, duration, isSeeking, showControls, isFullScreen, gestureType, gestureSeekTime, gestureSeekOffset, brightness, volume } = state;

    // Refs
    const playerRef = useRef<any>(null);
    const isEndedRef = useRef(false);
    const lastReportedTimeRef = useRef(initialPosition);
    const playerDimensionsRef = useRef({ width: Dimensions.get('window').width, height: Dimensions.get('window').height });

    // Gesture refs - mutable values for PanResponder
    const gestureRefs = useRef<GestureRefs>({ currentTime: 0, duration: 0, isPlaying: false, volume: 1, showControls: true });
    useEffect(() => {
        gestureRefs.current = { currentTime, duration, isPlaying, volume, showControls };
    }, [currentTime, duration, isPlaying, volume, showControls]);

    // Ref for isPlaying to avoid stale closures in timeout
    const isPlayingRef = useRef(isPlaying);
    useEffect(() => {
        isPlayingRef.current = isPlaying;
    }, [isPlaying]);

    // Controls timeout
    const { reset: resetControlsTimeout, clear: clearControlsTimeout } = useControlsTimeout(dispatch, isPlayingRef);

    // Gesture handler
    const panResponder = useGestureHandler(
        dispatch,
        gestureRefs,
        playerRef,
        playerDimensionsRef,
        resetControlsTimeout,
        clearControlsTimeout
    );

    // Initialize brightness
    useEffect(() => {
        (async () => {
            const { status } = await Brightness.requestPermissionsAsync();
            if (status === 'granted') {
                const currentBrightness = await Brightness.getBrightnessAsync();
                dispatch({ type: 'SET_BRIGHTNESS', payload: currentBrightness });
            }
        })();
    }, []);

    // Create player
    const player = useVideoPlayer(
        episode ? getVideoUrl(episode.url) : null,
        (p) => {
            p.loop = false;
            p.staysActiveInBackground = true;
            playerRef.current = p;
        }
    );

    // Update episode source
    useEffect(() => {
        lastKnownPositionRef.current = -1;
        lastKnownDurationRef.current = -1;
        if (episode) {
            isEndedRef.current = false;
            const url = getVideoUrl(episode.url);
            const source = { uri: url, headers: { Authorization: API_CONFIG.AUTH_HEADER } };
            if ((player as any).replaceAsync) {
                (player as any).replaceAsync(source);
            } else {
                player.replace(source);
            }
        }
    }, [episode, player, lastKnownPositionRef, lastKnownDurationRef]);

    // Seek to initial position and handle autoPlay
    useEffect(() => {
        if (!episode || !player) return;

        dispatch({ type: 'SET_PLAYING', payload: autoPlay });

        try {
            (player as any).timeUpdateEventInterval = 0.5;
        } catch { /* ignore */ }

        if (initialPosition > 0) {
            const timer = setTimeout(() => {
                try {
                    player.currentTime = initialPosition;
                    autoPlay ? player.play() : player.pause();
                } catch (e) {
                    console.error('Failed to seek to initial position:', e);
                }
            }, 500);
            return () => clearTimeout(timer);
        } else {
            autoPlay ? player.play() : player.pause();
        }
    }, [episode, initialPosition, player, autoPlay]);

    // Player event listeners
    useEffect(() => {
        if (!episode || !player?.addListener) return;

        lastReportedTimeRef.current = initialPosition;

        const reportProgress = (ct: number, dur: number, immediate = false) => {
            if (isEndedRef.current || ct <= 0 || dur <= 0) return;
            if (!immediate && Math.abs(ct - lastReportedTimeRef.current) <= 5) return;

            lastReportedTimeRef.current = ct;
            onProgressUpdate?.({ currentTime: ct, duration: dur });
        };

        const subscriptions = [
            player.addListener('playingChange', (event: { isPlaying: boolean }) => {
                dispatch({ type: 'SET_PLAYING', payload: event.isPlaying });
                onPlayingChange?.(event.isPlaying);

                if (event.isPlaying) {
                    resetControlsTimeout();
                } else {
                    try {
                        const ct = player.currentTime;
                        const dur = player.duration;
                        lastKnownPositionRef.current = ct;
                        lastKnownDurationRef.current = dur;
                        reportProgress(ct, dur, true);
                    } catch { /* ignore */ }
                }
            }),
            player.addListener('playToEnd', () => {
                isEndedRef.current = true;
                dispatch({ type: 'SET_PLAYING', payload: false });
                dispatch({ type: 'SET_CONTROLS', payload: true });
                onEnd?.();
            }),
            (() => {
                let lastTime = 0;
                return player.addListener('timeUpdate', (event: { currentTime: number }) => {
                    const ct = event.currentTime;
                    const dur = player.duration;

                    dispatch({ type: 'SET_TIME', payload: { currentTime: ct, duration: dur } });
                    lastKnownPositionRef.current = ct;
                    lastKnownDurationRef.current = dur;

                    // Detect seek (jump > 2s)
                    if (Math.abs(ct - lastTime) > 2 && lastTime > 0) {
                        reportProgress(ct, dur, true);
                    }
                    lastTime = ct;
                    reportProgress(ct, dur);
                });
            })()
        ];

        return () => subscriptions.forEach(sub => sub.remove());
    }, [episode, initialPosition, player, onProgressUpdate, onEnd, onPlayingChange, resetControlsTimeout, lastKnownPositionRef, lastKnownDurationRef]);

    // Fullscreen toggle
    const toggleFullScreen = useCallback(async () => {
        const newFullScreen = !isFullScreen;
        await ScreenOrientation.lockAsync(
            newFullScreen ? ScreenOrientation.OrientationLock.LANDSCAPE : ScreenOrientation.OrientationLock.PORTRAIT_UP
        );
        dispatch({ type: 'SET_FULLSCREEN', payload: newFullScreen });
        onFullScreenChange?.(newFullScreen);
        resetControlsTimeout();
    }, [isFullScreen, onFullScreenChange, resetControlsTimeout]);

    // Back button handler for fullscreen
    useEffect(() => {
        const handler = BackHandler.addEventListener('hardwareBackPress', () => {
            if (isFullScreen) {
                toggleFullScreen();
                return true;
            }
            return false;
        });
        return () => handler.remove();
    }, [isFullScreen, toggleFullScreen]);

    // Reset orientation on unmount
    useEffect(() => {
        return () => {
            ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        };
    }, []);

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
        dispatch({ type: 'SET_TIME', payload: { currentTime: value, duration } });
        dispatch({ type: 'SET_SEEKING', payload: false });
        resetControlsTimeout();
    }, [player, duration, resetControlsTimeout]);

    const handleSlidingStart = useCallback(() => {
        dispatch({ type: 'SET_SEEKING', payload: true });
        clearControlsTimeout();
    }, [clearControlsTimeout]);

    const handleSeekBackward = useCallback(() => handleSeek(Math.max(0, currentTime - 5)), [handleSeek, currentTime]);
    const handleSeekForward = useCallback(() => handleSeek(Math.min(duration, currentTime + 15)), [handleSeek, currentTime, duration]);
    const handlePrevious = useCallback(() => hasPrevious && onPrevious?.(isPlaying), [hasPrevious, onPrevious, isPlaying]);
    const handleNext = useCallback(() => onNext?.(isPlaying), [onNext, isPlaying]);

    // Overlay visibility
    const showOverlay = showControls || gestureType !== 'none';

    return (
        <View
            style={[styles.container, style]}
            onLayout={(e) => {
                playerDimensionsRef.current = {
                    width: e.nativeEvent.layout.width,
                    height: e.nativeEvent.layout.height
                };
            }}
        >
            <VideoView
                style={StyleSheet.absoluteFill}
                player={player}
                allowsPictureInPicture
                nativeControls={false}
            />

            <View style={[styles.overlay, !showOverlay && styles.hidden]} {...panResponder.panHandlers}>
                {gestureType === 'seek' && (
                    <GestureIndicator
                        type="seek"
                        seekTime={gestureSeekTime}
                        duration={duration}
                        seekOffset={gestureSeekOffset}
                    />
                )}

                {gestureType === 'brightness' && (
                    <GestureIndicator type="brightness" brightness={brightness} />
                )}

                {gestureType === 'volume' && (
                    <GestureIndicator type="volume" volume={volume} />
                )}

                {gestureType === 'none' && (
                    <>
                        <CenterControls
                            isPlaying={isPlaying}
                            hasPrevious={hasPrevious}
                            onPlayPause={handlePlayPause}
                            onSeekBackward={handleSeekBackward}
                            onSeekForward={handleSeekForward}
                            onPrevious={handlePrevious}
                            onNext={handleNext}
                        />

                        <BottomControls
                            currentTime={currentTime}
                            duration={duration}
                            isFullScreen={isFullScreen}
                            onSlidingStart={handleSlidingStart}
                            onSeek={handleSeek}
                            onToggleFullScreen={toggleFullScreen}
                        />
                    </>
                )}
            </View>
        </View>
    );
}

// ============= Styles =============
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
