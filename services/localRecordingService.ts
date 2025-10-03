import * as FileSystem from 'expo-file-system/legacy';

export interface LocalRecording {
  id: string;
  uri: string;
  fileName: string;
  createdAt: Date;
  duration?: number;
  songTitle?: string;
  songArtist?: string;
}

class LocalRecordingService {
  private recordings: LocalRecording[] = [];
  private readonly STORAGE_KEY = 'local_recordings';

  // Load recordings from storage on initialization
  async initialize(): Promise<void> {
    try {
      const stored = await FileSystem.readAsStringAsync(
        `${FileSystem.documentDirectory}${this.STORAGE_KEY}.json`
      );
      this.recordings = JSON.parse(stored).map((rec: any) => ({
        ...rec,
        createdAt: new Date(rec.createdAt)
      }));
    } catch (error) {
      this.recordings = [];
    }
  }

  // Save recordings to storage
  private async saveToStorage(): Promise<void> {
    try {
      await FileSystem.writeAsStringAsync(
        `${FileSystem.documentDirectory}${this.STORAGE_KEY}.json`,
        JSON.stringify(this.recordings)
      );
    } catch (error) {
      console.error('Failed to save recordings to storage:', error);
    }
  }

  // Add a new recording
  async addRecording(
    uri: string,
    metadata?: {
      duration?: number;
      songTitle?: string;
      songArtist?: string;
    }
  ): Promise<LocalRecording> {
    const fileName = uri.split('/').pop() || `recording_${Date.now()}.m4a`;
    const recording: LocalRecording = {
      id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      uri,
      fileName,
      createdAt: new Date(),
      ...metadata
    };

    this.recordings.unshift(recording); // Add to beginning
    await this.saveToStorage();
    
    return recording;
  }

  // Get all recordings
  getAllRecordings(): LocalRecording[] {
    return [...this.recordings]; // Return copy
  }

  // Get recording by ID
  getRecordingById(id: string): LocalRecording | undefined {
    return this.recordings.find(rec => rec.id === id);
  }

  // Delete recording
  async deleteRecording(id: string): Promise<boolean> {
    const recording = this.getRecordingById(id);
    if (!recording) return false;

    try {
      // Delete the actual file
      await FileSystem.deleteAsync(recording.uri, { idempotent: true });
      
      // Remove from array
      this.recordings = this.recordings.filter(rec => rec.id !== id);
      await this.saveToStorage();
      
      return true;
    } catch (error) {
      console.error('Failed to delete recording:', error);
      return false;
    }
  }

  // Update recording metadata
  async updateRecording(id: string, updates: Partial<LocalRecording>): Promise<boolean> {
    const index = this.recordings.findIndex(rec => rec.id === id);
    if (index === -1) return false;

    this.recordings[index] = { ...this.recordings[index], ...updates };
    await this.saveToStorage();
    
    return true;
  }

  // Get recordings count
  getRecordingsCount(): number {
    return this.recordings.length;
  }

  // Clear all recordings
  async clearAllRecordings(): Promise<void> {
    // Delete all files
    for (const recording of this.recordings) {
      try {
        await FileSystem.deleteAsync(recording.uri, { idempotent: true });
      } catch (error) {
        }
    }

    this.recordings = [];
    await this.saveToStorage();
    
    }

  // Get storage usage info
  async getStorageInfo(): Promise<{ totalSize: number; fileCount: number }> {
    let totalSize = 0;
    let fileCount = 0;

    for (const recording of this.recordings) {
      try {
        const info = await FileSystem.getInfoAsync(recording.uri);
        if (info.exists) {
          totalSize += info.size || 0;
          fileCount++;
        }
      } catch (error) {
        }
    }

    return { totalSize, fileCount };
  }

  // Format file size
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

export const localRecordingService = new LocalRecordingService();
