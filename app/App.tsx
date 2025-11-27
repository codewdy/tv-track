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
  const [showMenu, setShowMenu] = useState(false);

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
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    flexDirection: 'row',
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
    width: 250,
    height: '100%',
    backgroundColor: '#fff',
    paddingTop: 50, // Safe area for status bar
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  drawerHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    marginBottom: 10,
  },
  drawerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  menuItem: {
    padding: 15,
    paddingHorizontal: 20,
  },
  menuItemText: {
    fontSize: 18,
    color: '#333',
  },
});
