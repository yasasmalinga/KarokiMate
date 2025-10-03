import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useFirebaseSongs } from '@/hooks/useFirebaseSongs';
import { Song } from '@/services/database';
import { FirebaseSong } from '@/services/firebaseService';
import { songService } from '@/services/songService';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

export default function HomeScreen() {
  const router = useRouter();
  const { songs: firebaseSongs, loading, error, searchSongs, refetch } = useFirebaseSongs();
  const [filteredSongs, setFilteredSongs] = useState<FirebaseSong[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [downloadedSongs, setDownloadedSongs] = useState<Song[]>([]);

  useEffect(() => {
    loadDownloadedSongs();
  }, []);

  useEffect(() => {
    setFilteredSongs(firebaseSongs);
  }, [firebaseSongs]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredSongs(firebaseSongs);
    } else {
      const filtered = firebaseSongs.filter(song =>
        song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        song.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
        song.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredSongs(filtered);
    }
  }, [searchQuery, firebaseSongs]);

  const loadDownloadedSongs = async () => {
    try {
      console.log('📱 Loading downloaded songs from AsyncStorage...');
      const songs = await songService.getDownloadedSongs();
      console.log('📱 Downloaded songs from AsyncStorage:', songs.length);
      console.log('📱 Downloaded song IDs:', songs.map(s => s.id));
      setDownloadedSongs(songs);
    } catch (error) {
      console.error('❌ Failed to load downloaded songs:', error);
    }
  };

  const isSongDownloaded = (songId: string): boolean => {
    return downloadedSongs.some(song => song.id === songId);
  };

  const handleSongPress = (song: FirebaseSong) => {
    router.push({
      pathname: '/karaoke',
      params: { songId: song.id }
    });
  };

  const handleDownload = async (song: FirebaseSong) => {
    const isDownloaded = isSongDownloaded(song.id!);
    
    if (isDownloaded) {
      Alert.alert('Already Downloaded', `"${song.title}" is already downloaded and available offline.`);
      return;
    }
    
    try {
      console.log('🎵 Starting download process for:', song.title);
      Alert.alert('Downloading...', `Downloading "${song.title}" for offline use...`);
      
      const success = await songService.downloadFirebaseSong(song.id!);
      console.log('📥 Download result:', success);
      
      if (success) {
        console.log('✅ Download successful, refreshing data...');
        await loadDownloadedSongs(); // Refresh downloaded songs list
        await refetch();
        console.log('✅ Data refreshed, showing success message');
        Alert.alert('Success!', `"${song.title}" downloaded successfully!\n\nYou can now play it offline.`);
      } else {
        console.log('❌ Download failed');
        Alert.alert('Download Failed', `Failed to download "${song.title}".\n\nPossible causes:\n• No internet connection\n• Audio file not available\n• Storage space full\n\nCheck console for details.`);
      }
    } catch (error) {
      console.error('❌ Download error in handler:', error);
      Alert.alert('Download Error', `Failed to download "${song.title}".\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}\n\nCheck console for details.`);
    }
  };

  const renderSongItem = ({ item: song }: { item: FirebaseSong }) => {
    const isDownloaded = isSongDownloaded(song.id!);
    
    return (
      <TouchableOpacity
        style={styles.songItem}
        onPress={() => handleSongPress(song)}
      >
        <View style={styles.songInfo}>
          <ThemedText style={styles.songTitle}>{song.title}</ThemedText>
          <ThemedText style={styles.songArtist}>{song.artist}</ThemedText>
          <ThemedText style={styles.songDuration}>
            {songService.formatDuration(song.duration)}
          </ThemedText>
          {song.genre && (
            <ThemedText style={styles.songGenre}>{song.genre}</ThemedText>
          )}
          {song.difficulty && (
            <ThemedText style={styles.songDifficulty}>
              Difficulty: {song.difficulty}
            </ThemedText>
          )}
          {isDownloaded && (
            <ThemedText style={styles.downloadedIndicator}>
              📱 Downloaded - Available Offline
            </ThemedText>
          )}
        </View>
        <View style={styles.songActions}>
          <TouchableOpacity
            style={[styles.actionButton, isDownloaded && styles.downloadedButton]}
            onPress={() => handleDownload(song)}
          >
            <Ionicons
              name={isDownloaded ? "checkmark-circle" : "download-outline"}
              size={24}
              color={isDownloaded ? "#4CAF50" : "#666"}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleSongPress(song)}
          >
            <Ionicons name="play" size={24} color="#FF6B6B" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B6B" />
        <ThemedText style={styles.loadingText}>Loading songs from Firebase...</ThemedText>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <Ionicons name="alert-circle" size={64} color="#FF6B6B" />
        <ThemedText style={styles.errorText}>Error: {error}</ThemedText>
        <TouchableOpacity style={styles.retryButton} onPress={refetch}>
          <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <ThemedText type="title" style={styles.headerTitle}>KaraokeMate</ThemedText>
          <ThemedText style={styles.headerSubtitle}>
            {filteredSongs.length} song{filteredSongs.length !== 1 ? 's' : ''} from Firebase
          </ThemedText>
          <TouchableOpacity style={styles.refreshButton} onPress={refetch}>
            <Ionicons name="refresh" size={20} color="#fff" />
            <ThemedText style={styles.refreshButtonText}>Refresh</ThemedText>
          </TouchableOpacity>
        </View>
        <TouchableOpacity 
          style={styles.settingsButton}
          onPress={() => router.push('/settings')}
        >
          <Ionicons name="settings" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search songs..."
          placeholderTextColor="#666"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <FlatList
        data={filteredSongs}
        keyExtractor={(item) => item.id || Math.random().toString()}
        renderItem={renderSongItem}
        style={styles.songList}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.songListContent}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#fff',
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#FF6B6B',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#2a2a2a',
  },
  headerContent: {
    flex: 1,
  },
  settingsButton: {
    padding: 8,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF6B6B',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#ccc',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 8,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
  },
  songList: {
    flex: 1,
  },
  songListContent: {
    padding: 16,
  },
  songItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B6B',
  },
  songInfo: {
    flex: 1,
  },
  songTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  songArtist: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 2,
  },
  songDuration: {
    fontSize: 12,
    color: '#888',
  },
  songGenre: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 2,
  },
  songDifficulty: {
    fontSize: 12,
    color: '#FF9800',
    marginTop: 2,
  },
  downloadedIndicator: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 4,
    fontWeight: 'bold',
  },
  songActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  downloadedButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderRadius: 8,
  },
});
