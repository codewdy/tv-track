import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, BackHandler, ActivityIndicator, TouchableOpacity } from 'react-native';
import { getDownloadStatus } from '../api/client';
import { DownloadTask } from '../types';

interface Props {
    onBack: () => void;
}

export default function DownloadMonitor({ onBack }: Props) {
    const [downloading, setDownloading] = useState<DownloadTask[]>([]);
    const [pending, setPending] = useState<DownloadTask[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 3000); // Refresh every 3 seconds
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            onBack();
            return true;
        });

        return () => backHandler.remove();
    }, [onBack]);

    const fetchStatus = async () => {
        try {
            setLoading(true);
            const response = await getDownloadStatus();
            setDownloading(response.downloading);
            setPending(response.pending);
            setError(null);
        } catch (err: any) {
            setError(err.message || '获取下载状态失败');
        } finally {
            setLoading(false);
        }
    };

    const parseDownloadStatus = (status: string) => {
        if (!status.startsWith('downloading:')) {
            return null;
        }

        const speedMatch = status.match(/Speed:\s*([\d.]+\s*[KMGT]?B\/s)/);
        const downloadedMatch = status.match(/Downloaded:\s*([\d.]+\s*[KMGT]?B)\s*\/\s*([\d.]+\s*[KMGT]?B)\s*\(([\d.]+)%\)/);
        const etaMatch = status.match(/ETA:\s*(\d+:\d+:\d+)/);

        return {
            speed: speedMatch ? speedMatch[1] : null,
            downloaded: downloadedMatch ? downloadedMatch[1] : null,
            total: downloadedMatch ? downloadedMatch[2] : null,
            percentage: downloadedMatch ? downloadedMatch[3] : null,
            eta: etaMatch ? etaMatch[1] : null,
        };
    };

    const renderTask = ({ item }: { item: DownloadTask }) => {
        const parsedStatus = parseDownloadStatus(item.status);

        return (
            <View style={styles.taskContainer}>
                <Text style={styles.taskResource}>{item.resource}</Text>
                {parsedStatus ? (
                    <View style={styles.statusInfo}>
                        {parsedStatus.percentage && (
                            <View style={styles.progressContainer}>
                                <View style={styles.progressBar}>
                                    <View style={[styles.progressFill, { width: `${parseFloat(parsedStatus.percentage)}%` }]} />
                                </View>
                                <Text style={styles.percentageText}>{parsedStatus.percentage}%</Text>
                            </View>
                        )}
                        <View style={styles.detailsRow}>
                            {parsedStatus.speed && (
                                <Text style={styles.detailText}>速度: {parsedStatus.speed}</Text>
                            )}
                            {parsedStatus.downloaded && parsedStatus.total && (
                                <Text style={styles.detailText}>
                                    {parsedStatus.downloaded} / {parsedStatus.total}
                                </Text>
                            )}
                            {parsedStatus.eta && (
                                <Text style={styles.detailText}>剩余: {parsedStatus.eta}</Text>
                            )}
                        </View>
                    </View>
                ) : (
                    <Text style={styles.taskStatus}>{item.status}</Text>
                )}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Text style={styles.backButtonText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>下载监控</Text>
                <View style={styles.headerRightPlaceholder} />
            </View>

            {error && <Text style={styles.errorText}>{error}</Text>}

            {loading && downloading.length === 0 && pending.length === 0 && (
                <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
            )}

            <FlatList
                data={[
                    ...(downloading.length > 0 ? [{ type: 'header', title: `正在下载 (${downloading.length})` }] : []),
                    ...downloading.map(task => ({ type: 'task', data: task, section: 'downloading' })),
                    ...(pending.length > 0 ? [{ type: 'header', title: `等待下载 (${pending.length})` }] : []),
                    ...pending.map(task => ({ type: 'task', data: task, section: 'pending' }))
                ]}
                renderItem={({ item }: any) => {
                    if (item.type === 'header') {
                        return <Text style={styles.sectionTitle}>{item.title}</Text>;
                    }
                    return renderTask({ item: item.data });
                }}
                keyExtractor={(item: any, index) =>
                    item.type === 'header' ? `header-${index}` : `${item.section}-${index}`
                }
                style={styles.list}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <Text style={styles.emptyText}>暂无下载任务</Text>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
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
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    list: {
        flex: 1,
    },
    listContent: {
        padding: 15,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 10,
        marginTop: 10,
        color: '#333',
    },
    taskContainer: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 16,
        marginBottom: 12,
    },
    taskResource: {
        fontSize: 16,
        color: '#333',
        marginBottom: 8,
    },
    taskStatus: {
        fontSize: 14,
        color: '#007AFF',
        fontWeight: 'bold',
    },
    statusInfo: {
        marginTop: 4,
    },
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    progressBar: {
        flex: 1,
        height: 6,
        backgroundColor: '#e0e0e0',
        borderRadius: 3,
        overflow: 'hidden',
        marginRight: 10,
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#007AFF',
        borderRadius: 3,
    },
    percentageText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
        width: 55,
        textAlign: 'right',
    },
    detailsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
    },
    detailText: {
        fontSize: 12,
        color: '#666',
        marginRight: 10,
    },
    errorText: {
        color: 'red',
        textAlign: 'center',
        marginTop: 10,
        padding: 10,
    },
    emptyText: {
        textAlign: 'center',
        color: '#999',
        padding: 20,
    },
    loader: {
        marginTop: 50,
    },
});
