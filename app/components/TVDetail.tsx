import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, Alert, BackHandler } from 'react-native';
import { useClient } from '../context/ClientProvider';
import { TVDetail as TVDetailType, Episode } from '../types';
import VideoPlayer from './VideoPlayer';
import { useDownload } from '../context/DownloadContext';

interface Props {
    tvId: number;
    onBack: () => void;
}

export default function TVDetail({ tvId, onBack }: Props) {
    const [detail, setDetail] = useState<TVDetailType | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null);
    const [currentEpisodeIndex, setCurrentEpisodeIndex] = useState<number>(0);
    const [isFinished, setIsFinished] = useState(false);
    const [shouldAutoPlay, setShouldAutoPlay] = useState(false);
    const [showDownloadMenu, setShowDownloadMenu] = useState(false);
    const lastKnownPositionRef = useRef<number>(0);
    const lastKnownDurationRef = useRef<number>(0);
    const hasPlayedRef = useRef<boolean>(false);
    const { startDownload, downloads, deleteDownload } = useDownload();
    const { fetchTV, setWatch } = useClient();

    useEffect(() => {
        loadData();
    }, [tvId]);

    useEffect(() => {
        hasPlayedRef.current = false;
    }, [currentEpisodeIndex]);

    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            if (hasPlayedRef.current && lastKnownPositionRef.current >= 0 && lastKnownDurationRef.current >= 0) {
                const ratio = lastKnownPositionRef.current / lastKnownDurationRef.current;
                const watchData = {
                    watched_episode: currentEpisodeIndex,
                    watched_episode_time: lastKnownPositionRef.current,
                    watched_episode_time_ratio: isNaN(ratio) ? 0 : ratio
                };

                setWatch({
                    id: tvId,
                    watch: watchData
                });
            }
            onBack();
            return true;
        });

        return () => {
            backHandler.remove();
        }
    }, [tvId, currentEpisodeIndex, onBack]);

    const loadData = async () => {
        try {
            setLoading(true);
            const data = await fetchTV(tvId);
            setDetail(data);
            if (data.episodes && data.episodes.length > 0) {
                const nextIndex = data.watch.watched_episode;
                setCurrentEpisode(data.episodes[nextIndex]);
                setCurrentEpisodeIndex(nextIndex);
                setIsFinished(nextIndex >= data.episodes.length);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load TV details');
        } finally {
            setLoading(false);
        }
    };

    const handleEpisodePress = (episode: Episode, index: number) => {
        setCurrentEpisode(episode);
        setCurrentEpisodeIndex(index);
        setIsFinished(false);
        setShouldAutoPlay(false); // Disable auto-play for manual selection

        // Update local detail state to reflect new watch status (time 0)
        if (detail) {
            setDetail({
                ...detail,
                watch: {
                    ...detail.watch,
                    watched_episode: index,
                    watched_episode_time: 0,
                    watched_episode_time_ratio: 0
                }
            });
        }

        // Update server
        setWatch({
            id: tvId,
            watch: {
                watched_episode: index,
                watched_episode_time: 0,
                watched_episode_time_ratio: 0
            }
        });
    };

    // Calculate initial position: only use watched_episode_time if it's the current watched episode
    const getInitialPosition = () => {
        if (!detail) return 0;
        // Only resume from saved position if we're on the watched episode
        if (currentEpisodeIndex === detail.watch.watched_episode) {
            return detail.watch.watched_episode_time;
        }
        return 0;
    };

    // Handle playing state changes
    const handlePlayingChange = (isPlaying: boolean) => {
        if (isPlaying) {
            hasPlayedRef.current = true;
        }
    };

    // Handle progress updates from VideoPlayer
    const handleProgressUpdate = (progress: { currentTime: number; duration: number }) => {
        const ratio = progress.currentTime / progress.duration;
        const watchData = {
            watched_episode: currentEpisodeIndex,
            watched_episode_time: progress.currentTime,
            watched_episode_time_ratio: isNaN(ratio) ? 0 : ratio
        };

        setWatch({
            id: tvId,
            watch: watchData
        });
    };


    const handleVideoEnd = () => {
        if (!detail || !currentEpisode) return;

        const nextIndex = currentEpisodeIndex + 1;

        // Update status for the next episode (mark as started/unplayed)
        // Even if it's the last episode, we increment the index as requested
        setWatch({
            id: tvId,
            watch: {
                watched_episode: nextIndex,
                watched_episode_time: 0,
                watched_episode_time_ratio: 0
            }
        });

        // Switch to next episode or finish
        if (nextIndex < detail.episodes.length) {
            setShouldAutoPlay(true); // Enable auto-play for automatic transition
            setCurrentEpisode(detail.episodes[nextIndex]);
            setCurrentEpisodeIndex(nextIndex);
        } else {
            setIsFinished(true);
        }
    };

    const downloadAllEpisodes = async () => {
        if (!detail) return;

        for (let i = 0; i < detail.episodes.length; i++) {
            const episode = detail.episodes[i];
            const existingDownload = downloads.find(
                d => d.tvId === tvId && d.episodeId === i
            );

            // Skip if already downloaded or downloading
            if (existingDownload && (existingDownload.status === 'finished' || existingDownload.status === 'downloading')) {
                continue;
            }

            startDownload(
                episode.url,
                `${detail.name} - ${episode.name}.mp4`,
                tvId,
                i
            );
        }
        setShowDownloadMenu(false);
    };

    const downloadAfterCurrent = async () => {
        if (!detail) return;

        for (let i = currentEpisodeIndex + 1; i < detail.episodes.length; i++) {
            const episode = detail.episodes[i];
            const existingDownload = downloads.find(
                d => d.tvId === tvId && d.episodeId === i
            );

            // Skip if already downloaded or downloading
            if (existingDownload && (existingDownload.status === 'finished' || existingDownload.status === 'downloading')) {
                continue;
            }

            startDownload(
                episode.url,
                `${detail.name} - ${episode.name}.mp4`,
                tvId,
                i
            );
        }
        setShowDownloadMenu(false);
    };

    const downloadCurrentEpisode = async () => {
        if (!currentEpisode) return;

        const existingDownload = downloads.find(
            d => d.tvId === tvId && d.episodeId === currentEpisodeIndex
        );

        if (existingDownload) {
            await deleteDownload(existingDownload.id);
        }

        startDownload(
            currentEpisode.url,
            `${detail?.name} - ${currentEpisode.name}.mp4`,
            tvId,
            currentEpisodeIndex
        );
        setShowDownloadMenu(false);
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#0000ff" />
            </View>
        );
    }

    if (error || !detail) {
        return (
            <View style={styles.center}>
                <Text style={styles.error}>{error || 'Failed to load'}</Text>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Text style={styles.backButtonText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.videoContainer}>
                {isFinished ? (
                    <View style={styles.finishedContainer}>
                        <Text style={styles.finishedText}>All episodes watched!</Text>
                    </View>
                ) : (
                    <VideoPlayer
                        episode={currentEpisode}
                        initialPosition={getInitialPosition()}
                        onProgressUpdate={handleProgressUpdate}
                        onEnd={handleVideoEnd}
                        autoPlay={shouldAutoPlay}
                        lastKnownPositionRef={lastKnownPositionRef}
                        lastKnownDurationRef={lastKnownDurationRef}
                        onPlayingChange={handlePlayingChange}
                    />
                )}
            </View>

            <View style={styles.infoContainer}>
                <Text style={styles.title}>{detail.name}</Text>
                <Text style={styles.subtitle}>
                    Watched: {detail.watch.watched_episode} / {detail.episodes.length}
                </Text>
                {currentEpisode && (
                    <View style={styles.playingRow}>
                        <Text style={styles.episodeTitle}>Playing: {currentEpisode.name}</Text>
                        <View>
                            <TouchableOpacity
                                style={styles.downloadButton}
                                onPress={() => setShowDownloadMenu(!showDownloadMenu)}
                            >
                                <Text style={styles.downloadButtonText}>Download ▼</Text>
                            </TouchableOpacity>

                            {showDownloadMenu && (
                                <>
                                    <TouchableOpacity
                                        style={styles.menuBackdrop}
                                        activeOpacity={1}
                                        onPress={() => setShowDownloadMenu(false)}
                                    />
                                    <View style={styles.downloadMenu}>
                                        <TouchableOpacity
                                            style={styles.menuItem}
                                            onPress={downloadCurrentEpisode}
                                        >
                                            <Text style={styles.menuItemText}>
                                                {downloads.find(d => d.tvId === tvId && d.episodeId === currentEpisodeIndex)
                                                    ? 'Redownload Current'
                                                    : 'Download Current'}
                                            </Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={styles.menuItem}
                                            onPress={downloadAfterCurrent}
                                        >
                                            <Text style={styles.menuItemText}>Download After Current</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={styles.menuItem}
                                            onPress={downloadAllEpisodes}
                                        >
                                            <Text style={styles.menuItemText}>Download All Episodes</Text>
                                        </TouchableOpacity>
                                    </View>
                                </>
                            )}
                        </View>
                    </View>
                )}
            </View>

            <ScrollView style={styles.episodeList}>
                <Text style={styles.sectionTitle}>Episodes</Text>
                <View style={styles.grid}>
                    {detail.episodes.map((ep, index) => {
                        const isSelected = currentEpisode?.url === ep.url;
                        const isWatched = index < detail.watch.watched_episode;
                        return (
                            <TouchableOpacity
                                key={index}
                                style={[
                                    styles.episodeItem,
                                    isSelected && styles.episodeSelected,
                                    isWatched && !isSelected && styles.episodeWatched
                                ]}
                                onPress={() => handleEpisodePress(ep, index)}
                            >
                                <Text style={[
                                    styles.episodeText,
                                    isSelected && styles.episodeTextSelected
                                ]}>
                                    {ep.name}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f0f0f0',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    videoContainer: {
        width: '100%',
        aspectRatio: 16 / 9,
        backgroundColor: '#000',
    },
    video: {
        flex: 1,
    },
    videoPlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderText: {
        color: '#fff',
    },
    infoContainer: {
        padding: 15,
        backgroundColor: '#fff',
        marginBottom: 10,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    subtitle: {
        fontSize: 14,
        color: '#666',
    },
    episodeTitle: {
        fontSize: 16,
        color: '#007AFF',
        flex: 1,
    },
    playingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 5,
    },
    downloadButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 4,
        marginLeft: 10,
    },
    downloadButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '500',
    },
    episodeList: {
        flex: 1,
        padding: 10,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        marginLeft: 5,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    episodeItem: {
        width: '18%', // 5 items per row approx
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
        margin: '1%',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    episodeSelected: {
        backgroundColor: '#007AFF',
        borderColor: '#007AFF',
    },
    episodeWatched: {
        backgroundColor: '#e0e0e0',
    },
    episodeText: {
        fontSize: 16,
        color: '#333',
    },
    episodeTextSelected: {
        color: '#fff',
        fontWeight: 'bold',
    },
    error: {
        color: 'red',
        marginBottom: 10,
    },
    backButton: {
        padding: 10,
        backgroundColor: '#007AFF',
        borderRadius: 5,
    },
    backButtonText: {
        color: '#fff',
    },
    finishedContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000',
    },
    finishedText: {
        color: '#fff',
        fontSize: 18,
        marginBottom: 20,
        fontWeight: 'bold',
    },
    menuBackdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 999,
    },
    downloadMenu: {
        position: 'absolute',
        top: 40,
        right: 0,
        backgroundColor: '#fff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
        minWidth: 200,
        zIndex: 1000,
    },
    menuItem: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    menuItemText: {
        fontSize: 14,
        color: '#333',
    },
});
