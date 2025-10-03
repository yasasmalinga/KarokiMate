import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { FirebaseRecording, firebaseService } from './firebaseService';
import { LocalRecording, localRecordingService } from './localRecordingService';

export interface AudioState {
  isPlaying: boolean;
  isRecording: boolean;
  currentTime: number;
  duration: number;
  position: number;
}

export interface RecordingOptions {
  quality: 'low' | 'medium' | 'high';
  sampleRate: number;
  channels: number;
}

class AudioService {
  private sound: Audio.Sound | null = null;
  private recording: Audio.Recording | null = null;
  private playbackStatusSubscription: Audio.Subscription | null = null;
  private isInitialized = false;

  // State
  private _isPlaying = false;
  private _isRecording = false;
  private _currentTime = 0;
  private _duration = 0;
  private _position = 0;
  private _recordingState: 'idle' | 'recording' | 'stopping' | 'stopped' = 'idle';

  // Callbacks
  private onStateChange?: (state: AudioState) => void;
  private onTimeUpdate?: (currentTime: number) => void;

  async initialize() {
    if (this.isInitialized) return;

    try {
      // Configure audio session
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: true,
      });

      // Initialize local recording service
      await localRecordingService.initialize();

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize audio service:', error);
      throw error;
    }
  }

  // Playback methods
  async loadSong(audioUrl: string): Promise<void> {
    try {
      await this.initialize();
      
      // Unload previous sound
      if (this.sound) {
        await this.unloadSound();
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: false, isLooping: false }
      );

      this.sound = sound;
      this.setupPlaybackStatusSubscription();
    } catch (error) {
      throw error;
    }
  }

  async play(): Promise<void> {
    if (!this.sound) throw new Error('No song loaded');
    
    try {
      await this.sound.playAsync();
      this._isPlaying = true;
      this.notifyStateChange();
    } catch (error) {
      throw error;
    }
  }

  async pause(): Promise<void> {
    if (!this.sound) return;
    
    try {
      await this.sound.pauseAsync();
      this._isPlaying = false;
      this.notifyStateChange();
    } catch (error) {
      console.error('Failed to pause song:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.sound) return;
    
    try {
      await this.sound.stopAsync();
      await this.sound.setPositionAsync(0);
      this._isPlaying = false;
      this._currentTime = 0;
      this._position = 0;
      this.notifyStateChange();
    } catch (error) {
      console.error('Failed to stop song:', error);
      throw error;
    }
  }

  async seekTo(positionMillis: number): Promise<void> {
    if (!this.sound) return;
    
    try {
      await this.sound.setPositionAsync(positionMillis);
      this._currentTime = positionMillis;
      this._position = positionMillis / this._duration;
      this.notifyStateChange();
    } catch (error) {
      console.error('Failed to seek:', error);
      throw error;
    }
  }

  // Recording methods
  async startRecording(options: RecordingOptions = {
    quality: 'high',
    sampleRate: 44100,
    channels: 2
  }): Promise<void> {
    try {
      await this.initialize();
      
      // Check if already recording
      if (this._recordingState === 'recording') {
        return;
      }

      // Clean up any existing recording
      if (this.recording && this._recordingState !== 'idle') {
        await this.cleanupRecording();
      }
      
      // Request permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Recording permission not granted');
      }

      // Configure recording options
      const recordingOptions = {
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: options.sampleRate,
          numberOfChannels: options.channels,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: options.sampleRate,
          numberOfChannels: options.channels,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      };

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(recordingOptions);
      await recording.startAsync();

      this.recording = recording;
      this._isRecording = true;
      this._recordingState = 'recording';
      this.notifyStateChange();
    } catch (error) {
      console.error('Failed to start recording:', error);
      this._recordingState = 'idle';
      throw error;
    }
  }

  async stopRecording(): Promise<string> {
    if (!this.recording || this._recordingState !== 'recording') {
      throw new Error('No active recording');
    }

    try {
      this._recordingState = 'stopping';
      // Stop and unload the recording
      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();
      
      if (!uri) {
        console.error('No URI returned from recording');
        throw new Error('Failed to get recording URI');
      }

      // Save recording to permanent location
      const fileName = `recording_${Date.now()}.m4a`;
      const permanentUri = `${FileSystem.documentDirectory}${fileName}`;
      
      try {
        // Try to move the file
        await FileSystem.moveAsync({
          from: uri,
          to: permanentUri,
        });
        // Add to local recording service
        await localRecordingService.addRecording(permanentUri);
        
        // Clean up and return
        this.recording = null;
        this._isRecording = false;
        this._recordingState = 'idle';
        this.notifyStateChange();
        
        return permanentUri;
      } catch (moveError) {
        // Try to copy instead of move
        try {
          await FileSystem.copyAsync({
            from: uri,
            to: permanentUri,
          });
          // Add to local recording service
          await localRecordingService.addRecording(permanentUri);
          
          // Clean up and return
          this.recording = null;
          this._isRecording = false;
          this._recordingState = 'idle';
          this.notifyStateChange();
          
          return permanentUri;
        } catch (copyError) {
          // Add to local recording service with original URI
          await localRecordingService.addRecording(uri);
          
          // Use original URI as fallback
          this.recording = null;
          this._isRecording = false;
          this._recordingState = 'idle';
          this.notifyStateChange();
          
          return uri;
        }
      }
    } catch (error) {
      console.error('❌ Failed to stop recording:', error);
      
      // Clean up state even on error
      this._recordingState = 'idle';
      this._isRecording = false;
      this.recording = null;
      this.notifyStateChange();
      
      throw error;
    }
  }

  async cancelRecording(): Promise<void> {
    if (!this.recording || this._recordingState === 'idle') return;

    try {
      this._recordingState = 'stopping';
      
      if (this.recording && this._recordingState === 'stopping') {
        await this.recording.stopAndUnloadAsync();
      }
      
      this.recording = null;
      this._isRecording = false;
      this._recordingState = 'idle';
      this.notifyStateChange();
    } catch (error) {
      console.error('Failed to cancel recording:', error);
      this._recordingState = 'idle';
      this._isRecording = false;
      this.recording = null;
      this.notifyStateChange();
      throw error;
    }
  }

  // Utility methods
  private async cleanupRecording(): Promise<void> {
    if (!this.recording || this._recordingState === 'idle') return;

    try {
      this._recordingState = 'stopping';
      if (this.recording) {
        await this.recording.stopAndUnloadAsync();
      }
    } catch (error) {
      } finally {
      this.recording = null;
      this._isRecording = false;
      this._recordingState = 'idle';
    }
  }

  async unloadSound(): Promise<void> {
    if (this.sound) {
      if (this.playbackStatusSubscription) {
        this.playbackStatusSubscription.remove();
        this.playbackStatusSubscription = null;
      }
      
      await this.sound.unloadAsync();
      this.sound = null;
      this._isPlaying = false;
      this._currentTime = 0;
      this._duration = 0;
      this._position = 0;
      this.notifyStateChange();
    }
  }

  private setupPlaybackStatusSubscription(): void {
    if (!this.sound) return;

    this.playbackStatusSubscription = this.sound.setOnPlaybackStatusUpdate(
      this.onPlaybackStatusUpdate.bind(this)
    );
  }

  private onPlaybackStatusUpdate(status: any): void {
    if (status.isLoaded) {
      this._isPlaying = status.isPlaying;
      this._currentTime = status.positionMillis || 0;
      this._duration = status.durationMillis || 0;
      this._position = this._duration > 0 ? this._currentTime / this._duration : 0;

      this.notifyStateChange();
      this.onTimeUpdate?.(this._currentTime);
    }
  }

  private notifyStateChange(): void {
    const state = {
      isPlaying: this._isPlaying,
      isRecording: this._isRecording,
      currentTime: this._currentTime,
      duration: this._duration,
      position: this._position,
    };
    this.onStateChange?.(state);
  }

  // Getters
  get isPlaying(): boolean {
    return this._isPlaying;
  }

  get isRecording(): boolean {
    return this._isRecording;
  }

  get currentTime(): number {
    return this._currentTime;
  }

  get duration(): number {
    return this._duration;
  }

  get position(): number {
    return this._position;
  }

  // Setters for callbacks
  setOnStateChange(callback: (state: AudioState) => void): void {
    this.onStateChange = callback;
  }

  setOnTimeUpdate(callback: (currentTime: number) => void): void {
    this.onTimeUpdate = callback;
  }

  // Recording upload methods
  async uploadRecordingToFirebase(
    recordingUri: string,
    userId: string,
    metadata: {
      songId?: string;
      songTitle?: string;
      songArtist?: string;
      duration: number;
      isPublic?: boolean;
      tags?: string[];
    }
  ): Promise<string> {
    try {
      // Upload file directly using Firebase Storage
      const fileName = `recording_${Date.now()}.m4a`;
      const storagePath = `user-recordings/${userId}/${fileName}`;
      
      // Upload file to Firebase Storage
      const audioUrl = await firebaseService.uploadRecordingFile(recordingUri, storagePath);
      
      // Create recording document in Firestore
      const recordingData: Omit<FirebaseRecording, 'id' | 'createdAt' | 'updatedAt'> = {
        userId,
        songId: metadata.songId || null,
        songTitle: metadata.songTitle || 'Unknown Song',
        songArtist: metadata.songArtist || 'Unknown Artist',
        audioUrl,
        duration: metadata.duration,
        isPublic: metadata.isPublic || false,
        tags: metadata.tags || [],
        playCount: 0,
      };
      
      const recordingId = await firebaseService.addRecording(recordingData);
      
      return recordingId;
    } catch (error) {
      console.error('❌ Failed to upload recording to Firebase:', error);
      throw error;
    }
  }

  async getUserRecordings(userId: string): Promise<FirebaseRecording[]> {
    try {
      return await firebaseService.getUserRecordings(userId);
    } catch (error) {
      console.error('❌ Failed to get user recordings:', error);
      throw error;
    }
  }

  async getPublicRecordings(): Promise<FirebaseRecording[]> {
    try {
      return await firebaseService.getPublicRecordings();
    } catch (error) {
      console.error('❌ Failed to get public recordings:', error);
      throw error;
    }
  }

  async deleteRecording(recordingId: string): Promise<void> {
    try {
      await firebaseService.deleteRecording(recordingId);
      } catch (error) {
      console.error('❌ Failed to delete recording:', error);
      throw error;
    }
  }

  async updateRecordingVisibility(recordingId: string, isPublic: boolean): Promise<void> {
    try {
      await firebaseService.updateRecording(recordingId, { isPublic });
      } catch (error) {
      console.error('❌ Failed to update recording visibility:', error);
      throw error;
    }
  }

  // Local recording methods
  async getLocalRecordings(): Promise<LocalRecording[]> {
    try {
      return localRecordingService.getAllRecordings();
    } catch (error) {
      console.error('❌ Failed to get local recordings:', error);
      throw error;
    }
  }

  async deleteLocalRecording(recordingId: string): Promise<boolean> {
    try {
      return await localRecordingService.deleteRecording(recordingId);
    } catch (error) {
      console.error('❌ Failed to delete local recording:', error);
      throw error;
    }
  }

  async updateLocalRecording(recordingId: string, updates: Partial<LocalRecording>): Promise<boolean> {
    try {
      return await localRecordingService.updateRecording(recordingId, updates);
    } catch (error) {
      console.error('❌ Failed to update local recording:', error);
      throw error;
    }
  }

  async getLocalRecordingStorageInfo(): Promise<{ totalSize: number; fileCount: number; formattedSize: string }> {
    try {
      const info = await localRecordingService.getStorageInfo();
      return {
        ...info,
        formattedSize: localRecordingService.formatFileSize(info.totalSize)
      };
    } catch (error) {
      console.error('❌ Failed to get storage info:', error);
      throw error;
    }
  }

  // Auto-upload method - always saves locally first, then uploads to Firebase if online
  async stopRecordingAndUpload(
    userId: string,
    metadata: {
      songId?: string;
      songTitle?: string;
      songArtist?: string;
      duration?: number;
      isPublic?: boolean;
      tags?: string[];
    } = {}
  ): Promise<string> {
    try {
      // Stop recording first
      const recordingUri = await this.stopRecording();
      
      // ALWAYS save locally first (works offline)
      const { databaseService } = require('./database');
      const localRecording: Omit<import('./database').Recording, 'createdAt'> = {
        id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: metadata.songTitle || 'Local Recording',
        artist: metadata.songArtist || 'Karaoke User',
        audioPath: recordingUri,
        duration: metadata.duration || 120,
        songId: metadata.songId || null,
        isSynced: false, // Will be updated when uploaded to Firebase
        isPublic: metadata.isPublic || false,
        tags: metadata.tags || ['karaoke', 'local'],
        playCount: 0
      };
      
      // Save to local storage first
      await databaseService.saveRecording(localRecording);
      
      // Check if we're online for Firebase upload
      const NetInfo = require('@react-native-community/netinfo').default;
      const networkState = await NetInfo.fetch();
      const isOnline = networkState.isConnected ?? false;
      
      if (isOnline) {
        try {
          // Try to upload to Firebase (in background, don't wait for it)
          this.uploadToFirebaseInBackground(recordingUri, userId, metadata, localRecording.id);
        } catch (uploadError) {
          console.error('❌ Firebase upload failed, but local recording saved:', uploadError);
        }
      }
      
      // Return local recording ID immediately
      return localRecording.id;
      
    } catch (error) {
      console.error('❌ Recording failed:', error);
      throw error;
    }
  }

  // Background upload to Firebase (non-blocking)
  private async uploadToFirebaseInBackground(
    recordingUri: string,
    userId: string,
    metadata: any,
    localRecordingId: string
  ): Promise<void> {
    try {
      const recordingId = await this.uploadRecordingToFirebase(recordingUri, userId, {
        songId: metadata.songId,
        songTitle: metadata.songTitle || 'Auto-Uploaded Recording',
        songArtist: metadata.songArtist || 'Karaoke User',
        duration: metadata.duration || 120,
        isPublic: metadata.isPublic || false,
        tags: metadata.tags || ['karaoke', 'auto-upload']
      });
      
      console.log('✅ Recording uploaded to Firebase:', recordingId);
      
      // Optionally mark local recording as synced
      const { databaseService } = require('./database');
      await databaseService.updateRecordingSyncStatus(localRecordingId, true);
      
    } catch (error) {
      console.error('❌ Background Firebase upload failed:', error);
      // Local recording is still available, so this is not critical
    }
  }

  // Cleanup
  async cleanup(): Promise<void> {
    await this.unloadSound();
    await this.cleanupRecording();
  }
}

export const audioService = new AudioService();
