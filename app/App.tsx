import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Text } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import TVList from './components/TVList';
import TVDetail from './components/TVDetail';

export default function App() {
  const [selectedTVId, setSelectedTVId] = useState<number | null>(null);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        {selectedTVId ? (
          <TVDetail tvId={selectedTVId} onBack={() => setSelectedTVId(null)} />
        ) : (
          <>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>追番小助手</Text>
            </View>
            <TVList onSelect={setSelectedTVId} />
          </>
        )}
        <StatusBar style="auto" />
      </SafeAreaView>
    </SafeAreaProvider>
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
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
});
