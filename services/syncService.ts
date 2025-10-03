import NetInfo from '@react-native-community/netinfo';
import { databaseService, Recording, Song } from './database';
import { firebaseService } from './firebaseService';

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: string | null;
  pendingUploads: number;
  pendingDownloads: number;
}

class SyncService {
  private isOnline = false;
  private isSyncing = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private onStatusChange?: (status: SyncStatus) => void;
  private currentUserId: string | null = null;

  async initialize(userId?: string) {
    this.currentUserId = userId || null;
    
    // Set up network monitoring
    NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected ?? false;
      this.notifyStatusChange();
      
      // If we just came back online, sync unsynced recordings
      if (wasOffline && this.isOnline && !this.isSyncing && this.currentUserId) {
        this.performSync();
      }
    });

    // Check initial network state
    const netInfo = await NetInfo.fetch();
    this.isOnline = netInfo.isConnected ?? false;
    this.notifyStatusChange();

    // Periodic sync when online
    this.syncInterval = setInterval(() => {
      if (this.isOnline && !this.isSyncing && this.currentUserId) {
        this.performSync();
      }
    }, 2 * 60 * 1000); // 2 minutes
  }

  setUserId(userId: string | null) {
    this.currentUserId = userId;
  }

  async performSync(): Promise<void> {
    if (!this.isOnline || this.isSyncing) return;

    try {
      this.isSyncing = true;
      this.notifyStatusChange();

      // Upload unsynced recordings
      await this.uploadUnsyncedRecordings();

      // Download new songs (if any)
      await this.downloadNewSongs();

      // Update last sync time
      const lastSyncTime = new Date().toISOString();
      // Store in AsyncStorage or similar
      
      } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      this.isSyncing = false;
      this.notifyStatusChange();
    }
  }

  private async uploadUnsyncedRecordings(): Promise<void> {
    try {
      const unsyncedRecordings = await databaseService.getUnsyncedRecordings();
      
      for (const recording of unsyncedRecordings) {
        try {
          // Simulate upload to backend
          await this.uploadRecording(recording);
          
          // Mark as synced
          await databaseService.updateRecordingSyncStatus(recording.id, true);
          
          } catch (error) {
          console.error(`Failed to upload recording ${recording.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to upload recordings:', error);
      throw error;
    }
  }

  private async uploadRecording(recording: Recording): Promise<void> {
    if (!this.currentUserId) {
      throw new Error('No user ID available for upload');
    }
    
    try {
      // Upload to Firebase
      const fileName = `recording_${this.currentUserId}_${Date.now()}.m4a`;
      const storagePath = `user-recordings/${this.currentUserId}/${fileName}`;
      const audioUrl = await firebaseService.uploadRecordingFile(recording.audioPath, storagePath);
      
      // Create recording document in Firestore
      const recordingData = {
        userId: this.currentUserId,
        songId: recording.songId,
        songTitle: recording.title || 'Unknown Song',
        songArtist: recording.artist || 'Unknown Artist',
        audioUrl: audioUrl,
        duration: recording.duration,
        isPublic: recording.isPublic || false,
        tags: recording.tags || ['karaoke', 'synced'],
        playCount: 0,
      };
      
      await firebaseService.addRecording(recordingData);
      
    } catch (error) {
      console.error('Failed to upload recording to Firebase:', error);
      throw error;
    }
  }

  private async downloadNewSongs(): Promise<void> {
    try {
      // Simulate downloading new songs from backend
      // In a real app, this would fetch from your API
      const newSongs = await this.fetchNewSongsFromBackend();
      
      for (const song of newSongs) {
        await databaseService.saveSong(song);
        }
    } catch (error) {
      console.error('Failed to download new songs:', error);
    }
  }

  private async fetchNewSongsFromBackend(): Promise<Omit<Song, 'createdAt' | 'updatedAt'>[]> {
    // Simulate API call to get new songs
    // In a real app, this would make HTTP requests to your backend
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          {
            id: `new_song_${Date.now()}`,
            title: 'New Song',
            artist: 'New Artist',
            duration: 180000,
            audioUrl: 'https://example.com/new-song.m4a',
            lyrics: JSON.stringify([
              { text: "This is a new song", startTime: 0, endTime: 3000 },
              { text: "Downloaded from backend", startTime: 3000, endTime: 6000 },
            ]),
            timing: JSON.stringify([
              { text: "This is a new song", startTime: 0, endTime: 3000 },
              { text: "Downloaded from backend", startTime: 3000, endTime: 6000 },
            ]),
            isDownloaded: false,
          }
        ]);
      }, 500);
    });
  }

  async forceSync(): Promise<void> {
    if (this.isOnline) {
      await this.performSync();
    } else {
      throw new Error('No internet connection');
    }
  }

  async getSyncStatus(): Promise<SyncStatus> {
    const unsyncedRecordings = await databaseService.getUnsyncedRecordings();
    const offlineSongs = await databaseService.getOfflineSongs();
    
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      lastSyncTime: null, // Would be retrieved from storage
      pendingUploads: unsyncedRecordings.length,
      pendingDownloads: 0, // Would be calculated based on backend
    };
  }

  setOnStatusChange(callback: (status: SyncStatus) => void): void {
    this.onStatusChange = callback;
  }

  private notifyStatusChange(): void {
    if (this.onStatusChange) {
      this.getSyncStatus().then(this.onStatusChange);
    }
  }

  async cleanup(): Promise<void> {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }
}

export const syncService = new SyncService();

