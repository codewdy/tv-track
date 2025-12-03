import { useRef, useState, useEffect } from 'react';
import { PanResponder, Dimensions } from 'react-native';
import * as Brightness from 'expo-brightness';
import { VideoPlayer } from 'expo-video';

interface UsePlayerGesturesProps {
    player: VideoPlayer | null;
    currentTime: number;
    duration: number;
    onSeek: (time: number) => void;
    onInteract: () => void;
    onTogglePlayPause: () => void;
    onToggleControls: () => void;
}

export function usePlayerGestures({
    player,
    currentTime,
    duration,
    onSeek,
    onInteract,
    onTogglePlayPause,
    onToggleControls
}: UsePlayerGesturesProps) {
    // Gesture States
    const [isGestureSeeking, setIsGestureSeeking] = useState(false);
    const [gestureSeekTime, setGestureSeekTime] = useState(0);
    const [gestureSeekOffset, setGestureSeekOffset] = useState(0);
    const [brightness, setBrightness] = useState(0);
    const [showBrightnessIndicator, setShowBrightnessIndicator] = useState(false);
    const [volume, setVolume] = useState(1);
    const [showVolumeIndicator, setShowVolumeIndicator] = useState(false);

    // Refs for PanResponder to access current values without re-binding
    const currentTimeRef = useRef(0);
    const durationRef = useRef(0);
    const isGestureSeekingRef = useRef(false);
    const lastTapTimeRef = useRef(0);
    const singleTapTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isGestureBrightnessRef = useRef(false);
    const startBrightnessRef = useRef(0);
    const isGestureVolumeRef = useRef(false);
    const startVolumeRef = useRef(0);
    const startTouchXRef = useRef(0);
    const playerHeightRef = useRef(0);
    const playerWidthRef = useRef(0);
    const playerRef = useRef<VideoPlayer | null>(null);

    // Sync refs
    useEffect(() => {
        currentTimeRef.current = currentTime;
    }, [currentTime]);

    useEffect(() => {
        durationRef.current = duration;
    }, [duration]);

    useEffect(() => {
        playerRef.current = player;
    }, [player]);

    // Initial Brightness
    useEffect(() => {
        (async () => {
            const { status } = await Brightness.requestPermissionsAsync();
            if (status === 'granted') {
                const currentBrightness = await Brightness.getBrightnessAsync();
                setBrightness(currentBrightness);
            }
        })();
    }, []);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (evt, gestureState) => {
                const width = playerWidthRef.current || Dimensions.get('window').width;
                const isHorizontal = Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dy) < 20;
                const isVerticalLeft = Math.abs(gestureState.dy) > 10 && Math.abs(gestureState.dx) < 20 && evt.nativeEvent.locationX < width * 0.25;
                const isVerticalRight = Math.abs(gestureState.dy) > 10 && Math.abs(gestureState.dx) < 20 && evt.nativeEvent.locationX > width * 0.75;
                return isHorizontal || isVerticalLeft || isVerticalRight;
            },
            onPanResponderGrant: (evt, gestureState) => {
                startTouchXRef.current = evt.nativeEvent.locationX;
                onInteract();

                // If we stole the responder (dx > 10), start seeking immediately
                if (Math.abs(gestureState.dx) > 10) {
                    setIsGestureSeeking(true);
                    isGestureSeekingRef.current = true;
                    setGestureSeekTime(currentTimeRef.current);
                    setGestureSeekOffset(0);
                }
            },
            onPanResponderMove: async (evt, gestureState) => {
                const width = playerWidthRef.current || Dimensions.get('window').width;
                const height = playerHeightRef.current || Dimensions.get('window').height;

                // Check for Brightness/Volume Gesture
                if (!isGestureSeekingRef.current && !isGestureBrightnessRef.current && !isGestureVolumeRef.current) {
                    // Brightness (Left)
                    if (Math.abs(gestureState.dy) > 10 && Math.abs(gestureState.dx) < 10 && startTouchXRef.current < width * 0.25) {
                        isGestureBrightnessRef.current = true;
                        startBrightnessRef.current = await Brightness.getBrightnessAsync();
                        setShowBrightnessIndicator(true);
                        onInteract();
                    }
                    // Volume (Right)
                    else if (Math.abs(gestureState.dy) > 10 && Math.abs(gestureState.dx) < 10 && startTouchXRef.current > width * 0.75) {
                        isGestureVolumeRef.current = true;
                        if (playerRef.current) {
                            startVolumeRef.current = playerRef.current.volume;
                        }
                        setShowVolumeIndicator(true);
                        onInteract();
                    }
                }

                if (isGestureBrightnessRef.current) {
                    const delta = -gestureState.dy / height;
                    let newBrightness = startBrightnessRef.current + delta;
                    newBrightness = Math.max(0, Math.min(1, newBrightness));
                    setBrightness(newBrightness);
                    await Brightness.setBrightnessAsync(newBrightness);
                    return;
                }

                if (isGestureVolumeRef.current && playerRef.current) {
                    const delta = -gestureState.dy / height;
                    let newVolume = startVolumeRef.current + delta;
                    newVolume = Math.max(0, Math.min(1, newVolume));
                    setVolume(newVolume);
                    playerRef.current.volume = newVolume;
                    return;
                }

                // Seek
                if (!isGestureSeekingRef.current) {
                    if (Math.abs(gestureState.dx) > 10) {
                        setIsGestureSeeking(true);
                        isGestureSeekingRef.current = true;
                        setGestureSeekTime(currentTimeRef.current);
                        setGestureSeekOffset(0);
                        onInteract();
                    }
                    return;
                }

                const seekSeconds = (gestureState.dx / width) * 90;
                let newTime = currentTimeRef.current + seekSeconds;
                newTime = Math.max(0, Math.min(newTime, durationRef.current));

                setGestureSeekTime(newTime);
                setGestureSeekOffset(seekSeconds);
            },
            onPanResponderRelease: (evt, gestureState) => {
                if (isGestureSeekingRef.current) {
                    const width = playerWidthRef.current || Dimensions.get('window').width;
                    const seekSeconds = (gestureState.dx / width) * 90;
                    let targetTime = currentTimeRef.current + seekSeconds;
                    targetTime = Math.max(0, Math.min(targetTime, durationRef.current));

                    onSeek(targetTime);

                    setIsGestureSeeking(false);
                    isGestureSeekingRef.current = false;
                    onInteract();
                } else if (isGestureBrightnessRef.current) {
                    isGestureBrightnessRef.current = false;
                    setShowBrightnessIndicator(false);
                    onInteract();
                } else if (isGestureVolumeRef.current) {
                    isGestureVolumeRef.current = false;
                    setShowVolumeIndicator(false);
                    onInteract();
                } else {
                    // Tap
                    const now = Date.now();
                    const DOUBLE_TAP_DELAY = 300;

                    if (now - lastTapTimeRef.current < DOUBLE_TAP_DELAY) {
                        // Double tap
                        if (singleTapTimeoutRef.current) {
                            clearTimeout(singleTapTimeoutRef.current);
                            singleTapTimeoutRef.current = null;
                        }
                        onTogglePlayPause();
                        lastTapTimeRef.current = 0;
                    } else {
                        // Single tap
                        lastTapTimeRef.current = now;
                        singleTapTimeoutRef.current = setTimeout(() => {
                            onToggleControls();
                            singleTapTimeoutRef.current = null;
                        }, DOUBLE_TAP_DELAY);
                    }
                }
            },
            onPanResponderTerminate: () => {
                setIsGestureSeeking(false);
                isGestureSeekingRef.current = false;
                isGestureBrightnessRef.current = false;
                setShowBrightnessIndicator(false);
                isGestureVolumeRef.current = false;
                setShowVolumeIndicator(false);
                onInteract();
            }
        })
    ).current;

    const setPlayerLayout = (width: number, height: number) => {
        playerWidthRef.current = width;
        playerHeightRef.current = height;
    };

    return {
        panHandlers: panResponder.panHandlers,
        isGestureSeeking,
        gestureSeekTime,
        gestureSeekOffset,
        brightness,
        showBrightnessIndicator,
        volume,
        showVolumeIndicator,
        setPlayerLayout
    };
}
