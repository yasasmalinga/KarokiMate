import { LyricScroller } from '@/components/LyricScroller';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '@/contexts/AuthContext';
import { audioService, AudioState } from '@/services/audioService';
import { databaseService, LyricLine, Recording } from '@/services/database';
import { firebaseService, FirebaseSong } from '@/services/firebaseService';
import { songService } from '@/services/songService';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    Alert,
    Dimensions,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';

const { width, height } = Dimensions.get('window');

export default function KaraokeScreen() {
  const router = useRouter();
  const { songId } = useLocalSearchParams<{ songId: string }>();
  const { user } = useAuth();
  
  const [song, setSong] = useState<FirebaseSong | null>(null);
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [audioState, setAudioState] = useState<AudioState>({
    isPlaying: false,
    isRecording: false,
    currentTime: 0,
    duration: 0,
    position: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(true);
  const [testTime, setTestTime] = useState(0);
  const [isTestMode, setIsTestMode] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (songId) {
      loadSong();
    }
    
    // Monitor network connectivity
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? false);
    });
    
    return () => {
      audioService.cleanup();
      unsubscribe();
    };
  }, [songId]);

  // Handle back button during recording
  useEffect(() => {
    const handleBackPress = () => {
      if (audioState.isRecording) {
        Alert.alert(
          'Recording in Progress',
          'You are currently recording. Do you want to stop recording and go back?',
          [
            { text: 'Continue Recording', style: 'cancel' },
            {
              text: 'Stop & Go Back',
              style: 'destructive',
              onPress: async () => {
                try {
                  await audioService.stopRecording();
                  router.back();
                } catch (error) {
                  console.error('Error stopping recording:', error);
                  router.back();
                }
              }
            }
          ]
        );
        return true; // Prevent default back action
      }
      return false; // Allow default back action
    };

    // Note: Expo Router doesn't have addListener, so we handle this in the back button onPress
    // The navigation guard is handled in the back button onPress handler below

    return () => {
      // Cleanup if needed
    };
  }, [audioState.isRecording, router]);

  useEffect(() => {
    // Set up audio state listener
    audioService.setOnStateChange((newState) => {
      setAudioState(newState);
    });
    audioService.setOnTimeUpdate((currentTime) => {
      setAudioState(prev => ({ ...prev, currentTime }));
    });
  }, []);

  // Test timer for lyric scrolling (remove this in production)
  useEffect(() => {
    if (!audioState.isPlaying && !isTestMode) return;
    
    const interval = setInterval(() => {
      setTestTime(prev => {
        const newTime = prev + 1000; // Increment by 1 second
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [audioState.isPlaying, isTestMode]);

  const loadSong = async () => {
    try {
      setIsLoading(true);
      console.log('🎵 Loading song with ID:', songId);
      
      // First check if song is downloaded locally in AsyncStorage
      console.log('📱 Checking AsyncStorage for downloaded song...');
      await songService.debugDownloadedSongs(); // Debug: Show what's in AsyncStorage
      const localSong = await songService.getDownloadedSong(songId!);
      console.log('📱 Local song result:', localSong ? 'Found' : 'Not found');
      
      if (localSong && localSong.isDownloaded) {
        console.log('📱 Using locally downloaded song from AsyncStorage:', localSong.title);
        console.log('📱 Local song audio URL:', localSong.audioUrl);
        
        setSong({
          id: localSong.id,
          title: localSong.title,
          artist: localSong.artist,
          duration: localSong.duration,
          audioUrl: localSong.audioUrl,
          lyrics: localSong.lyrics,
          genre: localSong.genre || 'Unknown',
          difficulty: localSong.difficulty || 'Medium',
          downloadCount: localSong.downloadCount || 0,
          rating: localSong.rating || 0,
          tags: localSong.tags || [],
          createdAt: new Date(localSong.createdAt),
          updatedAt: new Date(localSong.updatedAt),
        });
        setLyrics(localSong.lyrics || []);
        
        console.log('🎵 Loading local audio file...');
        await audioService.loadSong(localSong.audioUrl);
        console.log('✅ Local song loaded successfully');
        return;
      }
      
      // If not downloaded locally, check network status before trying Firebase
      console.log('🌐 Checking network status...');
      const NetInfo = require('@react-native-community/netinfo').default;
      const networkState = await NetInfo.fetch();
      const isOnline = networkState.isConnected ?? false;
      console.log('🌐 Network status:', isOnline ? 'Online' : 'Offline');
      
      if (!isOnline) {
        console.log('❌ No internet connection and song not downloaded');
        Alert.alert(
          'Offline Mode', 
          'This song is not downloaded and you are offline.\n\nPlease download the song first or connect to the internet.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
        return;
      }
      
      // If online, try to load from Firebase
      console.log('📡 Loading song from Firebase:', songId);
      const songData = await firebaseService.getSong(songId!);
      if (!songData) {
        Alert.alert('Error', 'Song not found. Please download the song first for offline use.');
        router.back();
        return;
      }

      console.log('📡 Firebase song loaded:', songData.title);
      setSong(songData);
      setLyrics(songData.lyrics || []);
      await audioService.loadSong(songData.audioUrl);
      console.log('✅ Firebase song loaded successfully');
      
    } catch (error) {
      console.error('❌ Failed to load song:', error);
      
      // Check if it's a network error
      if (error instanceof Error && error.message.includes('Network')) {
        Alert.alert(
          'Network Error', 
          'Failed to load song due to network issues.\n\nPlease check your internet connection or download the song for offline use.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else {
        Alert.alert('Error', 'Failed to load song. Please check your internet connection or download the song for offline use.');
        router.back();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayPause = async () => {
    try {
      if (audioState.isPlaying) {
        await audioService.pause();
      } else {
        await audioService.play();
      }
    } catch (error) {
      console.error('Playback error:', error);
      Alert.alert('Error', 'Failed to control playback');
    }
  };

  const handleRecord = async () => {
    try {
      if (audioState.isRecording) {
        if (user) {
          // Always save locally first, then upload to Firebase if online
          setIsUploading(true);
          try {
            const recordingId = await audioService.stopRecordingAndUpload(user.uid, {
              songId: songId,
              songTitle: song?.title || 'Unknown Song',
              songArtist: song?.artist || 'Unknown Artist',
              duration: audioState.currentTime,
              isPublic: false,
              tags: ['karaoke', 'auto-upload', song?.title || 'unknown']
            });
            
            setRecordingId(recordingId);
            
            // Always show local save message since we always save locally first
            const message = isOnline 
              ? `Your recording has been saved locally and is uploading to the cloud!\n\nRecording ID: ${recordingId}\n\nYou can play it immediately while it uploads in the background.`
              : `Your recording has been saved locally!\n\nRecording ID: ${recordingId}\n\nIt will automatically upload to the cloud when you reconnect to the internet.`;
            
            Alert.alert('🎉 Recording Saved!', message);
          } finally {
            setIsUploading(false);
          }
        } else {
          // Save locally only when user is not logged in
          const recordingPath = await audioService.stopRecording();
          if (!recordingPath) {
            throw new Error('No recording path returned');
          }
          
          const recording: Omit<Recording, 'createdAt'> = {
            id: `recording_${Date.now()}`,
            songId: songId!,
            audioPath: recordingPath,
            duration: audioState.currentTime,
            isSynced: false,
            title: song?.title || 'Unknown Song',
            artist: song?.artist || 'Unknown Artist',
          };
          
          try {
            await databaseService.saveRecording(recording);
            setRecordingId(recording.id);
            const message = !isOnline 
              ? 'Recording saved locally! 🎵\n\nNote: You are offline. Recording will be available locally until you reconnect.'
              : 'Recording saved locally! 🎵\n\nNote: Log in to automatically upload to Firebase.';
            Alert.alert('Success', message);
          } catch (dbError) {
            console.error('❌ Local storage save error:', dbError);
            Alert.alert('Success', 'Recording saved locally! File path: ' + recordingPath);
          }
        }
      } else {
        await audioService.startRecording();
      }
    } catch (error) {
      console.error('Recording error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Error', `Failed to start/stop recording: ${errorMessage}`);
    }
  };

  const handleStop = async () => {
    try {
      await audioService.stop();
      if (audioState.isRecording) {
        await audioService.stopRecording();
      }
      setTestTime(0); // Reset test timer
      setIsTestMode(false); // Stop test mode
    } catch (error) {
      console.error('Stop error:', error);
    }
  };

  const handleTestMode = () => {
    setIsTestMode(!isTestMode);
    if (!isTestMode) {
      setTestTime(0); // Reset timer when starting test mode
    }
  };

  const handleSeek = (position: number) => {
    const seekTime = position * audioState.duration;
    audioService.seekTo(seekTime);
  };

  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Firebase connection test disabled - using local storage only
  // const testFirebaseConnection = async () => {
  //   //   return false;
  // };

  if (isLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ThemedText style={styles.loadingText}>Loading song...</ThemedText>
      </ThemedView>
    );
  }

  if (!song) {
    return (
      <ThemedView style={styles.errorContainer}>
        <ThemedText style={styles.errorText}>Song not found</ThemedText>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ThemedText style={styles.errorText}>Go Back</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => {
            if (audioState.isRecording) {
              Alert.alert(
                'Recording in Progress',
                'You are currently recording. Do you want to stop recording and go back?',
                [
                  { text: 'Continue Recording', style: 'cancel' },
                  {
                    text: 'Stop & Go Back',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        await audioService.stopRecording();
                        router.back();
                      } catch (error) {
                        console.error('Error stopping recording:', error);
                        router.back();
                      }
                    }
                  }
                ]
              );
            } else {
              router.back();
            }
          }}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.songInfo}>
          <ThemedText style={styles.songTitle}>{song.title}</ThemedText>
          <ThemedText style={styles.songArtist}>{song.artist}</ThemedText>
        </View>
        <TouchableOpacity 
          style={styles.controlsToggle}
          onPress={() => setShowControls(!showControls)}
        >
          <Ionicons name={showControls ? "chevron-down" : "chevron-up"} size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Lyrics Display */}
      <View style={styles.lyricsContainer}>
        {/* Debug Info */}
        <View style={styles.debugInfo}>
          <ThemedText style={styles.debugText}>
            Time: {Math.round(isTestMode ? testTime : audioState.currentTime)}ms | 
            Mode: {isTestMode ? 'Test' : 'Audio'} | 
            Playing: {audioState.isPlaying ? 'Yes' : 'No'}
          </ThemedText>
        </View>
        
        <LyricScroller
          lyrics={lyrics}
          currentTime={isTestMode ? testTime : (audioState.currentTime > 0 ? audioState.currentTime : testTime)}
          highlightColor="#FF6B6B"
          textColor="#FFFFFF"
          fontSize={20}
          lineHeight={32}
          autoScroll={true}
        />
      </View>

      {/* Controls */}
      {showControls && (
        <View style={styles.controlsContainer}>
          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${audioState.position * 100}%` }
                ]} 
              />
            </View>
            <View style={styles.timeContainer}>
              <ThemedText style={styles.timeText}>
                {formatTime(audioState.currentTime)}
              </ThemedText>
              <ThemedText style={styles.timeText}>
                {formatTime(audioState.duration)}
              </ThemedText>
            </View>
          </View>

          {/* Control Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.controlButton, styles.stopButton]}
              onPress={handleStop}
            >
              <Ionicons name="stop" size={24} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.controlButton, styles.playButton]}
              onPress={handlePlayPause}
            >
              <Ionicons 
                name={audioState.isPlaying ? "pause" : "play"} 
                size={32} 
                color="#fff" 
              />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[
                styles.controlButton, 
                styles.recordButton,
                audioState.isRecording && styles.recordingButton
              ]}
              onPress={handleRecord}
            >
              <Ionicons 
                name={audioState.isRecording ? "stop" : "mic"} 
                size={24} 
                color="#fff" 
              />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[
                styles.controlButton, 
                isTestMode && styles.activeButton
              ]}
              onPress={handleTestMode}
            >
              <Ionicons 
                name={isTestMode ? "stop-circle" : "play-circle"} 
                size={24} 
                color="#fff" 
              />
            </TouchableOpacity>
          </View>

          {/* Recording Status */}
          {audioState.isRecording && (
            <View style={styles.recordingStatus}>
              <View style={styles.recordingIndicator} />
              <ThemedText style={styles.recordingText}>Recording...</ThemedText>
            </View>
          )}

          {/* Upload Status */}
          {isUploading && (
            <View style={styles.uploadStatus}>
              <View style={styles.uploadIndicator} />
              <ThemedText style={styles.uploadText}>Uploading to Firebase...</ThemedText>
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
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
    fontSize: 18,
    color: '#fff',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  errorText: {
    fontSize: 18,
    color: '#fff',
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#2a2a2a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  songInfo: {
    flex: 1,
  },
  songTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  songArtist: {
    fontSize: 14,
    color: '#ccc',
  },
  controlsToggle: {
    padding: 8,
  },
  lyricsContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  debugInfo: {
    backgroundColor: '#333',
    padding: 8,
    borderRadius: 4,
    marginBottom: 10,
  },
  debugText: {
    fontSize: 12,
    color: '#ccc',
    textAlign: 'center',
  },
  controlsContainer: {
    backgroundColor: '#2a2a2a',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#444',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF6B6B',
    borderRadius: 2,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeText: {
    fontSize: 12,
    color: '#ccc',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 20,
  },
  stopButton: {
    backgroundColor: '#666',
  },
  playButton: {
    backgroundColor: '#FF6B6B',
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  recordButton: {
    backgroundColor: '#4CAF50',
  },
  recordingButton: {
    backgroundColor: '#F44336',
  },
  activeButton: {
    backgroundColor: '#4CAF50',
  },
  recordingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  recordingIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#F44336',
    marginRight: 8,
  },
  recordingText: {
    fontSize: 14,
    color: '#F44336',
    fontWeight: 'bold',
  },
  uploadStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  uploadIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2196F3',
    marginRight: 8,
  },
  uploadText: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: 'bold',
  },
});
