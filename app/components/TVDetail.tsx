import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { fetchTV, setWatch } from '../api/client';
import { TVDetail as TVDetailType, Episode } from '../types';
import VideoPlayer from './VideoPlayer';

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

    useEffect(() => {
        loadData();
    }, [tvId]);

    const loadData = async () => {
        try {
            setLoading(true);
            const data = await fetchTV(tvId);
            setDetail(data);
            if (data.episodes && data.episodes.length > 0) {
                const nextIndex = data.watch.watched_episode;
                if (nextIndex < data.episodes.length) {
                    setCurrentEpisode(data.episodes[nextIndex]);
                    setCurrentEpisodeIndex(nextIndex);
                } else {
                    setCurrentEpisode(data.episodes[0]);
                    setCurrentEpisodeIndex(0);
                }
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

    // Handle progress updates from VideoPlayer
    const handleProgressUpdate = (progress: { currentTime: number; duration: number }) => {
        const ratio = progress.currentTime / progress.duration;
        const watchData = {
            watched_episode: currentEpisodeIndex,
            watched_episode_time: progress.currentTime,
            watched_episode_time_ratio: ratio
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
            setCurrentEpisode(detail.episodes[nextIndex]);
            setCurrentEpisodeIndex(nextIndex);
        } else {
            setIsFinished(true);
        }
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
            <TouchableOpacity onPress={onBack} style={styles.headerBack}>
                <Text style={styles.headerBackText}>← Back</Text>
            </TouchableOpacity>

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
                    />
                )}
            </View>

            <View style={styles.infoContainer}>
                <Text style={styles.title}>{detail.name}</Text>
                <Text style={styles.subtitle}>
                    Watched: {detail.watch.watched_episode} / {detail.episodes.length}
                </Text>
                {currentEpisode && (
                    <Text style={styles.episodeTitle}>Playing: {currentEpisode.name}</Text>
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
    headerBack: {
        padding: 15,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    headerBackText: {
        fontSize: 16,
        color: '#007AFF',
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
        marginTop: 5,
        color: '#007AFF',
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
});
