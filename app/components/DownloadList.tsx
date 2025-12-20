import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, BackHandler, Alert } from 'react-native';
import { useDownload } from '../context/DownloadContext';
import { useClient } from '../context/ClientProvider';
import { DownloadItem } from '../utils/downloadManager';

import { MonitorResponse, TV, TVDetail } from '../types';

const DownloadList = ({ onBack }: { onBack: () => void }) => {
    const { downloads, pauseDownload, resumeDownload, deleteDownload } = useDownload();
    const { fetchTV, fetchMonitor } = useClient();
    const [tvData, setTvData] = useState<TV[]>([]);
    const [tvDownloads, setTvDownloads] = useState<Map<number, DownloadItem[]>>(new Map());

    // 添加fetchTV的缓存
    const [tvDetailCache, setTvDetailCache] = useState<Map<number, TVDetail>>(new Map());

    // 跟踪TV的展开/折叠状态，默认折叠
    const [expandedTVs, setExpandedTVs] = useState<Map<number, boolean>>(new Map());

    // 获取TV数据并分组下载项
    const fetchTVData = async () => {
        try {
            // 1. 获取所有下载的TV ID
            const downloadedTvIds = [...new Set(downloads.map(d => d.tvId))];

            if (downloadedTvIds.length === 0) {
                // 没有下载项，清空数据
                setTvData([]);
                setTvDownloads(new Map());
                return;
            }

            // 2. 按TV ID分组下载项，并按剧集ID排序
            const groupedDownloads = new Map<number, DownloadItem[]>();
            for (const download of downloads) {
                if (!groupedDownloads.has(download.tvId)) {
                    groupedDownloads.set(download.tvId, []);
                }
                groupedDownloads.get(download.tvId)?.push(download);
            }

            // 对每个TV的下载项按剧集ID升序排序
            groupedDownloads.forEach((downloads, tvId) => {
                downloads.sort((a, b) => a.episodeId - b.episodeId);
            });

            setTvDownloads(groupedDownloads);

            // 3. 获取TV详情并缓存
            const newCache = new Map(tvDetailCache);
            const tvDataArray: TV[] = [];

            const fetchPromises = downloadedTvIds.map(async (tvId) => {
                try {
                    // 从缓存或API获取TV详情
                    let tvDetail: TVDetail;
                    if (newCache.has(tvId)) {
                        tvDetail = newCache.get(tvId)!;
                    } else {
                        tvDetail = await fetchTV(tvId);
                        newCache.set(tvId, tvDetail);
                        console.log(`缓存TV ${tvId}的详情`);
                    }

                    // 创建TV对象用于列表展示
                    const tv: TV = {
                        id: tvId,
                        name: tvDetail.name,
                        tag: tvDetail.tag,
                        icon_url: '',
                        total_episodes: tvDetail.episodes.length,
                        watch: tvDetail.watch
                    };

                    tvDataArray.push(tv);
                } catch (error) {
                    console.error(`获取TV ${tvId}的详情失败:`, error);
                }
            });

            await Promise.all(fetchPromises);

            // 更新TV数据和缓存
            setTvData(tvDataArray);
            setTvDetailCache(newCache);
        } catch (error) {
            console.error('获取TV数据失败:', error);
        }
    };

    const deleteWatchedDownloads = async () => {
        try {
            // 获取所有下载的TV ID
            const downloadedTvIds = [...new Set(downloads.map(d => d.tvId))];

            // 确保所有下载的TV都有缓存的详情
            const newCache = new Map(tvDetailCache);
            const fetchPromises = downloadedTvIds.map(async (tvId) => {
                if (!newCache.has(tvId)) {
                    try {
                        const detail = await fetchTV(tvId);
                        newCache.set(tvId, detail);
                        console.log(`缓存TV ${tvId}的详情用于删除已观看缓存`);
                    } catch (error) {
                        console.error(`获取TV ${tvId}的详情失败:`, error);
                    }
                }
            });

            await Promise.all(fetchPromises);
            setTvDetailCache(newCache);

            // 遍历所有下载项
            let deletedCount = 0;
            for (const download of downloads) {
                const { tvId, episodeId } = download;

                // 检查该剧集是否已观看
                const tvDetail = newCache.get(tvId);
                if (tvDetail && episodeId < tvDetail.watch.watched_episode) {
                    // 删除已观看的缓存
                    await deleteDownload(download.id);
                    deletedCount++;
                }
            }

            console.log(`已删除${deletedCount}个已观看的缓存`);
        } catch (error) {
            console.error('删除已观看缓存失败:', error);
            console.error('删除已观看缓存失败');
        }
    };

    // 组件挂载时清空缓存
    useEffect(() => {
        // 清空缓存
        setTvDetailCache(new Map());
        console.log('缓存已清空');
    }, []);

    // 下载列表变化时重新获取数据
    useEffect(() => {
        fetchTVData();
    }, [downloads]);

    useEffect(() => {
        const backAction = () => {
            onBack();
            return true;
        };

        const backHandler = BackHandler.addEventListener(
            'hardwareBackPress',
            backAction
        );

        return () => backHandler.remove();
    }, [onBack]);

    // 获取剧集名称
    const getEpisodeName = (tvId: number, episodeId: number): string => {
        const tv = tvData.find(t => t.id === tvId);
        if (!tv) return `剧集 ${episodeId + 1}`;

        // 从缓存获取TV详情
        const tvDetail = tvDetailCache.get(tvId);
        if (tvDetail && tvDetail.episodes[episodeId]) {
            return tvDetail.episodes[episodeId].name;
        }

        // 默认名称
        return `第 ${episodeId + 1} 集`;
    };

    // 获取下载状态的中文显示
    const getStatusText = (status: string): string => {
        switch (status) {
            case 'downloading':
                return '下载中';
            case 'pending':
                return '等待中';
            case 'paused':
                return '已暂停';
            case 'finished':
                return '已完成';
            case 'error':
                return '下载失败';
            default:
                return status;
        }
    };

    // 渲染单个下载项
    const renderEpisodeItem = ({ item }: { item: DownloadItem }) => {
        const isFinished = item.status === 'finished';

        return (
            <View style={[styles.episodeItem, isFinished && styles.episodeItemFinished]}>
                {isFinished ? (
                    <View style={styles.episodeItemFinishedContent}>
                        <Text style={styles.episodeName}>{getEpisodeName(item.tvId, item.episodeId)}</Text>
                        <View style={styles.episodeItemFinishedRight}>
                            <Text style={[styles.status, isFinished && { color: '#888' }]}>{getStatusText(item.status)}</Text>
                            <TouchableOpacity onPress={() => deleteDownload(item.id)} style={[styles.button, styles.deleteButtonCompact]}>
                                <Text style={styles.buttonText}>删除</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    <>
                        <View style={styles.episodeItemFinishedContent}>
                            <Text style={styles.episodeName}>{getEpisodeName(item.tvId, item.episodeId)}</Text>
                            <View style={styles.episodeItemFinishedRight}>
                                <Text style={styles.status}>{getStatusText(item.status)}</Text>
                                {(item.status === 'downloading' || item.status === 'pending') && (
                                    <TouchableOpacity onPress={() => pauseDownload(item.id)} style={styles.button}>
                                        <Text style={styles.buttonText}>暂停</Text>
                                    </TouchableOpacity>
                                )}
                                {item.status === 'paused' && (
                                    <TouchableOpacity onPress={() => resumeDownload(item.id)} style={styles.button}>
                                        <Text style={styles.buttonText}>继续</Text>
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity onPress={() => deleteDownload(item.id)} style={[styles.button, styles.deleteButton]}>
                                    <Text style={styles.buttonText}>删除</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                        <View style={styles.progressBarContainer}>
                            <View style={styles.progressBarWithText}>
                                <View style={styles.progressBar}>
                                    <View style={[styles.progressFill, { width: `${item.progress * 100}%` }]} />
                                </View>
                                <Text style={styles.progressText}>{Math.round(item.progress * 100)}%</Text>
                            </View>
                        </View>
                    </>
                )}
            </View>
        );
    };

    // 切换TV的展开/折叠状态
    const toggleTVExpand = (tvId: number) => {
        const newExpandedTVs = new Map(expandedTVs);
        const isExpanded = newExpandedTVs.get(tvId) || false;
        newExpandedTVs.set(tvId, !isExpanded);
        setExpandedTVs(newExpandedTVs);
    };

    // 删除TV组的所有下载
    const deleteTVDownloads = async (tvId: number) => {
        try {
            const downloads = tvDownloads.get(tvId) || [];
            if (downloads.length === 0) return;

            // 遍历并删除该TV的所有下载
            for (const download of downloads) {
                await deleteDownload(download.id);
            }

            console.log('已删除所有下载');
        } catch (error) {
            console.error('删除TV组下载失败:', error);
        }
    };

    // 渲染TV分组
    const renderTVGroup = ({ item }: { item: TV }) => {
        const tvDownloadItems = tvDownloads.get(item.id) || [];
        if (tvDownloadItems.length === 0) return null;

        // 检查当前TV是否展开
        const isExpanded = expandedTVs.get(item.id) || false;

        return (
            <View style={styles.tvGroup}>
                <View style={styles.tvHeader}>
                    <TouchableOpacity
                        style={styles.tvHeaderLeft}
                        onPress={() => toggleTVExpand(item.id)}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</Text>
                        <Text style={styles.tvName}>{item.name}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => deleteTVDownloads(item.id)} style={[styles.button, styles.deleteButtonCompact]}>
                        <Text style={styles.buttonText}>删除</Text>
                    </TouchableOpacity>
                </View>
                {/* 根据展开状态显示或隐藏剧集列表 */}
                {isExpanded && (
                    <View style={styles.episodesList}>
                        {tvDownloadItems.map(downloadItem => (
                            <View key={downloadItem.id}>
                                {renderEpisodeItem({ item: downloadItem })}
                            </View>
                        ))}
                    </View>
                )}
            </View>
        );
    };

    // 获取有下载的TV列表
    const getTVsWithDownloads = () => {
        return tvData.filter(tv => {
            const downloads = tvDownloads.get(tv.id);
            return downloads && downloads.length > 0;
        });
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Text style={styles.backButtonText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.title}>本地缓存</Text>
                <TouchableOpacity onPress={deleteWatchedDownloads} style={styles.deleteAllButton}>
                    <Text style={styles.deleteAllButtonText}>删除已看</Text>
                </TouchableOpacity>
            </View>
            <FlatList
                data={getTVsWithDownloads()}
                renderItem={renderTVGroup}
                keyExtractor={item => item.id.toString()}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>暂无缓存</Text>
                        <Text style={styles.emptySubText}>您可以在剧集详情页下载喜欢的剧集</Text>
                    </View>
                }
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 15,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backButtonText: {
        fontSize: 24,
        color: '#333',
    },
    deleteAllButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: '#FF3B30',
        borderRadius: 20,
    },
    deleteAllButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '500',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    listContent: {
        padding: 15,
    },
    // TV分组样式
    tvGroup: {
        backgroundColor: '#fff',
        borderRadius: 12,
        marginBottom: 15,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        overflow: 'hidden',
    },
    tvHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        backgroundColor: '#f8f9fa',
        borderBottomWidth: 1,
        borderBottomColor: '#e9ecef',
    },
    tvHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    expandIcon: {
        fontSize: 14,
        color: '#666',
        marginRight: 8,
        fontWeight: 'bold',
    },
    tvName: {
        fontSize: 17,
        fontWeight: 'bold',
        color: '#333',
        flex: 1,
        marginRight: 10,
    },
    episodeCount: {
        fontSize: 14,
        color: '#666',
        backgroundColor: '#e9ecef',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 15,
    },
    episodesList: {
        // 去除内边距，让剧集项与TV分组边缘对齐
    },
    // 剧集样式
    episodeItem: {
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f8f9fa',
    },
    // 已完成条目的紧凑样式
    episodeItemFinished: {
        paddingVertical: 6,
        paddingHorizontal: 15,
        minHeight: 40,
    },
    episodeItemFinishedContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
    },
    episodeItemFinishedRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    progressBarContainer: {
        paddingTop: 8,
        paddingBottom: 8,
        paddingHorizontal: 0,
    },
    progressBarWithText: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    episodeItemLast: {
        borderBottomWidth: 0,
    },
    episodeInfo: {
        marginBottom: 10,
    },
    episodeName: {
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 8,
        color: '#333',
    },
    episodeDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    status: {
        fontSize: 14,
        color: '#666',
    },
    progressText: {
        fontSize: 14,
        color: '#007AFF',
        fontWeight: '500',
    },
    progressBar: {
        height: 4,
        backgroundColor: '#e9ecef',
        borderRadius: 2,
        overflow: 'hidden',
        flex: 1,
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#007AFF',
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    button: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        backgroundColor: '#007AFF',
        borderRadius: 20,
        marginLeft: 10,
    },
    deleteButton: {
        backgroundColor: '#FF3B30',
    },
    deleteButtonCompact: {
        backgroundColor: '#FF3B30',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 16,
        marginLeft: 8,
    },
    buttonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '500',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 100,
        paddingHorizontal: 30,
    },
    emptyText: {
        textAlign: 'center',
        color: '#999',
        fontSize: 18,
        marginBottom: 8,
    },
    emptySubText: {
        textAlign: 'center',
        color: '#ccc',
        fontSize: 14,
    },
});

export default DownloadList;
