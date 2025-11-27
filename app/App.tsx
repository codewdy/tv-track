import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Text } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import TVList from './components/TVList';
import TVDetail from './components/TVDetail';
import DownloadList from './components/DownloadList';
import { DownloadProvider } from './context/DownloadContext';
import { ClientProvider } from './context/ClientProvider';
import { TouchableOpacity } from 'react-native';

export default function App() {
  const [selectedTVId, setSelectedTVId] = useState<number | null>(null);
  const [showDownloads, setShowDownloads] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  return (
    <DownloadProvider>
      <SafeAreaProvider>
        <SafeAreaView style={styles.container}>
          <ClientProvider>
            {showDownloads ? (
              <DownloadList onBack={() => setShowDownloads(false)} />
            ) : selectedTVId ? (
              <TVDetail tvId={selectedTVId} onBack={() => setSelectedTVId(null)} />
            ) : (
              <>
                <View style={styles.header}>
                  <TouchableOpacity onPress={() => setShowMenu(!showMenu)} style={styles.menuButton}>
                    <Text style={styles.menuButtonText}>☰</Text>
                  </TouchableOpacity>
                  <View style={styles.titleContainer}>
                    <Text style={styles.headerTitle}>追番小助手</Text>
                  </View>
                  <View style={styles.headerRight} />
                </View>

                {showMenu && (
                  <View style={styles.menuContainer}>
                    <TouchableOpacity
                      style={styles.backdrop}
                      activeOpacity={1}
                      onPress={() => setShowMenu(false)}
                    />
                    <View style={styles.drawer}>
                      <View style={styles.drawerHeader}>
                        <Text style={styles.drawerTitle}>Menu</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => {
                          setShowMenu(false);
                          setShowDownloads(true);
                        }}
                      >
                        <Text style={styles.menuItemText}>Downloads</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                <TVList onSelect={setSelectedTVId} />
              </>
            )}
          </ClientProvider>
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
    height: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    zIndex: 1,
  },
  menuButton: {
    padding: 5,
    width: 40,
  },
  menuButtonText: {
    fontSize: 24,
    color: '#333',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerRight: {
    width: 40,
  },
  menuContainer: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  drawer: {
    backgroundColor: '#fff',
    width: 250,
    height: '100%',
    padding: 20,
  },
  drawerHeader: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 10,
  },
  drawerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  menuItem: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  menuItemText: {
    fontSize: 16,
    color: '#333',
  },
});
