import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { FirebaseSong } from '../services/firebaseService';
import { songService } from '../services/songService';

interface FirebaseSongBrowserProps {
  onSongSelect?: (song: FirebaseSong) => void;
  onDownloadComplete?: (songId: string) => void;
}

export const FirebaseSongBrowser: React.FC<FirebaseSongBrowserProps> = ({
  onSongSelect,
  onDownloadComplete,
}) => {
  const [songs, setSongs] = useState<FirebaseSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'all' | 'popular' | 'search'>('all');

  const genres = ['all', 'Pop', 'Rock', 'Jazz', 'Classical', 'Country', 'Hip-Hop', 'Electronic'];

  useEffect(() => {
    loadSongs();
  }, [viewMode, selectedGenre]);

  const loadSongs = async () => {
    try {
      setLoading(true);
      let fetchedSongs: FirebaseSong[] = [];

      switch (viewMode) {
        case 'popular':
          fetchedSongs = await songService.getPopularFirebaseSongs(20);
          break;
        case 'search':
          if (searchQuery.trim()) {
            fetchedSongs = await songService.searchFirebaseSongs(searchQuery, 20);
          } else {
            fetchedSongs = await songService.getFirebaseSongs(20);
          }
          break;
        default:
          if (selectedGenre === 'all') {
            fetchedSongs = await songService.getFirebaseSongs(20);
          } else {
            fetchedSongs = await songService.getFirebaseSongsByGenre(selectedGenre, 20);
          }
      }

      setSongs(fetchedSongs);
    } catch (error) {
      console.error('Error loading songs:', error);
      Alert.alert('Error', 'Failed to load songs');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadSongs();
    setRefreshing(false);
  };

  const handleSearch = async () => {
    if (searchQuery.trim()) {
      setViewMode('search');
    } else {
      setViewMode('all');
    }
    await loadSongs();
  };

  const handleDownload = async (song: FirebaseSong) => {
    try {
      Alert.alert(
        'Download Song',
        `Download "${song.title}" by ${song.artist}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Download',
            onPress: async () => {
              const success = await songService.downloadFirebaseSong(song.id!);
              if (success) {
                Alert.alert('Success', 'Song downloaded successfully!');
                onDownloadComplete?.(song.id!);
              } else {
                Alert.alert('Error', 'Failed to download song');
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Download error:', error);
      Alert.alert('Error', 'Failed to download song');
    }
  };

  const handleRateSong = async (song: FirebaseSong) => {
    Alert.alert(
      'Rate Song',
      `Rate "${song.title}" by ${song.artist}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: '1 Star', onPress: () => rateSong(song.id!, 1) },
        { text: '2 Stars', onPress: () => rateSong(song.id!, 2) },
        { text: '3 Stars', onPress: () => rateSong(song.id!, 3) },
        { text: '4 Stars', onPress: () => rateSong(song.id!, 4) },
        { text: '5 Stars', onPress: () => rateSong(song.id!, 5) },
      ]
    );
  };

  const rateSong = async (songId: string, rating: number) => {
    try {
      const success = await songService.rateFirebaseSong(songId, rating);
      if (success) {
        Alert.alert('Success', 'Rating submitted successfully!');
        // Refresh the song list to show updated ratings
        await loadSongs();
      } else {
        Alert.alert('Error', 'Failed to submit rating');
      }
    } catch (error) {
      console.error('Rating error:', error);
      Alert.alert('Error', 'Failed to submit rating');
    }
  };

  const renderSongItem = ({ item }: { item: FirebaseSong }) => (
    <View style={styles.songItem}>
      <View style={styles.songInfo}>
        <Text style={styles.songTitle}>{item.title}</Text>
        <Text style={styles.songArtist}>{item.artist}</Text>
        <View style={styles.songMeta}>
          <Text style={styles.songDuration}>
            {songService.formatDuration(item.duration)}
          </Text>
          <Text style={styles.songGenre}>{item.genre}</Text>
          <Text style={styles.songDifficulty}>
            {item.difficulty?.toUpperCase()}
          </Text>
        </View>
        <View style={styles.songStats}>
          <Text style={styles.statText}>
            Downloads: {item.downloadCount || 0}
          </Text>
          <Text style={styles.statText}>
            Rating: {item.rating || 0}/5
          </Text>
        </View>
      </View>
      <View style={styles.songActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onSongSelect?.(item)}
        >
          <Text style={styles.actionButtonText}>Select</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.downloadButton]}
          onPress={() => handleDownload(item)}
        >
          <Text style={styles.actionButtonText}>Download</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.rateButton]}
          onPress={() => handleRateSong(item)}
        >
          <Text style={styles.actionButtonText}>Rate</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <TextInput
        style={styles.searchInput}
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search songs..."
        onSubmitEditing={handleSearch}
      />
      
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          data={genres}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterButton,
                selectedGenre === item && styles.filterButtonSelected,
              ]}
              onPress={() => setSelectedGenre(item)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  selectedGenre === item && styles.filterButtonTextSelected,
                ]}
              >
                {item.charAt(0).toUpperCase() + item.slice(1)}
              </Text>
            </TouchableOpacity>
          )}
          showsHorizontalScrollIndicator={false}
        />
      </View>

      <View style={styles.viewModeContainer}>
        <TouchableOpacity
          style={[
            styles.viewModeButton,
            viewMode === 'all' && styles.viewModeButtonSelected,
          ]}
          onPress={() => setViewMode('all')}
        >
          <Text
            style={[
              styles.viewModeButtonText,
              viewMode === 'all' && styles.viewModeButtonTextSelected,
            ]}
          >
            All Songs
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.viewModeButton,
            viewMode === 'popular' && styles.viewModeButtonSelected,
          ]}
          onPress={() => setViewMode('popular')}
        >
          <Text
            style={[
              styles.viewModeButtonText,
              viewMode === 'popular' && styles.viewModeButtonTextSelected,
            ]}
          >
            Popular
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading songs...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={songs}
        keyExtractor={(item) => item.id!}
        renderItem={renderSongItem}
        ListHeaderComponent={renderHeader}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  listContainer: {
    padding: 16,
  },
  header: {
    marginBottom: 20,
  },
  searchInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  filterContainer: {
    marginBottom: 16,
  },
  filterButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
  },
  filterButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#333',
  },
  filterButtonTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  viewModeContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  viewModeButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  viewModeButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  viewModeButtonText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  viewModeButtonTextSelected: {
    color: '#fff',
  },
  songItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  songInfo: {
    marginBottom: 12,
  },
  songTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  songArtist: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  songMeta: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  songDuration: {
    fontSize: 14,
    color: '#888',
    marginRight: 12,
  },
  songGenre: {
    fontSize: 14,
    color: '#888',
    marginRight: 12,
  },
  songDifficulty: {
    fontSize: 14,
    color: '#888',
  },
  songStats: {
    flexDirection: 'row',
  },
  statText: {
    fontSize: 12,
    color: '#999',
    marginRight: 16,
  },
  songActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  downloadButton: {
    backgroundColor: '#34C759',
  },
  rateButton: {
    backgroundColor: '#FF9500',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default FirebaseSongBrowser;

