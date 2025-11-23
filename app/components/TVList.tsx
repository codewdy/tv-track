import React, { useEffect, useState } from 'react';
import { View, Text, SectionList, StyleSheet, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { fetchMonitor, fetchConfig } from '../api/client';
import { TV } from '../types';
import { AuthImage } from './AuthImage';
import { API_CONFIG } from '../config';

interface TVSection {
    title: string;
    data: TV[];
}

export default function TVList() {
    const [sections, setSections] = useState<TVSection[]>([]);
    const [tagMap, setTagMap] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

    const loadData = async () => {
        try {
            setError(null);
            const [monitorData, configData] = await Promise.all([
                fetchMonitor(''),
                fetchConfig()
            ]);

            const newTagMap: Record<string, string> = {};
            configData.tags.forEach(t => {
                newTagMap[t.tag] = t.name;
            });
            setTagMap(newTagMap);

            const grouped = configData.tags.map(tag => ({
                title: tag.name,
                data: monitorData.tvs.filter(tv => tv.tag === tag.tag)
            })).filter(section => section.data.length > 0);

            const knownTags = new Set(configData.tags.map(t => t.tag));
            const unknownTvs = monitorData.tvs.filter(tv => !knownTags.has(tv.tag));
            if (unknownTvs.length > 0) {
                grouped.push({ title: 'Other', data: unknownTvs });
            }

            setSections(grouped);
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

    const toggleSection = (title: string) => {
        setCollapsedSections(prev => {
            const next = new Set(prev);
            if (next.has(title)) {
                next.delete(title);
            } else {
                next.add(title);
            }
            return next;
        });
    };

    const renderItem = ({ item }: { item: TV }) => {
        const imageUrl = item.icon_url.startsWith('http')
            ? item.icon_url
            : `${API_CONFIG.BASE_URL}${item.icon_url}`;

        const showBadge = item.tag === 'watching' && item.watch.watched_episode < item.total_episodes;
        const unwatchedCount = item.total_episodes - item.watch.watched_episode;

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
                    <Text style={styles.episodes}>
                        Episodes: {item.watch.watched_episode} / {item.total_episodes}
                    </Text>
                </View>
                {showBadge && (
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{unwatchedCount}</Text>
                    </View>
                )}
            </View>
        );
    };

    const renderSectionHeader = ({ section: { title } }: { section: TVSection }) => (
        <TouchableOpacity style={styles.sectionHeaderContainer} onPress={() => toggleSection(title)}>
            <Text style={styles.sectionHeader}>{title}</Text>
            <Text style={styles.sectionArrow}>{collapsedSections.has(title) ? '▶' : '▼'}</Text>
        </TouchableOpacity>
    );

    const sectionsToRender = sections.map(section => ({
        ...section,
        data: collapsedSections.has(section.title) ? [] : section.data
    }));

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
        <SectionList
            sections={sectionsToRender}
            renderItem={renderItem}
            renderSectionHeader={renderSectionHeader}
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
    sectionHeaderContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
        paddingVertical: 8,
        paddingHorizontal: 10,
        marginTop: 10,
        marginBottom: 5,
        borderRadius: 4,
    },
    sectionHeader: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    sectionArrow: {
        fontSize: 14,
        color: '#666',
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
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
    badge: {
        backgroundColor: 'red',
        borderRadius: 12,
        minWidth: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
        paddingHorizontal: 6,
    },
    badgeText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
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
