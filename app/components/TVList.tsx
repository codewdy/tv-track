import React, { useEffect, useState } from 'react';
import { View, Text, SectionList, StyleSheet, ActivityIndicator, RefreshControl, TouchableOpacity, TextInput } from 'react-native';
import { useClient } from '../context/ClientProvider';
import { TV } from '../types';
import { AuthImage } from './AuthImage';
import { API_CONFIG } from '../config';

interface TVSection {
    title: string;
    data: TV[];
}

interface Props {
    onSelect: (id: number) => void;
    onErrorClick: () => void;
    isSearchVisible: boolean;
    setIsSearchVisible: (visible: boolean) => void;
}

export default function TVList({ onSelect, onErrorClick, isSearchVisible, setIsSearchVisible }: Props) {
    const [sections, setSections] = useState<TVSection[]>([]);
    const [originalSections, setOriginalSections] = useState<TVSection[]>([]);
    const [tagMap, setTagMap] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
    const [criticalErrors, setCriticalErrors] = useState(0);
    const [errors, setErrors] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const { fetchMonitor, fetchConfig, isOffline } = useClient();

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
                grouped.push({ title: '其他', data: unknownTvs });
            }

            if (sections.length === 0) {
                const initialCollapsed = new Set<string>();
                configData.tags.forEach(t => {
                    if (t.tag !== 'watching') {
                        initialCollapsed.add(t.name);
                    }
                });
                if (unknownTvs.length > 0) {
                    initialCollapsed.add('其他');
                }
                setCollapsedSections(initialCollapsed);
            }

            setOriginalSections(grouped);
            setSections(grouped);
            setCriticalErrors(monitorData.critical_errors || 0);
            setErrors(monitorData.errors || 0);
        } catch (err: any) {
            setError(err.message || '加载剧集列表失败');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [isOffline]);

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

    // Filter sections based on search query
    useEffect(() => {
        if (!isSearchVisible || !searchQuery.trim()) {
            setSections(originalSections);
            return;
        }

        const filtered = originalSections.map(section => {
            const filteredData = section.data.filter(item =>
                item.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
            return {
                ...section,
                data: filteredData
            };
        }).filter(section => section.data.length > 0);

        setSections(filtered);
    }, [searchQuery, originalSections, isSearchVisible]);

    const renderItem = ({ item }: { item: TV }) => {
        const imageUrl = item.icon_url.startsWith('http')
            ? item.icon_url
            : `${API_CONFIG.BASE_URL}${item.icon_url}`;

        const showBadge = item.tag === 'watching' && item.watch.watched_episode < item.total_episodes;
        const unwatchedCount = item.total_episodes - item.watch.watched_episode;

        return (
            <TouchableOpacity style={styles.card} onPress={() => onSelect(item.id)}>
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
            </TouchableOpacity>
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

    return (
        <View style={styles.container}>
            {(criticalErrors > 0 || errors > 0) && (
                <TouchableOpacity style={styles.errorHeader} onPress={onErrorClick}>
                    {criticalErrors > 0 && (
                        <View style={[styles.errorBadge, styles.criticalErrorBadge]}>
                            <Text style={styles.errorBadgeText}>严重错误: {criticalErrors}</Text>
                        </View>
                    )}
                    {errors > 0 && (
                        <View style={[styles.errorBadge, styles.normalErrorBadge]}>
                            <Text style={styles.errorBadgeText}>错误: {errors}</Text>
                        </View>
                    )}
                </TouchableOpacity>
            )}

            {isSearchVisible && (
                <View style={styles.searchContainer}>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="搜索剧集..."
                        placeholderTextColor="#999"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        clearButtonMode="while-editing"
                        autoCapitalize="none"
                        autoCorrect={false}
                        autoFocus
                    />
                </View>
            )}
            <SectionList
                sections={sectionsToRender}
                renderItem={renderItem}
                renderSectionHeader={renderSectionHeader}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={[styles.list, sectionsToRender.length === 0 && styles.center]}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                ListEmptyComponent={
                    error ? (
                        <View style={styles.center}>
                            <Text style={styles.error}>{error}</Text>
                            <Text style={styles.retry}>下拉重试</Text>
                        </View>
                    ) : (
                        <View style={styles.center}>
                            <Text>未找到剧集</Text>
                        </View>
                    )
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    errorHeader: {
        padding: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
        flexDirection: 'row',
        gap: 10,
    },
    errorBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
    },
    criticalErrorBadge: {
        backgroundColor: '#ff4444',
    },
    normalErrorBadge: {
        backgroundColor: '#ffbb33',
    },
    errorBadgeText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: 'bold',
    },
    list: {
        padding: 10,
        flexGrow: 1,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    appTitleContainer: {
        padding: 15,
        backgroundColor: '#2196F3',
        alignItems: 'center',
    },
    appTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
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
    searchContainer: {
        padding: 10,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    searchInput: {
        height: 40,
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        paddingHorizontal: 15,
        fontSize: 16,
        color: '#333',
    },
    error: {
        color: 'red',
        fontSize: 16,
        textAlign: 'center',
    },
    retry: {
        marginTop: 10,
        color: '#666',
        fontSize: 14,
    },
});
