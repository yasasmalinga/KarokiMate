import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { audioService, AudioState } from '@/services/audioService';
import { databaseService, Recording } from '@/services/database';
import { FirebaseRecording, firebaseService } from '@/services/firebaseService';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Dimensions,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';

const { width, height } = Dimensions.get('window');

export default function PlaybackScreen() {
  const router = useRouter();
  const { recordingId } = useLocalSearchParams<{ recordingId: string }>();
  
  const [recording, setRecording] = useState<Recording | FirebaseRecording | null>(null);
  const [audioState, setAudioState] = useState<AudioState>({
    isPlaying: false,
    isRecording: false,
    currentTime: 0,
    duration: 0,
    position: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (recordingId) {
      loadRecording();
    }
    
    // Monitor network connectivity
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? false);
    });
    
    return () => {
      audioService.cleanup();
      unsubscribe();
    };
  }, [recordingId]);

  useEffect(() => {
    // Set up audio state listener
    audioService.setOnStateChange(setAudioState);
    audioService.setOnTimeUpdate((currentTime) => {
      setAudioState(prev => ({ ...prev, currentTime }));
    });
  }, []);

  const loadRecording = async () => {
    try {
      setIsLoading(true);
      
      // First try to get from local storage
      let recordingData = await databaseService.getRecording(recordingId!);
      
      // If not found locally, try Firebase (only if online)
      if (!recordingData && isOnline) {
        try {
          const firebaseRecording = await firebaseService.getRecording(recordingId!);
          if (firebaseRecording) {
            recordingData = firebaseRecording as any; // Type assertion for compatibility
          }
        } catch (firebaseError) {
          console.error('Failed to load from Firebase (offline?):', firebaseError);
        }
      }
      
      if (!recordingData) {
        console.error('Recording not found for ID:', recordingId);
        Alert.alert('Error', 'Recording not found');
        router.back();
        return;
      }

      setRecording(recordingData);

      // Load audio - check if it's a Firebase recording or local recording
      const isFirebaseRecording = 'audioUrl' in recordingData;
      let audioPath: string;
      
      if (isFirebaseRecording) {
        // For Firebase recordings, check if we're online
        if (isOnline) {
          audioPath = (recordingData as any).audioUrl;
        } else {
          // If offline, we can't play Firebase recordings
          throw new Error('Cannot play cloud recording while offline. Please connect to the internet to play this recording.');
        }
      } else {
        // For local recordings, use the local audioPath
        audioPath = (recordingData as any).audioPath;
      }
        
      await audioService.loadSong(audioPath);
    } catch (error) {
      console.error('Failed to load recording:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack
        });
      }
      Alert.alert('Error', `Failed to load recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
      router.back();
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
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack
        });
      }
      Alert.alert('Error', `Failed to control playback: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleStop = async () => {
    try {
      await audioService.stop();
    } catch (error) {
      console.error('Stop error:', error);
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ThemedText style={styles.loadingText}>Loading recording...</ThemedText>
      </ThemedView>
    );
  }

  if (!recording) {
    return (
      <ThemedView style={styles.errorContainer}>
        <ThemedText style={styles.errorText}>Recording not found</ThemedText>
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
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.recordingInfo}>
          <ThemedText style={styles.recordingTitle}>
            {'audioUrl' in recording 
              ? (recording as any).songTitle || 'My Recording'
              : (recording as any).title || 'My Recording'
            }
          </ThemedText>
          <ThemedText style={styles.recordingArtist}>
            {'audioUrl' in recording 
              ? (recording as any).songArtist || 'Unknown Artist'
              : (recording as any).artist || 'Unknown Artist'
            }
          </ThemedText>
        </View>
      </View>

      {/* Visualizer Area */}
      <View style={styles.visualizerContainer}>
        <View style={styles.albumArt}>
          <Ionicons name="musical-notes" size={80} color="#FF6B6B" />
        </View>
        <ThemedText style={styles.recordingDate}>
          Recorded on {formatDate(
            'audioUrl' in recording 
              ? (recording as any).createdAt.toDate().toISOString()
              : (recording as any).createdAt
          )}
        </ThemedText>
      </View>

      {/* Controls */}
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
            style={[styles.controlButton, styles.shareButton]}
            onPress={() => Alert.alert('Share', 'Sharing functionality will be implemented')}
          >
            <Ionicons name="share" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Recording Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <ThemedText style={styles.statLabel}>Duration</ThemedText>
            <ThemedText style={styles.statValue}>
              {formatTime(recording.duration)}
            </ThemedText>
          </View>
          <View style={styles.statItem}>
            <ThemedText style={styles.statLabel}>Quality</ThemedText>
            <ThemedText style={styles.statValue}>High</ThemedText>
          </View>
          <View style={styles.statItem}>
            <ThemedText style={styles.statLabel}>Status</ThemedText>
            <ThemedText style={styles.statValue}>
              {'audioUrl' in recording ? (isOnline ? 'Cloud' : 'Cloud (Offline)') : 'Local'}
            </ThemedText>
          </View>
        </View>
      </View>
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
  recordingInfo: {
    flex: 1,
  },
  recordingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  recordingArtist: {
    fontSize: 14,
    color: '#ccc',
  },
  visualizerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  albumArt: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 4,
    borderColor: '#FF6B6B',
  },
  recordingDate: {
    fontSize: 16,
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
    marginBottom: 20,
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
  shareButton: {
    backgroundColor: '#4CAF50',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold',
  },
});

