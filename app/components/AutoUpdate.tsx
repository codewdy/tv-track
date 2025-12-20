import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Alert, ActivityIndicator } from 'react-native';
import { StyleSheet, View, Text } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { autoUpdateManager } from '../utils/AutoUpdateManager';

// 定义组件暴露的方法类型
export interface AutoUpdateRef {
  checkForUpdates: () => void;
}

const AutoUpdate = forwardRef<AutoUpdateRef>((props, ref) => {
  const [checkingForUpdates, setCheckingForUpdates] = useState(true);
  const [downloadingUpdate, setDownloadingUpdate] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  // 检查更新的核心逻辑
  const checkAndUpdate = async (isManual = false) => {
    try {
      setCheckingForUpdates(true);

      let result;
      if (isManual) {
        // 手动检查时忽略时间间隔
        result = await autoUpdateManager.checkForUpdates();
        await autoUpdateManager.saveLastCheckTime();
      } else {
        // 自动检查时考虑时间间隔
        result = await autoUpdateManager.checkForUpdatesWithInterval();
        if (result === null) {
          // 未到检查时间，不进行后续操作
          return;
        }
      }

      const { hasUpdate, latestVersion } = result;

      if (hasUpdate) {
        Alert.alert(
          '发现新版本',
          `检测到新版本 ${latestVersion}，是否立即更新？`,
          [
            { text: '稍后', onPress: () => console.log('Update later') },
            {
              text: '立即更新',
              onPress: async () => {
                try {
                  setDownloadingUpdate(true);
                  autoUpdateManager.setDownloadProgressCallback((progress) => {
                    setDownloadProgress(progress);
                  });

                  const apkUri = await autoUpdateManager.downloadUpdate();
                  Alert.alert(
                    '下载完成',
                    '更新包已下载完成，是否立即安装？',
                    [
                      { text: '稍后安装', onPress: () => setDownloadingUpdate(false) },
                      {
                        text: '立即安装',
                        onPress: async () => {
                          await autoUpdateManager.installUpdate(apkUri);
                          setDownloadingUpdate(false);
                        }
                      }
                    ]
                  );
                } catch (error) {
                  console.error('Error downloading update:', error);
                  Alert.alert('下载失败', '更新包下载失败，请重试');
                  setDownloadingUpdate(false);
                }
              }
            }
          ]
        );
      } else if (isManual) {
        Alert.alert('已是最新版本', '您当前使用的是最新版本');
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
      if (isManual) {
        Alert.alert('检查失败', '检查更新失败，请稍后重试');
      } else {
        // 自动检查失败时静默处理，不影响用户使用
      }
    } finally {
      setCheckingForUpdates(false);
    }
  };

  // 应用启动时自动检查更新
  useEffect(() => {
    // 检查是否在Expo Go环境下运行
    const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

    // 仅在非Expo Go环境下执行自动检查
    if (!isExpoGo) {
      // 延迟检查更新，让应用先加载完成
      const timer = setTimeout(() => {
        checkAndUpdate(false);
      }, 3000);

      return () => clearTimeout(timer);
    } else {
      // 在Expo Go环境下，直接设置检查状态为false
      setCheckingForUpdates(false);
    }
  }, []);

  // 暴露手动检查方法给父组件
  useImperativeHandle(ref, () => ({
    checkForUpdates: () => checkAndUpdate(true)
  }));

  return (
    <>
      {/* 下载进度指示器 */}
      {downloadingUpdate && (
        <View style={styles.downloadOverlay}>
          <View style={styles.downloadContainer}>
            <Text style={styles.downloadTitle}>正在下载更新</Text>
            <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${downloadProgress * 100}%` }]} />
            </View>
            <Text style={styles.progressText}>{Math.round(downloadProgress * 100)}%</Text>
          </View>
        </View>
      )}
    </>
  );
});

const styles = StyleSheet.create({
  downloadOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  downloadContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    width: '80%',
    alignItems: 'center',
  },
  downloadTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  loader: {
    marginBottom: 20,
  },
  progressBar: {
    width: '100%',
    height: 10,
    backgroundColor: '#e0e0e0',
    borderRadius: 5,
    marginBottom: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 5,
  },
  progressText: {
    fontSize: 16,
    color: '#666',
  },
});

export default AutoUpdate;