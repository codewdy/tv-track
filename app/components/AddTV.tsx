import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, Alert, Modal, Switch, ScrollView, BackHandler } from 'react-native';
import { searchTV, addTV } from '../api/client';
import { Source, TagConfig } from '../types';
import { AuthImage } from './AuthImage';
import { API_CONFIG } from '../config';
import { useClient } from '../context/ClientProvider';

interface Props {
    onBack: () => void;
}

export default function AddTV({ onBack }: Props) {
    const { fetchConfig } = useClient();
    const [keyword, setKeyword] = useState('');
    const [results, setResults] = useState<Source[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Config Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedSource, setSelectedSource] = useState<Source | null>(null);
    const [configName, setConfigName] = useState('');
    const [configTag, setConfigTag] = useState('watching');
    const [configTracking, setConfigTracking] = useState(false);
    const [availableTags, setAvailableTags] = useState<TagConfig[]>([]);

    useEffect(() => {
        loadTags();
    }, []);

    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            onBack();
            return true;
        });

        return () => backHandler.remove();
    }, [onBack]);

    const loadTags = async () => {
        try {
            const config = await fetchConfig();
            setAvailableTags(config.tags);
        } catch (e) {
            console.error('Failed to load tags', e);
        }
    };

    const handleSearch = async () => {
        if (!keyword.trim()) return;

        setLoading(true);
        setError(null);
        try {
            const response = await searchTV(keyword);
            setResults(response.source);
        } catch (err: any) {
            setError(err.message || '搜索失败');
        } finally {
            setLoading(false);
        }
    };

    const handleAddPress = (item: Source) => {
        setSelectedSource(item);
        setConfigName(item.title || item.name);
        setConfigTag('watching');
        setConfigTracking(item.tracking);
        setModalVisible(true);
    };

    const confirmAdd = async () => {
        if (!selectedSource) return;

        setLoading(true);
        try {
            // Update source tracking status
            const sourceToAdd = { ...selectedSource, tracking: configTracking };

            await addTV({
                name: configName,
                source: sourceToAdd,
                tag: configTag
            });

            setModalVisible(false);
            Alert.alert('成功', '添加成功');
        } catch (err: any) {
            Alert.alert('错误', err.message || '添加失败');
        } finally {
            setLoading(false);
        }
    };

    const renderItem = ({ item }: { item: Source }) => (
        <TouchableOpacity style={styles.itemContainer} onPress={() => handleAddPress(item)}>
            <AuthImage
                uri={item.cover_url}
                headers={{ Authorization: API_CONFIG.AUTH_HEADER }}
                style={styles.itemImage}
                resizeMode="cover"
            />
            <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.title || item.name}</Text>
                <Text style={styles.itemChannel}>{item.source_key} - {item.channel_name}</Text>
                <Text style={styles.itemUrl} numberOfLines={1}>{item.url}</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Text style={styles.backButtonText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>添加剧集</Text>
                <View style={styles.headerRightPlaceholder} />
            </View>

            <View style={styles.searchContainer}>
                <TextInput
                    style={styles.input}
                    placeholder="输入剧集名称"
                    value={keyword}
                    onChangeText={setKeyword}
                    onSubmitEditing={handleSearch}
                    returnKeyType="search"
                />
                <TouchableOpacity style={styles.searchButton} onPress={handleSearch} disabled={loading}>
                    {loading ? (
                        <ActivityIndicator color="#fff" size="small" />
                    ) : (
                        <Text style={styles.searchButtonText}>搜索</Text>
                    )}
                </TouchableOpacity>
            </View>

            {error && <Text style={styles.errorText}>{error}</Text>}

            <FlatList
                data={results}
                renderItem={renderItem}
                keyExtractor={(item, index) => index.toString()}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    !loading && results.length === 0 ? (
                        <Text style={styles.emptyText}>暂无搜索结果</Text>
                    ) : null
                }
            />

            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>配置剧集</Text>

                        <ScrollView style={styles.modalScroll}>
                            <Text style={styles.label}>名称</Text>
                            <TextInput
                                style={styles.input}
                                value={configName}
                                onChangeText={setConfigName}
                            />

                            <Text style={styles.label}>标签</Text>
                            <View style={styles.tagContainer}>
                                {availableTags.map(tag => (
                                    <TouchableOpacity
                                        key={tag.tag}
                                        style={[
                                            styles.tagButton,
                                            configTag === tag.tag && styles.tagButtonSelected
                                        ]}
                                        onPress={() => setConfigTag(tag.tag)}
                                    >
                                        <Text style={[
                                            styles.tagText,
                                            configTag === tag.tag && styles.tagTextSelected
                                        ]}>{tag.name}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <View style={styles.switchContainer}>
                                <Text style={styles.label}>追踪更新</Text>
                                <Switch
                                    value={configTracking}
                                    onValueChange={setConfigTracking}
                                />
                            </View>
                        </ScrollView>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={styles.cancelButtonText}>取消</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.confirmButton]}
                                onPress={confirmAdd}
                            >
                                <Text style={styles.confirmButtonText}>添加</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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
    searchContainer: {
        flexDirection: 'row',
        padding: 15,
        backgroundColor: '#fff',
        marginBottom: 10,
    },
    input: {
        flex: 1,
        height: 40,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 4,
        paddingHorizontal: 10,
        marginRight: 10,
        backgroundColor: '#f9f9f9',
    },
    searchButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 20,
        justifyContent: 'center',
        borderRadius: 4,
    },
    searchButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    listContent: {
        padding: 15,
    },
    itemContainer: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 10,
        marginBottom: 10,
        alignItems: 'center',
    },
    itemImage: {
        width: 60,
        height: 80,
        borderRadius: 4,
        marginRight: 10,
        backgroundColor: '#eee',
    },
    itemInfo: {
        flex: 1,
    },
    itemName: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    itemChannel: {
        fontSize: 12,
        color: '#007AFF',
        marginBottom: 2,
    },
    itemUrl: {
        fontSize: 12,
        color: '#666',
    },
    errorText: {
        color: 'red',
        textAlign: 'center',
        marginTop: 10,
    },
    emptyText: {
        textAlign: 'center',
        color: '#999',
        marginTop: 20,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 20,
        maxHeight: '80%',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10,
        textAlign: 'center',
    },
    modalScroll: {
        marginBottom: 10,
    },
    label: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 10,
        marginTop: 10,
    },
    tagContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    tagButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: '#f0f0f0',
        marginRight: 10,
        marginBottom: 10,
    },
    tagButtonSelected: {
        backgroundColor: '#007AFF',
    },
    tagText: {
        color: '#333',
    },
    tagTextSelected: {
        color: '#fff',
    },
    switchContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 20,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
    },
    modalButton: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginHorizontal: 5,
    },
    cancelButton: {
        backgroundColor: '#f0f0f0',
    },
    confirmButton: {
        backgroundColor: '#007AFF',
    },
    cancelButtonText: {
        color: '#333',
        fontWeight: 'bold',
    },
    confirmButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
});
