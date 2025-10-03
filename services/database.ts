import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

export interface Song {
  id: string;
  title: string;
  artist: string;
  duration: number;
  audioUrl: string;
  lyrics: string;
  timing: string; // JSON string of timing data
  isDownloaded: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Recording {
  id: string;
  songId: string | null;
  audioPath: string;
  duration: number;
  createdAt: string;
  isSynced: boolean;
  rating?: number;
  title?: string;
  artist?: string;
  isPublic?: boolean;
  tags?: string[];
  playCount?: number;
}

export interface LyricLine {
  text: string;
  startTime: number;
  endTime: number;
}

class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;
  private isWeb = Platform.OS === 'web';
  private isInitialized = false;

  async init() {
    if (this.isInitialized) return;
    
    try {
      if (this.isWeb) {
        this.isInitialized = true;
        return;
      }
      
      this.db = await SQLite.openDatabaseAsync('karaokemate.db');
      
      // Test database connection
      if (!this.db) {
        throw new Error('Database connection failed');
      }
      
      await this.createTables();
      this.isInitialized = true;
      } catch (error) {
      console.error('Database initialization failed:', error);
      // Mark as initialized but with null database
      this.db = null;
      this.isInitialized = true;
      }
  }

  // Check if database is working
  private async isDatabaseWorking(): Promise<boolean> {
    if (!this.db) return false;
    
    try {
      await this.db.getAllAsync('SELECT 1');
      return true;
    } catch (error) {
      console.error('Database connection test failed:', error);
      this.db = null;
      return false;
    }
  }

  // Get database status for debugging
  getDatabaseStatus(): { isInitialized: boolean; hasDatabase: boolean; isWeb: boolean } {
    return {
      isInitialized: this.isInitialized,
      hasDatabase: this.db !== null,
      isWeb: this.isWeb
    };
  }

  private async createTables() {
    if (!this.db) return;

    try {
      // Test database connection first
      await this.db.getAllAsync('SELECT 1');
      
      // Songs table
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS songs (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          artist TEXT NOT NULL,
          duration INTEGER NOT NULL,
          audioUrl TEXT NOT NULL,
          lyrics TEXT NOT NULL,
          timing TEXT NOT NULL,
          isDownloaded BOOLEAN DEFAULT 0,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL
        );
      `);

      // Recordings table
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS recordings (
          id TEXT PRIMARY KEY,
          songId TEXT NOT NULL,
          audioPath TEXT NOT NULL,
          duration INTEGER NOT NULL,
          createdAt TEXT NOT NULL,
          isSynced BOOLEAN DEFAULT 0,
          rating INTEGER,
          FOREIGN KEY (songId) REFERENCES songs (id)
        );
      `);
      
      } catch (error) {
      console.error('Error creating database tables:', error);
      // Mark database as null if table creation fails
      this.db = null;
      throw error;
    }

    // Create indexes for better performance
    await this.db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_songs_artist ON songs(artist);
      CREATE INDEX IF NOT EXISTS idx_recordings_songId ON recordings(songId);
      CREATE INDEX IF NOT EXISTS idx_recordings_createdAt ON recordings(createdAt);
    `);
  }

  // Song operations
  async getSongs(): Promise<Song[]> {
    if (!this.db) return [];
    const result = await this.db.getAllAsync('SELECT * FROM songs ORDER BY title');
    return result as Song[];
  }

  async getSong(id: string): Promise<Song | null> {
    if (!this.db) return null;
    const result = await this.db.getFirstAsync('SELECT * FROM songs WHERE id = ?', [id]);
    return result as Song | null;
  }

  async saveSong(song: Omit<Song, 'createdAt' | 'updatedAt'>): Promise<void> {
    if (!this.db) return;
    const now = new Date().toISOString();
    await this.db.runAsync(
      `INSERT OR REPLACE INTO songs (id, title, artist, duration, audioUrl, lyrics, timing, isDownloaded, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [song.id, song.title, song.artist, song.duration, song.audioUrl, song.lyrics, song.timing, song.isDownloaded, now, now]
    );
  }

  async updateSongDownloadStatus(id: string, isDownloaded: boolean): Promise<void> {
    if (!this.db) return;
    const now = new Date().toISOString();
    await this.db.runAsync(
      'UPDATE songs SET isDownloaded = ?, updatedAt = ? WHERE id = ?',
      [isDownloaded, now, id]
    );
  }

  // Recording operations
  // Debug method to check database contents
  async debugDatabaseContents(): Promise<void> {
    if (this.isWeb) {
      return;
    }
    
    if (!this.db) {
      return;
    }
    
    try {
      // Check if tables exist
      const tables = await this.db.getAllAsync("SELECT name FROM sqlite_master WHERE type='table'");
      // Check recordings table
      const recordings = await this.db.getAllAsync('SELECT * FROM recordings');
      // Check songs table
      const songs = await this.db.getAllAsync('SELECT * FROM songs');
      } catch (error) {
      console.error('❌ Error debugging database:', error);
    }
  }

  // Recording operations - using local storage instead of SQLite
  async getRecordings(): Promise<Recording[]> {
    try {
      if (this.isWeb) {
        return this.getWebRecordings();
      }
      
      // For mobile, use AsyncStorage (local storage)
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const recordingsJson = await AsyncStorage.getItem('karaoke_recordings');
      
      console.log('📱 Database getRecordings - raw JSON:', recordingsJson);
      
      if (!recordingsJson) {
        console.log('📱 No recordings found in AsyncStorage');
        return [];
      }
      
      const recordings = JSON.parse(recordingsJson);
      console.log('📱 Parsed recordings:', recordings.length, recordings);
      return recordings;
    } catch (error) {
      console.error('❌ Error loading recordings from local storage:', error);
      return [];
    }
  }

  async getRecording(id: string): Promise<Recording | null> {
    try {
      if (this.isWeb) {
        return this.getWebRecording(id);
      }
      
      // For mobile, use AsyncStorage (local storage)
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const recordingsJson = await AsyncStorage.getItem('karaoke_recordings');
      
      if (!recordingsJson) {
        return null;
      }
      
      const recordings: Recording[] = JSON.parse(recordingsJson);
      const recording = recordings.find(r => r.id === id);
      
      if (recording) {
        return recording;
      } else {
        return null;
      }
    } catch (error) {
      console.error('❌ Error getting recording from local storage:', error);
      return null;
    }
  }

  async saveRecording(recording: Omit<Recording, 'createdAt'>): Promise<void> {
    try {
      if (this.isWeb) {
        return this.saveWebRecording(recording);
      }
      
      // For mobile, use AsyncStorage (local storage)
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      
      console.log('📱 Saving recording to local storage:', recording);
      
      // Get existing recordings
      const recordingsJson = await AsyncStorage.getItem('karaoke_recordings');
      let recordings: Recording[] = [];
      
      if (recordingsJson) {
        recordings = JSON.parse(recordingsJson);
        console.log('📱 Existing recordings count:', recordings.length);
      } else {
        console.log('📱 No existing recordings, starting fresh');
      }
      
      // Add new recording with timestamp
      const newRecording: Recording = {
        ...recording,
        createdAt: new Date().toISOString()
      };
      
      recordings.unshift(newRecording); // Add to beginning of array
      
      console.log('📱 Total recordings after adding:', recordings.length);
      
      // Save back to local storage
      await AsyncStorage.setItem('karaoke_recordings', JSON.stringify(recordings));
      console.log('✅ Recording saved to AsyncStorage successfully');
      
      } catch (error) {
      console.error('❌ Error saving recording to local storage:', error);
      throw error;
    }
  }

  async updateRecordingSyncStatus(id: string, isSynced: boolean): Promise<void> {
    if (this.isWeb) {
      return this.updateWebRecordingSyncStatus(id, isSynced);
    }
    
    if (!this.db) {
      return;
    }
    
    try {
      // Test database connection first
      await this.db.getAllAsync('SELECT 1');
      
      await this.db.runAsync('UPDATE recordings SET isSynced = ? WHERE id = ?', [isSynced, id]);
      } catch (error) {
      console.error('Database update error:', error);
      // If database fails, mark it as null
      this.db = null;
      // Don't throw error - continue even if local update fails
    }
  }

  async deleteRecording(id: string): Promise<void> {
    try {
      console.log('🗑️ Deleting local recording:', id);
      
      if (this.isWeb) {
        console.log('🌐 Deleting web recording...');
        return this.deleteWebRecording(id);
      }
      
      // For mobile, use AsyncStorage (local storage)
      console.log('📱 Deleting mobile recording...');
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const recordingsJson = await AsyncStorage.getItem('karaoke_recordings');
      
      if (!recordingsJson) {
        console.log('⚠️ No recordings found in storage');
        return;
      }
      
      const recordings: Recording[] = JSON.parse(recordingsJson);
      console.log('📄 Found recordings:', recordings.length);
      
      const filteredRecordings = recordings.filter(r => r.id !== id);
      console.log('📄 After filtering:', filteredRecordings.length);
      
      if (filteredRecordings.length === recordings.length) {
        console.log('⚠️ Recording not found in local storage');
        return;
      }
      
      // Save back to local storage
      await AsyncStorage.setItem('karaoke_recordings', JSON.stringify(filteredRecordings));
      console.log('✅ Recording deleted from local storage');
      
    } catch (error) {
      console.error('❌ Error deleting recording from local storage:', error);
      throw error;
    }
  }

  // Offline sync operations
  async getUnsyncedRecordings(): Promise<Recording[]> {
    if (!this.db) return [];
    const result = await this.db.getAllAsync('SELECT * FROM recordings WHERE isSynced = 0');
    return result as Recording[];
  }

  async getOfflineSongs(): Promise<Song[]> {
    if (!this.db) return [];
    const result = await this.db.getAllAsync('SELECT * FROM songs WHERE isDownloaded = 1');
    return result as Song[];
  }

  // Web storage fallback methods
  private getWebRecordings(): Recording[] {
    try {
      const recordingsJson = localStorage.getItem('karaokemate_recordings');
      if (!recordingsJson) return [];
      
      const recordings = JSON.parse(recordingsJson);
      return recordings;
    } catch (error) {
      console.error('Failed to load recordings from localStorage:', error);
      return [];
    }
  }

  private getWebRecording(id: string): Recording | null {
    try {
      const recordings = this.getWebRecordings();
      const recording = recordings.find(r => r.id === id);
      return recording || null;
    } catch (error) {
      console.error('Failed to get recording from localStorage:', error);
      return null;
    }
  }

  private updateWebRecordingSyncStatus(id: string, isSynced: boolean): void {
    try {
      const recordings = this.getWebRecordings();
      const updatedRecordings = recordings.map(recording => 
        recording.id === id ? { ...recording, isSynced } : recording
      );
      
      localStorage.setItem('karaokemate_recordings', JSON.stringify(updatedRecordings));
      } catch (error) {
      console.error('Failed to update recording sync status in localStorage:', error);
      throw error;
    }
  }

  private deleteWebRecording(id: string): void {
    try {
      const recordings = this.getWebRecordings();
      const updatedRecordings = recordings.filter(recording => recording.id !== id);
      
      localStorage.setItem('karaokemate_recordings', JSON.stringify(updatedRecordings));
      } catch (error) {
      console.error('Failed to delete recording from localStorage:', error);
      throw error;
    }
  }

  private saveWebRecording(recording: Omit<Recording, 'createdAt'>): void {
    try {
      const now = new Date().toISOString();
      const fullRecording: Recording = {
        ...recording,
        createdAt: now
      };
      
      const existingRecordings = this.getWebRecordings();
      const updatedRecordings = [fullRecording, ...existingRecordings];
      
      localStorage.setItem('karaokemate_recordings', JSON.stringify(updatedRecordings));
      } catch (error) {
      console.error('Failed to save recording to localStorage:', error);
      throw error;
    }
  }
}

export const databaseService = new DatabaseService();

