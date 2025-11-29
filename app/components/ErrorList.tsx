import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, BackHandler, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { getErrors, clearErrors } from '../api/client';
import { SystemError } from '../types';

interface Props {
    onBack: () => void;
}

export default function ErrorList({ onBack }: Props) {
    const [criticalErrors, setCriticalErrors] = useState<SystemError[]>([]);
    const [errors, setErrors] = useState<SystemError[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchErrorList();
    }, []);

    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            onBack();
            return true;
        });

        return () => backHandler.remove();
    }, [onBack]);

    const fetchErrorList = async () => {
        try {
            setLoading(true);
            const response = await getErrors();
            setCriticalErrors(response.critical_errors);
            setErrors(response.errors);
            setError(null);
        } catch (err: any) {
            setError(err.message || '获取错误列表失败');
        } finally {
            setLoading(false);
        }
    };

    const handleClear = async (id: number) => {
        try {
            await clearErrors([id]);
            await fetchErrorList();
        } catch (err: any) {
            Alert.alert('错误', err.message || '清除失败');
        }
    };

    const handleClearAll = async () => {
        const allIds = [...criticalErrors, ...errors].map(e => e.id);
        if (allIds.length === 0) return;

        Alert.alert(
            '确认清除',
            '确定要清除所有错误记录吗？',
            [
                { text: '取消', style: 'cancel' },
                {
                    text: '确定',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await clearErrors(allIds);
                            await fetchErrorList();
                        } catch (err: any) {
                            Alert.alert('错误', err.message || '清除失败');
                        }
                    }
                }
            ]
        );
    };

    const formatDate = (timestamp: string) => {
        try {
            return new Date(timestamp).toLocaleString();
        } catch (e) {
            return timestamp;
        }
    };

    const renderError = ({ item, isCritical }: { item: SystemError, isCritical: boolean }) => (
        <View style={[styles.errorCard, isCritical ? styles.criticalCard : styles.normalCard]}>
            <View style={styles.errorHeader}>
                <View style={styles.titleContainer}>
                    <Text style={styles.errorTitle}>{item.title}</Text>
                    <Text style={styles.errorTime}>{formatDate(item.timestamp)}</Text>
                </View>
                <TouchableOpacity
                    style={styles.clearButton}
                    onPress={() => handleClear(item.id)}
                >
                    <Text style={styles.clearButtonText}>清除</Text>
                </TouchableOpacity>
            </View>
            <Text style={styles.errorMessage}>{item.error}</Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>系统错误</Text>
                <TouchableOpacity onPress={handleClearAll} style={styles.clearAllButton}>
                    <Text style={styles.clearAllText}>清除全部</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#007AFF" />
                </View>
            ) : error ? (
                <View style={styles.center}>
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity onPress={fetchErrorList} style={styles.retryButton}>
                        <Text style={styles.retryText}>重试</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    style={styles.list}
                    data={[
                        { title: '严重错误', data: criticalErrors, isCritical: true },
                        { title: '一般错误', data: errors, isCritical: false }
                    ]}
                    keyExtractor={(item, index) => index.toString()}
                    renderItem={({ item: section }) => {
                        if (section.data.length === 0) return null;
                        return (
                            <View style={styles.section}>
                                <Text style={[styles.sectionTitle, section.isCritical ? styles.criticalTitle : styles.normalTitle]}>
                                    {section.title} ({section.data.length})
                                </Text>
                                {section.data.map((err, idx) => (
                                    <View key={idx}>
                                        {renderError({ item: err, isCritical: section.isCritical })}
                                    </View>
                                ))}
                            </View>
                        );
                    }}
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <Text style={styles.emptyText}>暂无错误信息</Text>
                        </View>
                    }
                />
            )}
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
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    list: {
        flex: 1,
        padding: 15,
    },
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 10,
        marginLeft: 4,
    },
    criticalTitle: {
        color: '#d32f2f',
    },
    normalTitle: {
        color: '#f57c00',
    },
    errorCard: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 15,
        marginBottom: 10,
        borderLeftWidth: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    criticalCard: {
        borderLeftColor: '#ff4444',
    },
    normalCard: {
        borderLeftColor: '#ffbb33',
    },
    errorHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    titleContainer: {
        flex: 1,
        marginRight: 10,
    },
    errorTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    errorTime: {
        fontSize: 12,
        color: '#999',
    },
    errorMessage: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
    },
    errorText: {
        color: 'red',
        marginBottom: 10,
    },
    retryButton: {
        padding: 10,
        backgroundColor: '#007AFF',
        borderRadius: 5,
    },
    retryText: {
        color: '#fff',
    },
    emptyText: {
        color: '#999',
        fontSize: 16,
    },
    clearButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: '#f0f0f0',
        borderRadius: 4,
    },
    clearButtonText: {
        fontSize: 12,
        color: '#666',
    },
    clearAllButton: {
        width: 60,
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    clearAllText: {
        fontSize: 14,
        color: '#007AFF',
    },
});
