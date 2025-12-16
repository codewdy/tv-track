import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, Alert, BackHandler, Modal, TextInput, FlatList, Switch, StatusBar } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useClient } from '../context/ClientProvider';
import { TVDetail as TVDetailType, Episode, TagConfig, Source } from '../types';
import VideoPlayer from './VideoPlayer';
import { useDownload } from '../context/DownloadContext';
import * as NavigationBar from 'expo-navigation-bar';
import { AuthImage } from './AuthImage';
import { API_CONFIG } from '../config';

interface Props {
    tvId: number;
    onBack: () => void;
    onFullScreenChange?: (isFullScreen: boolean) => void;
}

export default function TVDetail({ tvId, onBack, onFullScreenChange }: Props) {
    const [detail, setDetail] = useState<TVDetailType | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null);
    const [currentEpisodeIndex, setCurrentEpisodeIndex] = useState<number>(0);
    const [isFinished, setIsFinished] = useState(false);
    const [shouldAutoPlay, setShouldAutoPlay] = useState(false);
    const [showHeaderMenu, setShowHeaderMenu] = useState(false);
    const [showTagModal, setShowTagModal] = useState(false);
    const [tags, setTags] = useState<TagConfig[]>([]);
    const lastKnownPositionRef = useRef<number>(0);
    const lastKnownDurationRef = useRef<number>(0);
    const hasPlayedRef = useRef<boolean>(false);
    const { startDownload, downloads, deleteDownload, getDownload } = useDownload();
    const { fetchTV, setWatch, fetchConfig, setTag, setDownloadStatus, updateSource, searchTV } = useClient();
    const [showSourceModal, setShowSourceModal] = useState(false);
    const [sourceSearchKeyword, setSourceSearchKeyword] = useState('');
    const [searchResults, setSearchResults] = useState<Source[]>([]);
    const [searchingSource, setSearchingSource] = useState(false);
    const [showConfigModal, setShowConfigModal] = useState(false);
    const [selectedSource, setSelectedSource] = useState<Source | null>(null);
    const [enableTracking, setEnableTracking] = useState(true);
    const [isFullScreen, setIsFullScreen] = useState(false);

    useEffect(() => {
        loadData();
    }, [tvId]);

    useEffect(() => {
        hasPlayedRef.current = false;
    }, [currentEpisodeIndex]);

    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            if (isFullScreen) {
                return false;
            }

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
    }, [tvId, currentEpisodeIndex, onBack, isFullScreen]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [data, config] = await Promise.all([
                fetchTV(tvId),
                fetchConfig()
            ]);
            setDetail(data);
            setTags(config.tags);
            if (data.episodes && data.episodes.length > 0) {
                const nextIndex = data.watch.watched_episode;
                setCurrentEpisode(data.episodes[nextIndex]);
                setCurrentEpisodeIndex(nextIndex);
                setIsFinished(nextIndex >= data.episodes.length);
            }
        } catch (err: any) {
            setError(err.message || '加载剧集详情失败');
        } finally {
            setLoading(false);
        }
    };

    const handleTagUpdate = async (newTag: string) => {
        try {
            await setTag({ id: tvId, tag: newTag });
            if (detail) {
                setDetail({ ...detail, tag: newTag });
            }
            setShowTagModal(false);
        } catch (err: any) {
            Alert.alert('错误', err.message || '修改标签失败');
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

    const handleFullScreenChange = async (fullScreen: boolean) => {
        setIsFullScreen(fullScreen);
        if (fullScreen) {
            await NavigationBar.setVisibilityAsync("hidden");
        } else {
            await NavigationBar.setVisibilityAsync("visible");
        }
        if (onFullScreenChange) {
            onFullScreenChange(fullScreen);
        }
    };



    const handleVideoEnd = () => {
        if (!detail || !currentEpisode) return;

        const nextIndex = currentEpisodeIndex + 1;

        // Update status for the next episode (mark as started/unplayed)
        setWatch({
            id: tvId,
            watch: {
                watched_episode: nextIndex,
                watched_episode_time: 0,
                watched_episode_time_ratio: 0
            }
        });

        // Auto-play next episode when video ends naturally
        setShouldAutoPlay(true);

        if (nextIndex < detail.episodes.length) {
            setCurrentEpisode(detail.episodes[nextIndex]);
            setCurrentEpisodeIndex(nextIndex);
            setIsFinished(false);
        } else {
            // Finished all episodes
            setCurrentEpisodeIndex(nextIndex);
            setIsFinished(true);
            if (isFullScreen) {
                handleFullScreenChange(false);
            }
        }
    };

    const handleNextEpisode = (keepPlaying: boolean) => {
        if (!detail || !currentEpisode) return;

        const nextIndex = currentEpisodeIndex + 1;

        // Update status for the next episode
        setWatch({
            id: tvId,
            watch: {
                watched_episode: nextIndex,
                watched_episode_time: 0,
                watched_episode_time_ratio: 0
            }
        });

        // Maintain playback state
        setShouldAutoPlay(keepPlaying);

        if (nextIndex < detail.episodes.length) {
            setCurrentEpisode(detail.episodes[nextIndex]);
            setCurrentEpisodeIndex(nextIndex);
            setIsFinished(false);
        } else {
            // Finished all episodes
            setCurrentEpisodeIndex(nextIndex);
            setIsFinished(true);
            if (isFullScreen) {
                handleFullScreenChange(false);
            }
        }
    };

    const handlePreviousEpisode = (keepPlaying: boolean) => {
        if (!detail || !currentEpisode || currentEpisodeIndex <= 0) return;

        const prevIndex = currentEpisodeIndex - 1;
        const prevEpisode = detail.episodes[prevIndex];

        // Update status for the previous episode
        setWatch({
            id: tvId,
            watch: {
                watched_episode: prevIndex,
                watched_episode_time: 0,
                watched_episode_time_ratio: 0
            }
        });

        // Maintain playback state
        setShouldAutoPlay(keepPlaying);
        setCurrentEpisode(prevEpisode);
        setCurrentEpisodeIndex(prevIndex);
        setIsFinished(false);
    };

    const downloadAllEpisodes = async () => {
        if (!detail) return;

        for (let i = 0; i < detail.episodes.length; i++) {
            const episode = detail.episodes[i];
            const existingDownload = getDownload(tvId, i);

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
        setShowHeaderMenu(false);
    };

    const downloadAfterCurrent = async () => {
        if (!detail) return;

        for (let i = currentEpisodeIndex; i < detail.episodes.length; i++) {
            const episode = detail.episodes[i];
            const existingDownload = getDownload(tvId, i);

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
        setShowHeaderMenu(false);
    };

    const handleServerRedownload = async () => {
        if (!currentEpisode) return;
        try {
            await setDownloadStatus({
                id: tvId,
                episode_idx: currentEpisodeIndex,
                status: 'running'
            });
            Alert.alert('成功', '已触发服务器重新下载');
            setShowHeaderMenu(false);
        } catch (err: any) {
            Alert.alert('错误', err.message || '触发下载失败');
        }
    };

    const handleOpenSourceModal = () => {
        setSourceSearchKeyword(detail?.name || '');
        setSearchResults([]);
        setShowSourceModal(true);
        setShowHeaderMenu(false);
    };

    const handleSourceSearch = async () => {
        if (!sourceSearchKeyword.trim()) {
            Alert.alert('提示', '请输入搜索关键词');
            return;
        }

        try {
            setSearchingSource(true);
            const results = await searchTV(sourceSearchKeyword);
            const sources = results.source || [];
            setSearchResults(sources);
            if (!results.source || results.source.length === 0) {
                Alert.alert('提示', '未找到相关源');
            }
        } catch (err: any) {
            console.error('Search error:', err);
            Alert.alert('搜索失败', err.message || '无法搜索源');
        } finally {
            setSearchingSource(false);
        }
    };

    const handleSourceSelect = (source: Source) => {
        setSelectedSource(source);
        setEnableTracking(source.tracking ?? true);
        setShowConfigModal(true);
    };

    const handleConfirmSourceUpdate = async () => {
        if (!selectedSource) return;

        try {
            const sourceToUpdate = { ...selectedSource, tracking: enableTracking };
            await updateSource({
                id: tvId,
                update_downloaded: true,
                source: sourceToUpdate
            });
            Alert.alert('成功', '换源成功，正在重新加载...');
            setShowConfigModal(false);
            setShowSourceModal(false);
            await loadData();
        } catch (err: any) {
            Alert.alert('换源失败', err.message || '无法更换源');
        }
    };

    const downloadCurrentEpisode = async () => {
        if (!currentEpisode) return;

        const existingDownload = getDownload(tvId, currentEpisodeIndex);

        if (existingDownload) {
            await deleteDownload(existingDownload.id);
        }

        startDownload(
            currentEpisode.url,
            `${detail?.name} - ${currentEpisode.name}.mp4`,
            tvId,
            currentEpisodeIndex
        );
        setShowHeaderMenu(false);
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
                <Text style={styles.error}>{error || '加载失败'}</Text>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Text style={styles.backButtonText}>返回</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={[styles.container, isFullScreen && { backgroundColor: '#000' }]}>
            <StatusBar hidden={isFullScreen} />
            {!isFullScreen && (
                <View style={styles.header}>
                    <TouchableOpacity onPress={onBack} style={styles.headerBackButton}>
                        <Text style={styles.headerBackButtonText}>←</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle} numberOfLines={1}>{detail.name}</Text>
                    <TouchableOpacity onPress={() => setShowHeaderMenu(true)} style={styles.headerRightButton}>
                        <Text style={styles.headerRightButtonText}>⋮</Text>
                    </TouchableOpacity>
                </View>
            )}

            <View style={isFullScreen ? styles.videoContainerFullScreen : styles.videoContainer}>
                {isFinished ? (
                    <View style={styles.finishedContainer}>
                        <Text style={styles.finishedText}>所有剧集已观看！</Text>
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
                        onFullScreenChange={handleFullScreenChange}
                        onNext={handleNextEpisode}
                        onPrevious={handlePreviousEpisode}
                        hasPrevious={currentEpisodeIndex > 0}
                    />
                )}
            </View>

            {!isFullScreen && (
                <>
                    <View style={styles.infoContainer}>
                        <View style={styles.headerRow}>
                            <Text style={styles.title}>{detail.name}</Text>
                            <View style={styles.tagContainer}>
                                <View style={styles.tagButton}>
                                    <Text style={styles.tagButtonText}>
                                        {tags.find(t => t.tag === detail.tag)?.name || detail.tag}
                                    </Text>
                                </View>
                            </View>
                        </View>
                        <Text style={styles.subtitle}>
                            已观看: {detail.watch.watched_episode} / {detail.episodes.length}
                        </Text>
                        <View style={styles.playingRow}>
                            <Text style={styles.episodeTitle}>
                                {currentEpisode ? `正在播放: ${currentEpisode.name}` : '已看完'}
                            </Text>
                        </View>
                    </View>

                    <ScrollView style={styles.episodeList}>
                        <Text style={styles.sectionTitle}>剧集列表</Text>
                        <View style={styles.grid}>
                            {detail.episodes.map((ep, index) => {
                                const isSelected = currentEpisode?.url === ep.url;
                                const isWatched = index < detail.watch.watched_episode;
                                const downloadInfo = getDownload(tvId, index);
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
                                        {downloadInfo && (
                                            <MaterialCommunityIcons
                                                name="download"
                                                size={14}
                                                color={
                                                    downloadInfo.status === 'finished'
                                                        ? '#4CAF50'
                                                        : downloadInfo.status === 'error'
                                                            ? '#F44336'
                                                            : downloadInfo.status === 'paused'
                                                                ? '#FF9800'
                                                                : '#2196F3'
                                                }
                                                style={styles.downloadBadge}
                                            />
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </ScrollView>
                </>
            )}

            {/* Header Menu Modal */}
            <Modal
                visible={showHeaderMenu}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowHeaderMenu(false)}
            >
                <TouchableOpacity
                    style={styles.menuOverlay}
                    activeOpacity={1}
                    onPress={() => setShowHeaderMenu(false)}
                >
                    <View style={styles.headerMenuContainer}>
                        <TouchableOpacity style={styles.headerMenuItem} onPress={handleOpenSourceModal}>
                            <Text style={styles.headerMenuItemText}>换源</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.headerMenuItem} onPress={() => {
                            setShowHeaderMenu(false);
                            setShowTagModal(true);
                        }}>
                            <Text style={styles.headerMenuItemText}>修改标签</Text>
                        </TouchableOpacity>
                        {currentEpisode && (
                            <>
                                <TouchableOpacity style={styles.headerMenuItem} onPress={downloadCurrentEpisode}>
                                    <Text style={styles.headerMenuItemText}>
                                        {getDownload(tvId, currentEpisodeIndex) ? '重新缓存当前集' : '缓存当前集'}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.headerMenuItem} onPress={downloadAfterCurrent}>
                                    <Text style={styles.headerMenuItemText}>缓存当前及后续集</Text>
                                </TouchableOpacity>
                            </>
                        )}
                        <TouchableOpacity style={styles.headerMenuItem} onPress={downloadAllEpisodes}>
                            <Text style={styles.headerMenuItemText}>缓存所有集</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.headerMenuItem} onPress={handleServerRedownload}>
                            <Text style={styles.headerMenuItemText}>重新下载源</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Tag Selection Modal */}
            <Modal
                visible={showTagModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowTagModal(false)}
            >
                <TouchableOpacity
                    style={styles.menuOverlay}
                    activeOpacity={1}
                    onPress={() => setShowTagModal(false)}
                >
                    <View style={styles.tagModalContainer}>
                        <Text style={styles.modalTitle}>选择标签</Text>
                        {tags.map((tag) => (
                            <TouchableOpacity
                                key={tag.tag}
                                style={styles.tagMenuItem}
                                onPress={() => handleTagUpdate(tag.tag)}
                            >
                                <Text style={[
                                    styles.tagMenuItemText,
                                    detail.tag === tag.tag && styles.selectedTagText
                                ]}>
                                    {tag.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>

            <Modal
                visible={showSourceModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowSourceModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>换源</Text>
                            <TouchableOpacity onPress={() => setShowSourceModal(false)}>
                                <Text style={styles.modalCloseText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.searchContainer}>
                            <TextInput
                                style={styles.searchInput}
                                placeholder="输入搜索关键词"
                                value={sourceSearchKeyword}
                                onChangeText={setSourceSearchKeyword}
                                onSubmitEditing={handleSourceSearch}
                            />
                            <TouchableOpacity
                                style={styles.searchButton}
                                onPress={handleSourceSearch}
                                disabled={searchingSource}
                            >
                                <Text style={styles.searchButtonText}>
                                    {searchingSource ? '搜索中...' : '搜索'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <FlatList
                            data={searchResults}
                            keyExtractor={(item, index) => `${item.source_key}-${index}`}
                            style={styles.sourceList}
                            contentContainerStyle={{ flexGrow: 1 }}
                            renderItem={({ item }) => {
                                return (
                                    <TouchableOpacity
                                        style={styles.sourceItemContainer}
                                        onPress={() => handleSourceSelect(item)}
                                    >
                                        <AuthImage
                                            uri={item.cover_url}
                                            headers={{ Authorization: API_CONFIG.AUTH_HEADER }}
                                            style={styles.sourceItemImage}
                                            resizeMode="cover"
                                        />
                                        <View style={styles.sourceItemInfo}>
                                            <Text style={styles.sourceItemName}>{item.title || item.name}</Text>
                                            <Text style={styles.sourceItemChannel}>{item.source_key} - {item.channel_name}</Text>
                                            <Text style={styles.sourceItemUrl} numberOfLines={1}>{item.url}</Text>
                                            <Text style={styles.sourceItemEpisodes}>集数: {item.episodes.length}</Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            }}
                            ListEmptyComponent={
                                <View style={styles.emptyContainer}>
                                    <Text style={styles.emptyText}>
                                        {searchingSource ? '搜索中...' : '输入关键词搜索源'}
                                    </Text>
                                </View>
                            }
                        />
                    </View>
                </View>
            </Modal>

            {/* Config Modal */}
            <Modal
                visible={showConfigModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowConfigModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.configModalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>配置源</Text>
                            <TouchableOpacity onPress={() => setShowConfigModal(false)}>
                                <Text style={styles.modalCloseText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        {selectedSource && (
                            <View style={styles.configContent}>
                                <Text style={styles.configSourceName}>
                                    已选源: {selectedSource.name}
                                </Text>
                                <View style={styles.configRow}>
                                    <Text style={styles.configLabel}>是否追踪更新</Text>
                                    <Switch
                                        value={enableTracking}
                                        onValueChange={setEnableTracking}
                                        trackColor={{ false: "#767577", true: "#81b0ff" }}
                                        thumbColor={enableTracking ? "#007AFF" : "#f4f3f4"}
                                    />
                                </View>
                                <Text style={styles.configDescription}>
                                    开启追踪后，系统会自动检查该源的更新。
                                </Text>
                                <Text style={[styles.configLabel, { marginTop: 10 }]}>
                                    剧集列表 ({selectedSource.episodes?.length || 0})
                                </Text>
                            </View>
                        )}

                        <FlatList
                            data={selectedSource?.episodes || []}
                            renderItem={({ item }) => (
                                <View style={styles.configEpisodeItem}>
                                    <Text style={styles.configEpisodeName}>{item.name}</Text>
                                    <Text style={styles.configEpisodeUrl} numberOfLines={1}>{item.url}</Text>
                                </View>
                            )}
                            keyExtractor={(item, index) => index.toString()}
                            style={styles.configList}
                        />

                        <View style={styles.configButtons}>
                            <TouchableOpacity
                                style={[styles.configButton, styles.cancelButton]}
                                onPress={() => setShowConfigModal(false)}
                            >
                                <Text style={styles.cancelButtonText}>取消</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.configButton, styles.confirmButton]}
                                onPress={handleConfirmSourceUpdate}
                            >
                                <Text style={styles.confirmButtonText}>确认更换</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal >
        </View >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f0f0f0',
    },
    header: {
        height: 60,
        backgroundColor: '#fff',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        flex: 1,
        textAlign: 'center',
    },
    headerBackButton: {
        width: 40,
        justifyContent: 'center',
    },
    headerBackButtonText: {
        fontSize: 24,
        color: '#333',
    },
    headerRightButton: {
        width: 40,
        justifyContent: 'center',
        alignItems: 'flex-end',
    },
    headerRightButtonText: {
        fontSize: 24,
        color: '#333',
        fontWeight: 'bold',
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
    videoContainerFullScreen: {
        flex: 1,
        width: '100%',
        height: '100%',
        backgroundColor: '#000',
    },
    video: {
        flex: 1,
    },
    infoContainer: {
        padding: 15,
        backgroundColor: '#fff',
        marginBottom: 10,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        flex: 1,
        marginRight: 10,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 5,
    },
    tagContainer: {
        position: 'relative',
        zIndex: 1000,
    },
    tagButton: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        backgroundColor: '#e0e0e0',
        borderRadius: 4,
    },
    tagButtonText: {
        fontSize: 12,
        color: '#333',
    },
    sourceItemContainer: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 10,
        marginBottom: 10,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#eee',
    },
    sourceItemImage: {
        width: 60,
        height: 80,
        borderRadius: 4,
        marginRight: 10,
        backgroundColor: '#eee',
    },
    sourceItemInfo: {
        flex: 1,
    },
    sourceItemName: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    sourceItemChannel: {
        fontSize: 12,
        color: '#007AFF',
        marginBottom: 2,
    },
    sourceItemUrl: {
        fontSize: 12,
        color: '#666',
        marginBottom: 2,
    },
    sourceItemEpisodes: {
        fontSize: 12,
        color: '#333',
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
    menuOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-start',
        alignItems: 'flex-end',
    },
    headerMenuContainer: {
        backgroundColor: '#fff',
        borderRadius: 10,
        width: 200,
        paddingVertical: 5,
        marginTop: 50,
        marginRight: 10,
    },
    headerMenuItem: {
        paddingVertical: 15,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    headerMenuItemText: {
        fontSize: 16,
        color: '#333',
    },
    tagModalContainer: {
        backgroundColor: '#fff',
        borderRadius: 10,
        width: '80%',
        padding: 20,
        maxHeight: '70%',
    },
    tagMenuItem: {
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        alignItems: 'center',
    },
    tagMenuItemText: {
        fontSize: 16,
        color: '#333',
    },
    selectedTagText: {
        color: '#007AFF',
        fontWeight: 'bold',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 20,
        width: '90%',
        height: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    modalCloseText: {
        fontSize: 24,
        color: '#666',
    },
    searchContainer: {
        flexDirection: 'row',
        marginBottom: 15,
    },
    searchInput: {
        flex: 1,
        height: 40,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 5,
        paddingHorizontal: 10,
        marginRight: 10,
    },
    searchButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 20,
        justifyContent: 'center',
        borderRadius: 5,
    },
    searchButtonText: {
        color: '#fff',
        fontSize: 14,
    },
    sourceList: {
        flex: 1,
        minHeight: 200,
    },
    sourceItem: {
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    sourceName: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    sourceInfo: {
        fontSize: 12,
        color: '#666',
    },
    emptyContainer: {
        padding: 20,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 14,
        color: '#999',
    },
    configModalContainer: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 20,
        width: '85%',
        maxHeight: '80%',
    },
    configList: {
        marginBottom: 10,
    },
    configEpisodeItem: {
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    configEpisodeName: {
        fontSize: 14,
        color: '#333',
        marginBottom: 2,
    },
    configEpisodeUrl: {
        fontSize: 12,
        color: '#999',
    },
    configContent: {
        marginBottom: 20,
    },
    configSourceName: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 15,
        color: '#333',
    },
    configRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    configLabel: {
        fontSize: 16,
        color: '#333',
    },
    configDescription: {
        fontSize: 12,
        color: '#666',
        marginTop: 5,
    },
    configButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    configButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 5,
        alignItems: 'center',
        marginHorizontal: 5,
    },
    cancelButton: {
        backgroundColor: '#f5f5f5',
        borderWidth: 1,
        borderColor: '#ddd',
    },
    confirmButton: {
        backgroundColor: '#007AFF',
    },
    cancelButtonText: {
        color: '#666',
        fontSize: 16,
    },
    confirmButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    downloadBadge: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        zIndex: 10,
    },
});
