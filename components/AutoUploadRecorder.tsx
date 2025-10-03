import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useRecordingUpload } from '../hooks/useRecordingUpload';
import { audioService } from '../services/audioService';

export const AutoUploadRecorder: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState<string>('');
  const [localRecordings, setLocalRecordings] = useState<any[]>([]);
  const [firebaseRecordings, setFirebaseRecordings] = useState<any[]>([]);
  
  const { user } = useAuth();
  const { 
    uploadRecording, 
    getLocalRecordings, 
    getUserRecordings,
    loading, 
    error 
  } = useRecordingUpload();

  // Load recordings when component mounts
  useEffect(() => {
    loadRecordings();
  }, []);

  // Reload Firebase recordings when user logs in/out
  useEffect(() => {
    if (user) {
      loadFirebaseRecordings();
    } else {
      setFirebaseRecordings([]);
    }
  }, [user]);

  const loadRecordings = async () => {
    await Promise.all([
      loadLocalRecordings(),
      user ? loadFirebaseRecordings() : Promise.resolve()
    ]);
  };

  const loadLocalRecordings = async () => {
    try {
      const recordings = await getLocalRecordings();
      setLocalRecordings(recordings);
    } catch (error) {
      console.error('Failed to load local recordings:', error);
    }
  };

  const loadFirebaseRecordings = async () => {
    if (!user) return;
    
    try {
      const recordings = await getUserRecordings();
      setFirebaseRecordings(recordings);
    } catch (error) {
      console.error('Failed to load Firebase recordings:', error);
    }
  };

  const startRecording = async () => {
    try {
      setRecordingStatus('🎙️ Starting recording...');
      await audioService.startRecording();
      setIsRecording(true);
      setRecordingStatus('🔴 Recording in progress...');
      
      Alert.alert('🎙️ Recording Started', 'Tap "Stop & Upload" when finished');
    } catch (error) {
      setRecordingStatus('❌ Failed to start recording');
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const stopRecordingAndUpload = async () => {
    if (!user) {
      Alert.alert('Login Required', 'Please log in to upload recordings');
      return;
    }

    try {
      setRecordingStatus('⏹️ Stopping recording...');
      setIsRecording(false);
      
      // Stop recording and get the file URI
      const recordingUri = await audioService.stopRecording();
      setRecordingStatus('💾 Recording saved locally');
      
      // Immediately start uploading
      setIsUploading(true);
      setRecordingStatus('☁️ Uploading to Firebase...');
      
      
      // Upload to Firebase with user ID
      const recordingId = await uploadRecording(recordingUri, {
        songTitle: 'Auto-Uploaded Recording',
        songArtist: 'Karaoke User',
        duration: 120, // Default 2 minutes - you can calculate actual duration
        isPublic: false,
        tags: ['karaoke', 'auto-upload', 'recording']
      });

      setRecordingStatus('✅ Upload successful!');
      
      // Show success message
      Alert.alert(
        '🎉 Recording Uploaded!', 
        `Your recording has been saved to Firebase!\n\nRecording ID: ${recordingId}\n\nIt's now stored in the cloud with your user ID.`
      );
      
      // Refresh recordings list
      await loadRecordings();
      
    } catch (error) {
      setRecordingStatus('❌ Upload failed');
      console.error('❌ Auto-upload failed:', error);
      Alert.alert('Upload Failed', `Failed to upload recording: ${error}`);
    } finally {
      setIsUploading(false);
      setRecordingStatus('');
    }
  };

  const cancelRecording = async () => {
    try {
      setRecordingStatus('❌ Cancelling recording...');
      await audioService.cancelRecording();
      setIsRecording(false);
      setRecordingStatus('❌ Recording cancelled');
      
      setTimeout(() => {
        setRecordingStatus('');
      }, 2000);
    } catch (error) {
      setRecordingStatus('❌ Failed to cancel recording');
      Alert.alert('Error', 'Failed to cancel recording');
    }
  };

  const refreshRecordings = async () => {
    await loadRecordings();
    Alert.alert('Refreshed', 'Recordings list updated');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎤 Auto-Upload Recorder</Text>
      
      {/* User Status */}
      <View style={styles.statusContainer}>
        <Text style={styles.statusTitle}>👤 User Status</Text>
        <Text style={styles.statusText}>
          {user ? `Logged in: ${user.email}` : '❌ Not logged in'}
        </Text>
        <Text style={styles.statusText}>
          User ID: {user ? user.uid : 'N/A'}
        </Text>
      </View>

      {/* Recording Status */}
      {recordingStatus && (
        <View style={styles.statusContainer}>
          <Text style={styles.statusTitle}>📊 Status</Text>
          <Text style={styles.statusText}>{recordingStatus}</Text>
        </View>
      )}

      {/* Recording Controls */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎙️ Recording Controls</Text>
        
        {!isRecording ? (
          <TouchableOpacity
            style={styles.button}
            onPress={startRecording}
            disabled={loading || isUploading}
          >
            <Text style={styles.buttonText}>🎙️ Start Recording</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.recordingControls}>
            <TouchableOpacity
              style={[styles.button, styles.stopButton]}
              onPress={stopRecordingAndUpload}
              disabled={loading || isUploading || !user}
            >
              <Text style={styles.buttonText}>
                {isUploading ? '☁️ Uploading...' : '⏹️ Stop & Upload'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={cancelRecording}
              disabled={loading || isUploading}
            >
              <Text style={styles.buttonText}>❌ Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
        
        <TouchableOpacity
          style={styles.button}
          onPress={refreshRecordings}
          disabled={loading || isUploading}
        >
          <Text style={styles.buttonText}>🔄 Refresh Recordings</Text>
        </TouchableOpacity>
      </View>

      {/* Recordings Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 Recordings Summary</Text>
        <Text style={styles.summaryText}>
          📱 Local Recordings: {localRecordings.length}
        </Text>
        <Text style={styles.summaryText}>
          ☁️ Firebase Recordings: {firebaseRecordings.length}
        </Text>
        <Text style={styles.summaryText}>
          📊 Total: {localRecordings.length + firebaseRecordings.length}
        </Text>
      </View>

      {/* Instructions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📋 How It Works:</Text>
        <Text style={styles.instructionText}>
          1. 🎙️ Tap "Start Recording"{'\n'}
          2. 🎵 Record your karaoke{'\n'}
          3. ⏹️ Tap "Stop & Upload"{'\n'}
          4. ☁️ Recording automatically uploads to Firebase{'\n'}
          5. ✅ Done! Recording saved with your user ID
        </Text>
      </View>

      {/* Error Display */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>❌ Error: {error}</Text>
        </View>
      )}

      {/* Warning for non-logged users */}
      {!user && (
        <View style={styles.warningContainer}>
          <Text style={styles.warningText}>
            ⚠️ Please log in to use auto-upload feature
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  statusContainer: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  statusText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  section: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  stopButton: {
    backgroundColor: '#34C759',
  },
  cancelButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  recordingControls: {
    flexDirection: 'row',
    gap: 10,
  },
  summaryText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
    fontWeight: '500',
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  errorContainer: {
    backgroundColor: '#ffe6e6',
    padding: 15,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#FF3B30',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '600',
  },
  warningContainer: {
    backgroundColor: '#fff3cd',
    padding: 15,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  warningText: {
    fontSize: 14,
    color: '#856404',
    fontWeight: '600',
  },
});
