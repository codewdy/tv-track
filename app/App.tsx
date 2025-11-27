import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Text } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import TVList from './components/TVList';
import TVDetail from './components/TVDetail';
import DownloadList from './components/DownloadList';
import { DownloadProvider } from './context/DownloadContext';
import { TouchableOpacity } from 'react-native';

export default function App() {
  const [selectedTVId, setSelectedTVId] = useState<number | null>(null);
  const [showDownloads, setShowDownloads] = useState(false);

  return (
    <DownloadProvider>
      <SafeAreaProvider>
        <SafeAreaView style={styles.container}>
          {showDownloads ? (
            <DownloadList onBack={() => setShowDownloads(false)} />
          ) : selectedTVId ? (
            <TVDetail tvId={selectedTVId} onBack={() => setSelectedTVId(null)} />
          ) : (
            <>
              <View style={styles.header}>
                <Text style={styles.headerTitle}>追番小助手</Text>
                <TouchableOpacity onPress={() => setShowDownloads(true)} style={styles.downloadButton}>
                  <Text style={styles.downloadButtonText}>Downloads</Text>
                </TouchableOpacity>
              </View>
              <TVList onSelect={setSelectedTVId} />
            </>
          )}
          <StatusBar style="auto" />
        </SafeAreaView>
      </SafeAreaProvider>
    </DownloadProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  header: {
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  downloadButton: {
    padding: 8,
  },
  downloadButtonText: {
    color: '#007AFF',
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
});
