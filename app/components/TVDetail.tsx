import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { fetchTV } from '../api/client';
import { TVDetail as TVDetailType, Episode } from '../types';
import { API_CONFIG } from '../config';

interface Props {
    tvId: number;
    onBack: () => void;
}

export default function TVDetail({ tvId, onBack }: Props) {
    const [detail, setDetail] = useState<TVDetailType | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null);

    const player = useVideoPlayer(
        currentEpisode ? getVideoUrl(currentEpisode.url) : null,
        (player) => {
            player.loop = false;
            if (currentEpisode) {
                player.play();
            }
        }
    );

    useEffect(() => {
        loadData();
    }, [tvId]);

    // Update player source when episode changes
    useEffect(() => {
        if (currentEpisode) {
            const url = getVideoUrl(currentEpisode.url);
            // expo-video player source update logic might be different, 
            // but useVideoPlayer hook often handles source changes if passed as dependency or argument.
            // However, the hook signature is useVideoPlayer(source, setup).
            // If source changes, it should update.
            // Let's verify if we need to manually replace the source.
            player.replace({
                uri: url,
                headers: { Authorization: API_CONFIG.AUTH_HEADER }
            });
            player.play();
        }
    }, [currentEpisode]);

    const loadData = async () => {
        try {
            setLoading(true);
            const data = await fetchTV(tvId);
            setDetail(data);
            if (data.episodes && data.episodes.length > 0) {
                const nextIndex = data.watch.watched_episode;
                if (nextIndex < data.episodes.length) {
                    setCurrentEpisode(data.episodes[nextIndex]);
                } else {
                    setCurrentEpisode(data.episodes[0]);
                }
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load TV details');
        } finally {
            setLoading(false);
        }
    };

    const handleEpisodePress = (episode: Episode) => {
        setCurrentEpisode(episode);
    };

    function getVideoUrl(url: string) {
        if (url.startsWith('http')) return url;
        return `${API_CONFIG.BASE_URL}${url}`;
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
                <VideoView
                    style={styles.video}
                    player={player}
                    allowsFullscreen
                    allowsPictureInPicture
                />
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
                                onPress={() => handleEpisodePress(ep)}
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
});
