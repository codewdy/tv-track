import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Text } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import TVList from './components/TVList';
import TVDetail from './components/TVDetail';
import DownloadList from './components/DownloadList';
import AddTV from './components/AddTV';
import DownloadMonitor from './components/DownloadMonitor';
import ErrorList from './components/ErrorList';
import { DownloadProvider } from './context/DownloadContext';
import { ClientProvider } from './context/ClientProvider';
import { AppErrorProvider } from './context/AppErrorContext';
import AppErrorOverlay from './components/AppErrorOverlay';
import { TouchableOpacity } from 'react-native';

import { useClient } from './context/ClientProvider';

function MainContent() {
  const [selectedTVId, setSelectedTVId] = useState<number | null>(null);
  const [showDownloads, setShowDownloads] = useState(false);
  const [showAddTV, setShowAddTV] = useState(false);
  const [showDownloadMonitor, setShowDownloadMonitor] = useState(false);
  const [showErrorList, setShowErrorList] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const { isOffline, toggleOfflineMode } = useClient();

  return (
    <>
      {showDownloads ? (
        <DownloadList onBack={() => setShowDownloads(false)} />
      ) : showAddTV ? (
        <AddTV onBack={() => setShowAddTV(false)} />
      ) : showDownloadMonitor ? (
        <DownloadMonitor onBack={() => setShowDownloadMonitor(false)} />
      ) : showErrorList ? (
        <ErrorList onBack={() => setShowErrorList(false)} />
      ) : selectedTVId ? (
        <TVDetail tvId={selectedTVId} onBack={() => setSelectedTVId(null)} />
      ) : (
        <>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setShowMenu(!showMenu)} style={styles.menuButton}>
              <Text style={styles.menuButtonText}>☰</Text>
            </TouchableOpacity>
            <View style={styles.titleContainer}>
              <Text style={styles.headerTitle}>
                {isOffline ? '追番小助手 (离线)' : '追番小助手'}
              </Text>
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
                  <Text style={styles.drawerTitle}>菜单</Text>
                </View>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    setShowMenu(false);
                    setShowDownloads(true);
                  }}
                >
                  <Text style={styles.menuItemText}>本地缓存</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    setShowMenu(false);
                    setShowAddTV(true);
                  }}
                >
                  <Text style={styles.menuItemText}>添加剧集</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    setShowMenu(false);
                    setShowDownloadMonitor(true);
                  }}
                >
                  <Text style={styles.menuItemText}>下载监控</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    toggleOfflineMode();
                    // Don't close menu immediately so user can see change, or close it? 
                    // Let's keep it open or close it. User didn't specify. 
                    // Let's close it to be consistent.
                    setShowMenu(false);
                  }}
                >
                  <Text style={styles.menuItemText}>
                    {isOffline ? '切换到在线模式' : '切换到离线模式'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <TVList
            onSelect={setSelectedTVId}
            onErrorClick={() => setShowErrorList(true)}
          />
        </>
      )}
    </>
  );
}

export default function App() {
  return (
    <DownloadProvider>
      <SafeAreaProvider>
        <SafeAreaView style={styles.container}>
          <AppErrorProvider>
            <ClientProvider>
              <MainContent />
            </ClientProvider>
            <AppErrorOverlay />
          </AppErrorProvider>
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
