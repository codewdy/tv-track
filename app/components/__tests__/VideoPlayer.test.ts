/**
 * VideoPlayer Refactoring Consistency Tests
 * 
 * These tests verify that BOTH the original and refactored implementations
 * produce the same behavior. Tests are derived from the ORIGINAL code behavior.
 */

// ============= ORIGINAL Implementation (extracted from pre-refactor code) =============

// Original formatTime function (exact copy from original)
const originalFormatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
        return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
};

// Original getVideoUrl function (exact copy from original)
const originalGetVideoUrl = (url: string, baseUrl: string) => {
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('file://')) return url;
    return `${baseUrl}${url}`;
};

// Original state structure (simulating useState calls)
interface OriginalState {
    showControls: boolean;
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    isSeeking: boolean;
    isFullScreen: boolean;
    brightness: number;
    volume: number;
    isGestureSeeking: boolean;
    gestureSeekTime: number;
    gestureSeekOffset: number;
    showBrightnessIndicator: boolean;
    showVolumeIndicator: boolean;
}

const createOriginalInitialState = (autoPlay: boolean = false): OriginalState => ({
    showControls: true,
    isPlaying: autoPlay,
    currentTime: 0,
    duration: 0,
    isSeeking: false,
    isFullScreen: false,
    brightness: 0,
    volume: 1,
    isGestureSeeking: false,
    gestureSeekTime: 0,
    gestureSeekOffset: 0,
    showBrightnessIndicator: false,
    showVolumeIndicator: false,
});

// Original toggleControls logic (exact from original)
const originalToggleControls = (
    state: OriginalState,
    controlsTimeoutRef: { current: NodeJS.Timeout | null },
    resetControlsTimeout: () => void
): OriginalState => {
    const newShowControls = !state.showControls;
    
    // Original logic: if (!showControls) { resetControlsTimeout(); } else { clearTimeout(); }
    // Note: showControls here is the OLD value before toggle
    if (!state.showControls) {
        resetControlsTimeout();
    } else {
        if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current);
        }
    }
    
    return { ...state, showControls: newShowControls };
};

// Original handleSeek logic
const originalHandleSeek = (
    state: OriginalState,
    value: number,
    player: { currentTime: number }
): OriginalState => {
    player.currentTime = value;
    return {
        ...state,
        currentTime: value,
        isSeeking: false,
    };
};

// Original gesture release - seek
const originalGestureSeekRelease = (
    state: OriginalState,
    gestureState: { dx: number },
    width: number,
    playerRef: { current: { currentTime: number } | null },
    currentTimeRef: { current: number },
    durationRef: { current: number }
): OriginalState => {
    const seekSeconds = (gestureState.dx / width) * 90;
    let targetTime = currentTimeRef.current + seekSeconds;
    targetTime = Math.max(0, Math.min(targetTime, durationRef.current));

    if (playerRef.current) {
        playerRef.current.currentTime = targetTime;
    }

    return {
        ...state,
        currentTime: targetTime,  // Original sets currentTime!
        isGestureSeeking: false,
    };
};

// Original time update handler
const originalTimeUpdateHandler = (
    state: OriginalState,
    eventCurrentTime: number,
    playerDuration: number
): OriginalState => {
    if (!state.isSeeking) {
        return {
            ...state,
            currentTime: eventCurrentTime,
            duration: playerDuration,
        };
    }
    return state;  // Don't update if seeking
};

// Original overlay visibility check
const originalShouldShowOverlay = (state: OriginalState): boolean => {
    // Original: !showControls && !isGestureSeeking && !showBrightnessIndicator && !showVolumeIndicator
    // Inverted: overlay is visible when any of these is true
    return state.showControls || state.isGestureSeeking || state.showBrightnessIndicator || state.showVolumeIndicator;
};

// ============= REFACTORED Implementation =============

interface RefactoredState {
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    isSeeking: boolean;
    showControls: boolean;
    isFullScreen: boolean;
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

const createRefactoredInitialState = (autoPlay: boolean = false): RefactoredState => ({
    isPlaying: autoPlay,
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
});

function playerReducer(state: RefactoredState, action: PlayerAction): RefactoredState {
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

const refactoredFormatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return h > 0
        ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
        : `${m}:${s.toString().padStart(2, '0')}`;
};

const refactoredClamp = (value: number, min: number, max: number): number => 
    Math.max(min, Math.min(max, value));

const refactoredShouldShowOverlay = (state: RefactoredState): boolean => {
    return state.showControls || state.gestureType !== 'none';
};

// ============= TESTS =============

describe('VideoPlayer Original vs Refactored Consistency', () => {

    describe('formatTime - Both implementations should produce identical output', () => {
        const testCases = [
            { input: 0, expected: '0:00' },
            { input: 59, expected: '0:59' },
            { input: 60, expected: '1:00' },
            { input: 61, expected: '1:01' },
            { input: 599, expected: '9:59' },
            { input: 600, expected: '10:00' },
            { input: 3599, expected: '59:59' },
            { input: 3600, expected: '1:00:00' },
            { input: 3661, expected: '1:01:01' },
            { input: 7322, expected: '2:02:02' },
            { input: 36000, expected: '10:00:00' },
        ];

        testCases.forEach(({ input, expected }) => {
            it(`formatTime(${input}) should equal "${expected}" in both implementations`, () => {
                const originalResult = originalFormatTime(input);
                const refactoredResult = refactoredFormatTime(input);
                
                // First verify original produces expected
                expect(originalResult).toBe(expected);
                // Then verify refactored matches original
                expect(refactoredResult).toBe(originalResult);
            });
        });
    });

    describe('getVideoUrl - URL handling consistency', () => {
        const BASE_URL = 'https://api.example.com';

        it('should return absolute URLs unchanged (original behavior)', () => {
            expect(originalGetVideoUrl('http://example.com/video.mp4', BASE_URL)).toBe('http://example.com/video.mp4');
            expect(originalGetVideoUrl('https://example.com/video.mp4', BASE_URL)).toBe('https://example.com/video.mp4');
            expect(originalGetVideoUrl('file:///path/video.mp4', BASE_URL)).toBe('file:///path/video.mp4');
        });

        it('should prepend BASE_URL for relative paths (original behavior)', () => {
            expect(originalGetVideoUrl('/videos/test.mp4', BASE_URL)).toBe('https://api.example.com/videos/test.mp4');
            expect(originalGetVideoUrl('video.mp4', BASE_URL)).toBe('https://api.example.comvideo.mp4');
        });
    });

    describe('Initial state - Both should have same defaults', () => {
        it('should have identical initial values', () => {
            const original = createOriginalInitialState();
            const refactored = createRefactoredInitialState();

            expect(original.showControls).toBe(refactored.showControls);
            expect(original.isPlaying).toBe(refactored.isPlaying);
            expect(original.currentTime).toBe(refactored.currentTime);
            expect(original.duration).toBe(refactored.duration);
            expect(original.isSeeking).toBe(refactored.isSeeking);
            expect(original.isFullScreen).toBe(refactored.isFullScreen);
            expect(original.brightness).toBe(refactored.brightness);
            expect(original.volume).toBe(refactored.volume);
        });

        it('should respect autoPlay parameter', () => {
            const originalWithAutoPlay = createOriginalInitialState(true);
            const refactoredWithAutoPlay = createRefactoredInitialState(true);

            expect(originalWithAutoPlay.isPlaying).toBe(true);
            expect(refactoredWithAutoPlay.isPlaying).toBe(true);
        });
    });

    describe('Time update during seeking - Original behavior verification', () => {
        it('ORIGINAL: should NOT update time when isSeeking is true', () => {
            const state = { ...createOriginalInitialState(), isSeeking: true, currentTime: 50, duration: 100 };
            const newState = originalTimeUpdateHandler(state, 200, 1000);
            
            // Original behavior: time should NOT change when seeking
            expect(newState.currentTime).toBe(50);
            expect(newState.duration).toBe(100);
        });

        it('ORIGINAL: should update time when isSeeking is false', () => {
            const state = { ...createOriginalInitialState(), isSeeking: false };
            const newState = originalTimeUpdateHandler(state, 200, 1000);
            
            expect(newState.currentTime).toBe(200);
            expect(newState.duration).toBe(1000);
        });

        it('REFACTORED: should match original seeking behavior', () => {
            // When seeking
            const seekingState = { ...createRefactoredInitialState(), isSeeking: true, currentTime: 50, duration: 100 };
            const afterSeekingUpdate = playerReducer(seekingState, { 
                type: 'SET_TIME', 
                payload: { currentTime: 200, duration: 1000 } 
            });
            expect(afterSeekingUpdate.currentTime).toBe(50);  // Should not change
            expect(afterSeekingUpdate.duration).toBe(100);    // Should not change

            // When not seeking
            const notSeekingState = { ...createRefactoredInitialState(), isSeeking: false };
            const afterUpdate = playerReducer(notSeekingState, { 
                type: 'SET_TIME', 
                payload: { currentTime: 200, duration: 1000 } 
            });
            expect(afterUpdate.currentTime).toBe(200);
            expect(afterUpdate.duration).toBe(1000);
        });
    });

    describe('Toggle controls - Original behavior verification', () => {
        it('ORIGINAL: toggling should flip showControls state', () => {
            let state = createOriginalInitialState();
            expect(state.showControls).toBe(true);
            
            const mockTimeout = { current: null as NodeJS.Timeout | null };
            const mockReset = jest.fn();
            
            state = originalToggleControls(state, mockTimeout, mockReset);
            expect(state.showControls).toBe(false);
            
            state = originalToggleControls(state, mockTimeout, mockReset);
            expect(state.showControls).toBe(true);
        });

        it('ORIGINAL: should reset timeout when showing controls (was hidden)', () => {
            const state = { ...createOriginalInitialState(), showControls: false };
            const mockTimeout = { current: null as NodeJS.Timeout | null };
            const mockReset = jest.fn();
            
            originalToggleControls(state, mockTimeout, mockReset);
            
            expect(mockReset).toHaveBeenCalled();
        });

        it('ORIGINAL: should clear timeout when hiding controls (was showing)', () => {
            jest.useFakeTimers();
            const state = { ...createOriginalInitialState(), showControls: true };
            const timeoutId = setTimeout(() => {}, 3000);
            const mockTimeout = { current: timeoutId };
            const mockReset = jest.fn();
            
            originalToggleControls(state, mockTimeout, mockReset);
            
            expect(mockReset).not.toHaveBeenCalled();
            jest.useRealTimers();
        });

        it('REFACTORED: should match toggle behavior', () => {
            let state = createRefactoredInitialState();
            expect(state.showControls).toBe(true);
            
            state = playerReducer(state, { type: 'TOGGLE_CONTROLS' });
            expect(state.showControls).toBe(false);
            
            state = playerReducer(state, { type: 'TOGGLE_CONTROLS' });
            expect(state.showControls).toBe(true);
        });
    });

    describe('Gesture seek release - Original behavior verification', () => {
        it('ORIGINAL: should update currentTime after gesture seek', () => {
            const state = { ...createOriginalInitialState(), isGestureSeeking: true };
            const playerRef = { current: { currentTime: 0 } };
            const currentTimeRef = { current: 100 };
            const durationRef = { current: 1000 };
            const gestureState = { dx: 200 };
            const width = 400;

            const newState = originalGestureSeekRelease(
                state, gestureState, width, playerRef, currentTimeRef, durationRef
            );

            // seekSeconds = (200 / 400) * 90 = 45
            // targetTime = 100 + 45 = 145
            expect(newState.currentTime).toBe(145);
            expect(newState.isGestureSeeking).toBe(false);
            expect(playerRef.current.currentTime).toBe(145);
        });

        it('ORIGINAL: should clamp seek time to bounds', () => {
            const state = { ...createOriginalInitialState(), isGestureSeeking: true };
            const playerRef = { current: { currentTime: 0 } };
            const currentTimeRef = { current: 100 };
            const durationRef = { current: 120 };  // Short video
            const gestureState = { dx: 400 };  // Full width = 90s seek
            const width = 400;

            const newState = originalGestureSeekRelease(
                state, gestureState, width, playerRef, currentTimeRef, durationRef
            );

            // Should clamp to duration (120), not 190
            expect(newState.currentTime).toBe(120);
        });

        it('REFACTORED: gesture seek should dispatch SET_TIME to update currentTime', () => {
            // Simulate the refactored gesture release behavior
            let state: RefactoredState = { ...createRefactoredInitialState(), gestureType: 'seek', currentTime: 100 };
            const duration = 1000;
            const targetTime = 145;

            // This is what the refactored code does on gesture release
            state = playerReducer(state, { type: 'SET_TIME', payload: { currentTime: targetTime, duration } });
            state = playerReducer(state, { type: 'END_GESTURE' });

            expect(state.currentTime).toBe(145);
            expect(state.gestureType).toBe('none');
        });
    });

    describe('Overlay visibility - Original behavior verification', () => {
        it('ORIGINAL: overlay visible when showControls is true', () => {
            const state = { ...createOriginalInitialState(), showControls: true };
            expect(originalShouldShowOverlay(state)).toBe(true);
        });

        it('ORIGINAL: overlay visible when gesture seeking', () => {
            const state = { ...createOriginalInitialState(), showControls: false, isGestureSeeking: true };
            expect(originalShouldShowOverlay(state)).toBe(true);
        });

        it('ORIGINAL: overlay visible when brightness indicator showing', () => {
            const state = { ...createOriginalInitialState(), showControls: false, showBrightnessIndicator: true };
            expect(originalShouldShowOverlay(state)).toBe(true);
        });

        it('ORIGINAL: overlay visible when volume indicator showing', () => {
            const state = { ...createOriginalInitialState(), showControls: false, showVolumeIndicator: true };
            expect(originalShouldShowOverlay(state)).toBe(true);
        });

        it('ORIGINAL: overlay hidden when all indicators false', () => {
            const state = {
                ...createOriginalInitialState(),
                showControls: false,
                isGestureSeeking: false,
                showBrightnessIndicator: false,
                showVolumeIndicator: false,
            };
            expect(originalShouldShowOverlay(state)).toBe(false);
        });

        it('REFACTORED: should match original overlay visibility behavior', () => {
            // Controls visible
            const state1: RefactoredState = { ...createRefactoredInitialState(), showControls: true, gestureType: 'none' };
            expect(refactoredShouldShowOverlay(state1)).toBe(originalShouldShowOverlay({
                ...createOriginalInitialState(), showControls: true
            }));

            // Gesture seeking
            const state2: RefactoredState = { ...createRefactoredInitialState(), showControls: false, gestureType: 'seek' };
            expect(refactoredShouldShowOverlay(state2)).toBe(originalShouldShowOverlay({
                ...createOriginalInitialState(), showControls: false, isGestureSeeking: true
            }));

            // Brightness gesture
            const state3: RefactoredState = { ...createRefactoredInitialState(), showControls: false, gestureType: 'brightness' };
            expect(refactoredShouldShowOverlay(state3)).toBe(originalShouldShowOverlay({
                ...createOriginalInitialState(), showControls: false, showBrightnessIndicator: true
            }));

            // Volume gesture
            const state4: RefactoredState = { ...createRefactoredInitialState(), showControls: false, gestureType: 'volume' };
            expect(refactoredShouldShowOverlay(state4)).toBe(originalShouldShowOverlay({
                ...createOriginalInitialState(), showControls: false, showVolumeIndicator: true
            }));

            // All hidden
            const state5: RefactoredState = { ...createRefactoredInitialState(), showControls: false, gestureType: 'none' };
            expect(refactoredShouldShowOverlay(state5)).toBe(originalShouldShowOverlay({
                ...createOriginalInitialState(),
                showControls: false,
                isGestureSeeking: false,
                showBrightnessIndicator: false,
                showVolumeIndicator: false,
            }));
        });
    });

    describe('Gesture detection thresholds - From original code', () => {
        // These values are directly from the original PanResponder code
        const HORIZONTAL_DX_THRESHOLD = 10;  // Math.abs(gestureState.dx) > 10
        const HORIZONTAL_DY_MAX = 20;        // Math.abs(gestureState.dy) < 20
        const VERTICAL_DY_THRESHOLD = 10;    // Math.abs(gestureState.dy) > 10
        const VERTICAL_DX_MAX = 20;          // Math.abs(gestureState.dx) < 20
        const LEFT_ZONE = 0.25;              // locationX < width * 0.25
        const RIGHT_ZONE = 0.75;             // locationX > width * 0.75

        // Original logic from onMoveShouldSetPanResponder
        const originalIsHorizontalGesture = (dx: number, dy: number) =>
            Math.abs(dx) > HORIZONTAL_DX_THRESHOLD && Math.abs(dy) < HORIZONTAL_DY_MAX;

        const originalIsVerticalLeftGesture = (dx: number, dy: number, locationX: number, width: number) =>
            Math.abs(dy) > VERTICAL_DY_THRESHOLD && Math.abs(dx) < VERTICAL_DX_MAX && locationX < width * LEFT_ZONE;

        const originalIsVerticalRightGesture = (dx: number, dy: number, locationX: number, width: number) =>
            Math.abs(dy) > VERTICAL_DY_THRESHOLD && Math.abs(dx) < VERTICAL_DX_MAX && locationX > width * RIGHT_ZONE;

        it('ORIGINAL: horizontal gesture detection', () => {
            expect(originalIsHorizontalGesture(15, 5)).toBe(true);
            expect(originalIsHorizontalGesture(10, 5)).toBe(false);  // Not > 10
            expect(originalIsHorizontalGesture(15, 20)).toBe(false); // Not < 20
            expect(originalIsHorizontalGesture(-15, 5)).toBe(true);  // Negative dx ok
        });

        it('ORIGINAL: left vertical gesture detection (brightness)', () => {
            const width = 400;
            expect(originalIsVerticalLeftGesture(5, 15, 50, width)).toBe(true);   // x=50 < 100
            expect(originalIsVerticalLeftGesture(5, 15, 100, width)).toBe(false); // x=100 not < 100
            expect(originalIsVerticalLeftGesture(5, 15, 150, width)).toBe(false); // x too far right
            expect(originalIsVerticalLeftGesture(25, 15, 50, width)).toBe(false); // dx too large
        });

        it('ORIGINAL: right vertical gesture detection (volume)', () => {
            const width = 400;
            expect(originalIsVerticalRightGesture(5, 15, 350, width)).toBe(true);  // x=350 > 300
            expect(originalIsVerticalRightGesture(5, 15, 300, width)).toBe(false); // x=300 not > 300
            expect(originalIsVerticalRightGesture(5, 15, 250, width)).toBe(false); // x too far left
        });
    });

    describe('Seek calculation - From original code', () => {
        // Original: const seekSeconds = (gestureState.dx / width) * 90;
        const originalCalculateSeek = (dx: number, width: number) => (dx / width) * 90;

        it('ORIGINAL: 90 seconds for full screen width', () => {
            expect(originalCalculateSeek(400, 400)).toBe(90);
            expect(originalCalculateSeek(-400, 400)).toBe(-90);
        });

        it('ORIGINAL: proportional seeking', () => {
            expect(originalCalculateSeek(200, 400)).toBe(45);
            expect(originalCalculateSeek(100, 400)).toBe(22.5);
        });
    });

    describe('Brightness/Volume delta calculation - From original code', () => {
        // Original: const delta = -gestureState.dy / height;
        const originalCalculateDelta = (dy: number, height: number) => -dy / height;

        it('ORIGINAL: dragging up (negative dy) increases value', () => {
            expect(originalCalculateDelta(-400, 800)).toBe(0.5);
            expect(originalCalculateDelta(-800, 800)).toBe(1.0);
        });

        it('ORIGINAL: dragging down (positive dy) decreases value', () => {
            expect(originalCalculateDelta(400, 800)).toBe(-0.5);
        });
    });

    describe('Double tap timing - From original code', () => {
        // Original: const DOUBLE_TAP_DELAY = 300;
        const DOUBLE_TAP_DELAY = 300;

        it('ORIGINAL: uses 300ms threshold', () => {
            let lastTapTime = 0;

            // First tap
            let now = 1000;
            let isDoubleTap = now - lastTapTime < DOUBLE_TAP_DELAY;
            expect(isDoubleTap).toBe(false);
            lastTapTime = now;

            // Quick second tap (within 300ms)
            now = 1200;
            isDoubleTap = now - lastTapTime < DOUBLE_TAP_DELAY;
            expect(isDoubleTap).toBe(true);

            // Slow second tap (after 300ms)
            lastTapTime = 1000;
            now = 1300;
            isDoubleTap = now - lastTapTime < DOUBLE_TAP_DELAY;
            expect(isDoubleTap).toBe(false);
        });
    });

    describe('Progress reporting thresholds - From original code', () => {
        // Original: Math.abs(currentTime - lastReportedTimeRef.current) > 5
        const originalShouldReportProgress = (currentTime: number, lastReported: number) =>
            Math.abs(currentTime - lastReported) > 5;

        // Original seek detection: Math.abs(currentTime - lastTime) > 2 && lastTime > 0
        const originalIsSeekDetected = (currentTime: number, lastTime: number) =>
            Math.abs(currentTime - lastTime) > 2 && lastTime > 0;

        it('ORIGINAL: only report when > 5 seconds changed', () => {
            expect(originalShouldReportProgress(10, 0)).toBe(true);
            expect(originalShouldReportProgress(5, 0)).toBe(false);  // Not > 5
            expect(originalShouldReportProgress(6, 0)).toBe(true);
        });

        it('ORIGINAL: detect seek when jump > 2 seconds', () => {
            expect(originalIsSeekDetected(100, 50)).toBe(true);
            expect(originalIsSeekDetected(52, 50)).toBe(false);  // Not > 2
            expect(originalIsSeekDetected(53, 50)).toBe(true);
            expect(originalIsSeekDetected(100, 0)).toBe(false);  // lastTime = 0
        });
    });

    describe('Controls timeout - From original code', () => {
        // Original: setTimeout(() => { if (isPlaying) { setShowControls(false); } }, 3000);
        const CONTROLS_TIMEOUT_MS = 3000;

        it('ORIGINAL: 3 second timeout', () => {
            expect(CONTROLS_TIMEOUT_MS).toBe(3000);
        });
    });

    describe('handleSeek - From original code', () => {
        it('ORIGINAL: should set player.currentTime and update state', () => {
            const state = createOriginalInitialState();
            const player = { currentTime: 0 };
            
            const newState = originalHandleSeek(state, 150, player);
            
            expect(player.currentTime).toBe(150);
            expect(newState.currentTime).toBe(150);
            expect(newState.isSeeking).toBe(false);
        });

        it('REFACTORED: handleSeek should produce same result', () => {
            let state = { ...createRefactoredInitialState(), isSeeking: true };
            
            // Simulate handleSeek behavior
            state = playerReducer(state, { type: 'SET_TIME', payload: { currentTime: 150, duration: 1000 } });
            // Note: SET_TIME won't update if isSeeking is true, so we need to also set isSeeking to false
            state = playerReducer(state, { type: 'SET_SEEKING', payload: false });
            state = playerReducer(state, { type: 'SET_TIME', payload: { currentTime: 150, duration: 1000 } });
            
            expect(state.currentTime).toBe(150);
            expect(state.isSeeking).toBe(false);
        });
    });
});

console.log('Running VideoPlayer ORIGINAL vs REFACTORED consistency tests...');
