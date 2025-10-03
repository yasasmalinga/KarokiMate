import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '@/contexts/AuthContext';
import { databaseService, Recording } from '@/services/database';
import { FirebaseRecording, firebaseService } from '@/services/firebaseService';
import { shareService } from '@/services/shareService';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';

export default function RecordingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [recordings, setRecordings] = useState<(Recording | FirebaseRecording)[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    loadRecordings();
    
    // Monitor network connectivity
    const unsubscribe = NetInfo.addEventListener(state => {
      const wasOnline = isOnline;
      const nowOnline = state.isConnected ?? false;
      setIsOnline(nowOnline);
      
      console.log('🌐 Network state changed:', { wasOnline, nowOnline, state });
      
      // Reload recordings when network state changes
      if (wasOnline !== nowOnline) {
        console.log('🔄 Network changed, reloading recordings...');
        loadRecordings();
      }
    });
    
    return () => unsubscribe();
  }, []);

  // Refresh recordings when tab comes into focus
  useFocusEffect(
    useCallback(() => {
      loadRecordings();
    }, [])
  );

  const loadRecordings = async () => {
    try {
      setLoading(true);
      
      // Check current network state
      const NetInfo = require('@react-native-community/netinfo').default;
      const networkState = await NetInfo.fetch();
      const currentIsOnline = networkState.isConnected ?? false;
      
      console.log('🔍 Loading recordings:', { 
        isOnline, 
        currentIsOnline, 
        user: !!user, 
        userId: user?.uid,
        networkState: networkState 
      });
      
      if (currentIsOnline && user) {
        // When online and logged in, show only Firebase recordings
        try {
          console.log('📡 Loading Firebase recordings...');
          const firebaseRecordings = await firebaseService.getUserRecordings(user.uid);
          console.log('✅ Firebase recordings loaded:', firebaseRecordings.length);
          setRecordings(firebaseRecordings);
        } catch (error) {
          console.error('❌ Failed to load Firebase recordings:', error);
          // Fallback to local recordings if Firebase fails
          console.log('📱 Falling back to local recordings...');
          const localRecordings = await databaseService.getRecordings();
          console.log('✅ Local recordings loaded:', localRecordings.length);
          setRecordings(localRecordings);
        }
      } else {
        // When offline or not logged in, show only local recordings
        console.log('📱 Loading local recordings (offline or not logged in)...');
        const localRecordings = await databaseService.getRecordings();
        console.log('✅ Local recordings loaded:', localRecordings.length);
        setRecordings(localRecordings);
      }
    } catch (error) {
      console.error('❌ Failed to load recordings:', error);
      // Fallback to local recordings on any error
      try {
        console.log('📱 Emergency fallback to local recordings...');
        const localRecordings = await databaseService.getRecordings();
        console.log('✅ Emergency local recordings loaded:', localRecordings.length);
        setRecordings(localRecordings);
      } catch (localError) {
        console.error('❌ Failed to load local recordings:', localError);
        setRecordings([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePlayRecording = (recording: Recording) => {
    // Navigate to playback screen
    router.push({
      pathname: '/playback',
      params: { recordingId: recording.id }
    });
  };

  const handleDeleteRecording = async (recording: Recording | FirebaseRecording) => {
    Alert.alert(
      'Delete Recording',
      'Are you sure you want to delete this recording?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Check if it's a Firebase recording (has userId property)
              if ('userId' in recording) {
                // Firebase recording - delete from Firebase
                if (recording.id) {
                  await firebaseService.deleteRecording(recording.id);
                }
              } else {
                // Local recording - delete from local storage
                await databaseService.deleteRecording(recording.id);
              }
              
              await loadRecordings();
              Alert.alert('Success', 'Recording deleted');
            } catch (error) {
              console.error('Delete error:', error);
              Alert.alert('Error', 'Failed to delete recording');
            }
          },
        },
      ]
    );
  };

  const handleShareRecording = async (recording: Recording | FirebaseRecording) => {
    try {
      const songTitle = (recording as any).songTitle || (recording as any).title || 'Unknown Song';
      const artist = (recording as any).songArtist || (recording as any).artist || 'Unknown Artist';
      
      // Get the audio path/URL based on recording type
      const audioPath = 'audioPath' in recording ? recording.audioPath : recording.audioUrl;
      
      const success = await shareService.shareRecording(
        audioPath,
        songTitle,
        artist
      );
      
      if (success && 'audioPath' in recording) {
        // Only update sync status for local recordings
        await databaseService.updateRecordingSyncStatus(recording.id, true);
        await loadRecordings();
      }
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('Error', 'Failed to share recording');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const renderRecordingItem = ({ item: recording }: { item: Recording | FirebaseRecording }) => {
    // Check if it's a Firebase recording
    const isFirebaseRecording = 'audioUrl' in recording;
    
    return (
      <View style={styles.recordingItem}>
        <View style={styles.recordingInfo}>
          <ThemedText style={styles.recordingTitle}>
            {isFirebaseRecording 
              ? (recording as FirebaseRecording).songTitle || 'Unknown Song'
              : (recording as Recording).title || 'Unknown Song'
            }
          </ThemedText>
          <ThemedText style={styles.recordingArtist}>
            {isFirebaseRecording 
              ? (recording as FirebaseRecording).songArtist || 'Unknown Artist'
              : (recording as Recording).artist || 'Unknown Artist'
            }
          </ThemedText>
          <ThemedText style={styles.recordingDate}>
            {isFirebaseRecording 
              ? formatDate((recording as FirebaseRecording).createdAt.toDate().toISOString())
              : formatDate((recording as Recording).createdAt)
            }
          </ThemedText>
          <ThemedText style={styles.recordingDuration}>
            {formatDuration(recording.duration)}
          </ThemedText>
          {isFirebaseRecording && (
            <ThemedText style={styles.cloudIndicator}>
              ☁️ Cloud Recording
            </ThemedText>
          )}
          {!isFirebaseRecording && (
            <ThemedText style={styles.localIndicator}>
              📱 Local Recording
            </ThemedText>
          )}
        </View>
        <View style={styles.recordingActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handlePlayRecording(recording as Recording)}
          >
            <Ionicons name="play" size={24} color="#FF6B6B" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleShareRecording(recording)}
          >
            <Ionicons name="share" size={24} color="#4CAF50" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDeleteRecording(recording)}
          >
            <Ionicons name="trash" size={24} color="#F44336" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B6B" />
        <ThemedText style={styles.loadingText}>Loading recordings...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <ThemedText type="title" style={styles.headerTitle}>My Recordings</ThemedText>
          <ThemedText style={styles.headerSubtitle}>
            {recordings.length} recording{recordings.length !== 1 ? 's' : ''}
            {isOnline && user ? (
              <ThemedText style={styles.cloudCount}>{' '}☁️ Cloud Storage</ThemedText>
            ) : (
              <ThemedText style={styles.offlineIndicator}>{' '}📱 Local Storage</ThemedText>
            )}
          </ThemedText>
        </View>
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={loadRecordings}
        >
          <Ionicons name="refresh" size={24} color="#4CAF50" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.debugButton}
          onPress={() => {
            console.log('🧪 Manual offline test - forcing local recordings...');
            const localRecordings = databaseService.getRecordings();
            localRecordings.then(recordings => {
              console.log('🧪 Manual local recordings:', recordings);
              setRecordings(recordings);
            });
          }}
        >
          <Ionicons name="bug" size={24} color="#FFA500" />
        </TouchableOpacity>
      </View>

      {recordings.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="mic-off" size={64} color="#666" />
          <ThemedText style={styles.emptyTitle}>No Recordings Yet</ThemedText>
          <ThemedText style={styles.emptySubtitle}>
            Start recording to create your first recording!
          </ThemedText>
          <TouchableOpacity 
            style={styles.startRecordingButton}
            onPress={() => router.push('/(tabs)')}
          >
            <ThemedText style={styles.startRecordingText}>Browse Songs</ThemedText>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={recordings}
          keyExtractor={(item) => item.id || 'unknown'}
          renderItem={renderRecordingItem}
          style={styles.recordingsList}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.recordingsListContent}
        />
      )}
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
  refreshButton: {
    padding: 8,
    marginRight: 8,
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
  cloudCount: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  offlineIndicator: {
    fontSize: 14,
    color: '#FFA500',
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 32,
  },
  startRecordingButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 25,
  },
  startRecordingText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  recordingsList: {
    flex: 1,
  },
  recordingsListContent: {
    padding: 16,
  },
  recordingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B6B',
  },
  recordingInfo: {
    flex: 1,
  },
  recordingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  recordingArtist: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 2,
  },
  recordingDate: {
    fontSize: 12,
    color: '#888',
    marginBottom: 2,
  },
  recordingDuration: {
    fontSize: 12,
    color: '#888',
  },
  cloudIndicator: {
    fontSize: 10,
    color: '#4CAF50',
    fontWeight: 'bold',
    marginTop: 2,
  },
  localIndicator: {
    fontSize: 10,
    color: '#FFA500',
    fontWeight: 'bold',
    marginTop: 2,
  },
  recordingActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  recordingItemDisabled: {
    opacity: 0.6,
  },
  recordingTitleDisabled: {
    color: '#999',
  },
  recordingArtistDisabled: {
    color: '#999',
  },
  recordingDateDisabled: {
    color: '#999',
  },
  recordingDurationDisabled: {
    color: '#999',
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  debugButton: {
    padding: 8,
    marginLeft: 8,
  },
});