import React, { useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, BackHandler, Alert } from 'react-native';
import { useDownload } from '../context/DownloadContext';
import { DownloadItem } from '../utils/downloadManager';
import { fetchMonitor } from '../api/client';
import { MonitorResponse } from '../types';

const DownloadList = ({ onBack }: { onBack: () => void }) => {
    const { downloads, pauseDownload, resumeDownload, deleteDownload } = useDownload();

    const deleteWatchedDownloads = async () => {
        try {
            // 获取监控数据以获取已观看的剧集信息
            const monitorData: MonitorResponse = await fetchMonitor();

            // 创建一个映射，将tvId映射到已观看的剧集索引
            const watchedMap = new Map<number, number>();
            for (const tv of monitorData.tvs) {
                watchedMap.set(tv.id, tv.watch.watched_episode);
            }

            // 遍历所有下载项
            for (const download of downloads) {
                const { tvId, episodeId } = download;

                // 检查该剧集是否已观看
                const watchedEpisode = watchedMap.get(tvId);
                if (watchedEpisode !== undefined && episodeId < watchedEpisode) {
                    // 删除已观看的缓存
                    await deleteDownload(download.id);
                }
            }

            Alert.alert('成功', '已删除所有已观看的缓存');
        } catch (error) {
            console.error('删除已观看缓存失败:', error);
            Alert.alert('错误', '删除已观看缓存失败');
        }
    };

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

    const renderItem = ({ item }: { item: DownloadItem }) => (
        <View style={styles.itemContainer}>
            <View style={styles.itemInfo}>
                <Text style={styles.filename} numberOfLines={1}>{item.filename}</Text>
                <Text style={styles.status}>
                    {item.status} - {(item.progress * 100).toFixed(1)}%
                </Text>
                <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${item.progress * 100}%` }]} />
                </View>
            </View>
            <View style={styles.actions}>
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
    );

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
                data={downloads}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={<Text style={styles.emptyText}>暂无下载</Text>}
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
    },
    backButton: {
        width: 40,
        justifyContent: 'center',
    },
    backButtonText: {
        fontSize: 24,
        color: '#333',
    },
    headerRightPlaceholder: {
        width: 40,
    },
    deleteAllButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: '#FF3B30',
        borderRadius: 4,
    },
    deleteAllButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '500',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    listContent: {
        padding: 15,
    },
    itemContainer: {
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 8,
        marginBottom: 10,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    itemInfo: {
        marginBottom: 10,
    },
    filename: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 5,
    },
    status: {
        fontSize: 14,
        color: '#666',
        marginBottom: 5,
    },
    progressBar: {
        height: 4,
        backgroundColor: '#e0e0e0',
        borderRadius: 2,
        overflow: 'hidden',
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
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: '#007AFF',
        borderRadius: 4,
        marginLeft: 10,
    },
    deleteButton: {
        backgroundColor: '#FF3B30',
    },
    buttonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '500',
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 50,
        color: '#999',
        fontSize: 16,
    },
});

export default DownloadList;
