import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { fetchMonitor } from '../api/client';
import { TV } from '../types';
import { AuthImage } from './AuthImage';
import { API_CONFIG } from '../config';

export default function TVList() {
    const [tvs, setTvs] = useState<TV[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadData = async () => {
        try {
            setError(null);
            const data = await fetchMonitor('');
            setTvs(data.tvs);
        } catch (err: any) {
            setError(err.message || 'Failed to load TV list');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const renderItem = ({ item }: { item: TV }) => {
        const imageUrl = item.icon_url.startsWith('http')
            ? item.icon_url
            : `${API_CONFIG.BASE_URL}${item.icon_url}`;

        return (
            <View style={styles.card}>
                <AuthImage
                    uri={imageUrl}
                    headers={{ Authorization: API_CONFIG.AUTH_HEADER }}
                    style={styles.cover}
                    resizeMode="cover"
                />
                <View style={styles.info}>
                    <Text style={styles.title} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.tag}>{item.tag}</Text>
                    <Text style={styles.episodes}>
                        Episodes: {item.watch.watched_episode} / {item.total_episodes}
                    </Text>
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#0000ff" />
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.center}>
                <Text style={styles.error}>{error}</Text>
            </View>
        );
    }

    return (
        <FlatList
            data={tvs}
            renderItem={renderItem}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.list}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
        />
    );
}

const styles = StyleSheet.create({
    list: {
        padding: 10,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    card: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 8,
        marginBottom: 10,
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.41,
    },
    cover: {
        width: 80,
        height: 120,
    },
    info: {
        flex: 1,
        padding: 10,
        justifyContent: 'center',
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    tag: {
        fontSize: 12,
        color: '#666',
        marginBottom: 5,
        textTransform: 'capitalize',
    },
    episodes: {
        fontSize: 12,
        color: '#333',
    },
    error: {
        color: 'red',
        fontSize: 16,
        textAlign: 'center',
    },
});
