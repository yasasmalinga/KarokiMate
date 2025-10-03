import {
    collection,
    deleteDoc,
    disableNetwork,
    doc,
    enableNetwork,
    getDoc,
    getDocs,
    limit,
    orderBy,
    query,
    serverTimestamp,
    setDoc,
    Timestamp,
    updateDoc,
    where
} from 'firebase/firestore';
import {
    deleteObject,
    getDownloadURL,
    ref,
    uploadBytes
} from 'firebase/storage';
import { db, storage } from '../config/firebase';
import { LyricLine } from './database';

export interface FirebaseSong {
  id?: string;
  title: string;
  artist: string;
  duration: number;
  audioUrl: string;
  lyrics: LyricLine[];
  genre?: string;
  language?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  isPublic: boolean;
  uploadedBy?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  downloadCount: number;
  rating: number;
  tags: string[];
}

export interface FirebaseRecording {
  id?: string;
  userId: string;
  songId?: string | null;
  songTitle?: string | null;
  songArtist?: string | null;
  audioUrl: string;
  duration: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isPublic: boolean;
  tags: string[];
  rating?: number;
  playCount: number;
}

class FirebaseService {
  private songsCollection = 'songs';
  private recordingsCollection = 'recordings';
  private audioStoragePath = 'audio-files';
  private recordingsStoragePath = 'user-recordings';

  // Song operations
  async updateSong(songId: string, updates: Partial<FirebaseSong>): Promise<void> {
    try {
      const songRef = doc(db, this.songsCollection, songId);
      await updateDoc(songRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating song in Firebase:', error);
      throw error;
    }
  }

  async deleteSong(songId: string): Promise<void> {
    try {
      // Get song data first to delete associated files
      const song = await this.getSong(songId);
      if (song) {
        // Delete audio file from storage
        if (song.audioUrl.includes('firebasestorage')) {
          const audioRef = ref(storage, song.audioUrl);
          await deleteObject(audioRef);
        }
      }

      // Delete song document
      const songRef = doc(db, this.songsCollection, songId);
      await deleteDoc(songRef);
    } catch (error) {
      console.error('Error deleting song from Firebase:', error);
      throw error;
    }
  }

  async getSong(songId: string): Promise<FirebaseSong | null> {
    try {
      const songRef = doc(db, this.songsCollection, songId);
      const songSnap = await getDoc(songRef);
      
      if (songSnap.exists()) {
        return { id: songSnap.id, ...songSnap.data() } as FirebaseSong;
      }
      return null;
    } catch (error) {
      console.error('Error getting song from Firebase:', error);
      throw error;
    }
  }

  async getSongs(limitCount: number = 50): Promise<FirebaseSong[]> {
    try {
      // Simplified query to avoid composite index requirement
      const q = query(
        collection(db, this.songsCollection),
        where('isPublic', '==', true),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(q);
      const songs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FirebaseSong[];
      
      // Sort on client side to avoid index requirement
      return songs.sort((a, b) => {
        const aTime = a.createdAt?.toMillis() || 0;
        const bTime = b.createdAt?.toMillis() || 0;
        return bTime - aTime; // Descending order (newest first)
      });
    } catch (error) {
      console.error('Error getting songs from Firebase:', error);
      throw error;
    }
  }

  async searchSongs(searchTerm: string, limitCount: number = 20): Promise<FirebaseSong[]> {
    try {
      // Note: Firestore doesn't support full-text search natively
      // This is a basic implementation - for production, consider using Algolia or similar
      const q = query(
        collection(db, this.songsCollection),
        where('isPublic', '==', true),
        orderBy('title'),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(q);
      const allSongs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FirebaseSong[];

      // Filter on client side (not ideal for large datasets)
      const searchLower = searchTerm.toLowerCase();
      return allSongs.filter(song => 
        song.title.toLowerCase().includes(searchLower) ||
        song.artist.toLowerCase().includes(searchLower) ||
        song.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    } catch (error) {
      console.error('Error searching songs in Firebase:', error);
      throw error;
    }
  }

  async getSongsByGenre(genre: string, limitCount: number = 20): Promise<FirebaseSong[]> {
    try {
      const q = query(
        collection(db, this.songsCollection),
        where('isPublic', '==', true),
        where('genre', '==', genre),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(q);
      const songs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FirebaseSong[];
      
      // Sort on client side to avoid index requirement
      return songs.sort((a, b) => {
        const aTime = a.createdAt?.toMillis() || 0;
        const bTime = b.createdAt?.toMillis() || 0;
        return bTime - aTime; // Descending order (newest first)
      });
    } catch (error) {
      console.error('Error getting songs by genre from Firebase:', error);
      throw error;
    }
  }

  async getPopularSongs(limitCount: number = 20): Promise<FirebaseSong[]> {
    try {
      const q = query(
        collection(db, this.songsCollection),
        where('isPublic', '==', true),
        orderBy('downloadCount', 'desc'),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FirebaseSong[];
    } catch (error) {
      console.error('Error getting popular songs from Firebase:', error);
      throw error;
    }
  }

  // Audio file upload
  async uploadAudioFile(file: File | Blob, fileName: string): Promise<string> {
    try {
      const audioRef = ref(storage, `${this.audioStoragePath}/${fileName}`);
      const snapshot = await uploadBytes(audioRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      return downloadURL;
    } catch (error) {
      console.error('Error uploading audio file to Firebase Storage:', error);
      throw error;
    }
  }

  // Recording upload
  async uploadRecordingFile(fileUri: string, fileName: string): Promise<string> {
    try {
      const recordingRef = ref(storage, fileName);
      
      // For React Native, we need to use a different approach
      // Read the file and upload it
      const response = await fetch(fileUri);
      const blob = await response.blob();
      
      const snapshot = await uploadBytes(recordingRef, blob);
      const downloadURL = await getDownloadURL(snapshot.ref);
      return downloadURL;
    } catch (error) {
      console.error('Error uploading recording file to Firebase Storage:', error);
      throw error;
    }
  }

  // Recording operations
  async uploadRecording(
    userId: string,
    audioFile: File | Blob,
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
      // Generate unique filename
      const fileName = `recording_${userId}_${Date.now()}.m4a`;
      
      // Upload audio file to Firebase Storage
      const audioUrl = await this.uploadRecordingFile(audioFile, fileName);
      // Create recording document in Firestore
      const recordingData: Omit<FirebaseRecording, 'id' | 'createdAt' | 'updatedAt'> = {
        userId: userId,
        songId: metadata.songId,
        songTitle: metadata.songTitle,
        songArtist: metadata.songArtist,
        audioUrl: audioUrl,
        duration: metadata.duration,
        isPublic: metadata.isPublic || false,
        tags: metadata.tags || [],
        playCount: 0
      };

      const recordingRef = await this.addRecording(recordingData);
      // Update user's recording count
      await this.incrementUserRecordingCount(userId);
      
      return recordingRef;
    } catch (error) {
      console.error('❌ Failed to upload recording:', error);
      throw error;
    }
  }

  async addRecording(recordingData: Omit<FirebaseRecording, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const recordingRef = doc(collection(db, this.recordingsCollection));
      const recordingWithTimestamps = {
        ...recordingData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      await setDoc(recordingRef, recordingWithTimestamps);
      return recordingRef.id;
    } catch (error) {
      console.error('Error adding recording to Firebase:', error);
      throw error;
    }
  }

  async getUserRecordings(userId: string, limitCount: number = 50): Promise<FirebaseRecording[]> {
    try {
      // First get all recordings for the user, then sort in memory
      const q = query(
        collection(db, this.recordingsCollection),
        where('userId', '==', userId),
        limit(limitCount * 2) // Get more to account for sorting
      );
      
      const querySnapshot = await getDocs(q);
      const recordings = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FirebaseRecording[];
      
      // Sort by createdAt in memory
      recordings.sort((a, b) => {
        const aTime = a.createdAt.toMillis();
        const bTime = b.createdAt.toMillis();
        return bTime - aTime; // Descending order
      });
      
      // Return only the requested limit
      return recordings.slice(0, limitCount);
    } catch (error) {
      console.error('Error getting user recordings from Firebase:', error);
      throw error;
    }
  }

  async getPublicRecordings(limitCount: number = 50): Promise<FirebaseRecording[]> {
    try {
      const q = query(
        collection(db, this.recordingsCollection),
        where('isPublic', '==', true),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FirebaseRecording[];
    } catch (error) {
      console.error('Error getting public recordings from Firebase:', error);
      throw error;
    }
  }

  async getRecording(recordingId: string): Promise<FirebaseRecording | null> {
    try {
      const recordingRef = doc(db, this.recordingsCollection, recordingId);
      const recordingSnap = await getDoc(recordingRef);
      
      if (recordingSnap.exists()) {
        return { id: recordingSnap.id, ...recordingSnap.data() } as FirebaseRecording;
      }
      return null;
    } catch (error) {
      console.error('Error getting recording from Firebase:', error);
      throw error;
    }
  }

  async deleteRecording(recordingId: string): Promise<void> {
    try {
      console.log('🗑️ Deleting Firebase recording:', recordingId);
      
      // Get recording data first to delete associated files
      const recording = await this.getRecording(recordingId);
      console.log('📄 Recording data:', recording);
      
      if (recording) {
        // Delete audio file from storage
        if (recording.audioUrl && recording.audioUrl.includes('firebasestorage')) {
          console.log('🎵 Deleting audio file:', recording.audioUrl);
          const audioRef = ref(storage, recording.audioUrl);
          await deleteObject(audioRef);
          console.log('✅ Audio file deleted successfully');
        } else {
          console.log('⚠️ No valid audio URL found or not a Firebase storage URL');
        }
      } else {
        console.log('⚠️ Recording not found, proceeding with document deletion');
      }

      // Delete recording document
      console.log('📄 Deleting recording document...');
      const recordingRef = doc(db, this.recordingsCollection, recordingId);
      await deleteDoc(recordingRef);
      console.log('✅ Recording document deleted successfully');
      
    } catch (error) {
      console.error('❌ Error deleting recording from Firebase:', error);
      throw error;
    }
  }

  async updateRecording(recordingId: string, updates: Partial<FirebaseRecording>): Promise<void> {
    try {
      const recordingRef = doc(db, this.recordingsCollection, recordingId);
      await updateDoc(recordingRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating recording in Firebase:', error);
      throw error;
    }
  }

  async incrementRecordingPlayCount(recordingId: string): Promise<void> {
    try {
      const recordingRef = doc(db, this.recordingsCollection, recordingId);
      const recordingSnap = await getDoc(recordingRef);
      
      if (recordingSnap.exists()) {
        const currentCount = recordingSnap.data().playCount || 0;
        await updateDoc(recordingRef, {
          playCount: currentCount + 1,
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Error incrementing recording play count:', error);
      throw error;
    }
  }

  async incrementUserRecordingCount(userId: string): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const currentCount = userSnap.data().totalRecordings || 0;
        await updateDoc(userRef, {
          totalRecordings: currentCount + 1,
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Error incrementing user recording count:', error);
      throw error;
    }
  }

  // Song operations only - recordings are stored locally

  // Utility methods
  async incrementDownloadCount(songId: string): Promise<void> {
    try {
      const songRef = doc(db, this.songsCollection, songId);
      const songSnap = await getDoc(songRef);
      
      if (songSnap.exists()) {
        const currentCount = songSnap.data().downloadCount || 0;
        await updateDoc(songRef, {
          downloadCount: currentCount + 1,
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Error incrementing download count:', error);
      throw error;
    }
  }

  async updateSongRating(songId: string, newRating: number): Promise<void> {
    try {
      const songRef = doc(db, this.songsCollection, songId);
      await updateDoc(songRef, {
        rating: newRating,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating song rating:', error);
      throw error;
    }
  }

  // Sync local songs to Firebase
  async syncLocalSongToFirebase(localSong: any, audioFile?: File | Blob): Promise<string> {
    try {
      let audioUrl = localSong.audioUrl;
      
      // If we have an audio file, upload it to Firebase Storage
      if (audioFile) {
        const fileName = `${localSong.id}_${Date.now()}.mp3`;
        audioUrl = await this.uploadAudioFile(audioFile, fileName);
      }

      const firebaseSong: Omit<FirebaseSong, 'id' | 'createdAt' | 'updatedAt' | 'downloadCount' | 'rating'> = {
        title: localSong.title,
        artist: localSong.artist,
        duration: localSong.duration,
        audioUrl: audioUrl,
        lyrics: JSON.parse(localSong.lyrics),
        genre: 'Unknown',
        language: 'English',
        difficulty: 'medium',
        isPublic: true,
        uploadedBy: 'local-user',
        tags: [localSong.artist.toLowerCase(), localSong.title.toLowerCase()]
      };

      return await this.addSong(firebaseSong);
    } catch (error) {
      console.error('Error syncing local song to Firebase:', error);
      throw error;
    }
  }

  // Connection retry method
  private async retryConnection(): Promise<void> {
    try {
      await disableNetwork(db);
      await new Promise(resolve => setTimeout(resolve, 1000));
      await enableNetwork(db);
      } catch (error) {
      console.error('Failed to reconnect to Firestore:', error);
      throw error;
    }
  }
}

export const firebaseService = new FirebaseService();

