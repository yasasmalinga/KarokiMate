import * as FileSystem from 'expo-file-system/legacy';
import { databaseService, LyricLine, Song } from './database';
import { firebaseService, FirebaseSong } from './firebaseService';

export interface SongMetadata {
  id: string;
  title: string;
  artist: string;
  duration: number;
  audioUrl: string;
  lyrics: LyricLine[];
}

class SongService {
  private sampleSongs: SongMetadata[] = [
    {
      id: '1',
      title: 'Test Song',
      artist: 'Demo Artist',
      duration: 30000, // 30 seconds for easy testing
      audioUrl: 'https://www.learningcontainer.com/wp-content/uploads/2020/02/Kalimba.mp3', // Longer test audio
      lyrics: [
        { text: "This is line one", startTime: 0, endTime: 3000 },
        { text: "This is line two", startTime: 3000, endTime: 6000 },
        { text: "This is line three", startTime: 6000, endTime: 9000 },
        { text: "This is line four", startTime: 9000, endTime: 12000 },
        { text: "This is line five", startTime: 12000, endTime: 15000 },
        { text: "This is line six", startTime: 15000, endTime: 18000 },
        { text: "This is line seven", startTime: 18000, endTime: 21000 },
        { text: "This is line eight", startTime: 21000, endTime: 24000 },
        { text: "This is line nine", startTime: 24000, endTime: 27000 },
        { text: "This is line ten", startTime: 27000, endTime: 30000 },
      ]
    },
    {
      id: '2',
      title: 'Imagine',
      artist: 'John Lennon',
      duration: 183000, // 3:03 in milliseconds
      audioUrl: 'https://www.learningcontainer.com/wp-content/uploads/2020/02/Kalimba.mp3', // Direct audio file
      lyrics: [
        { text: "Imagine there's no heaven", startTime: 0, endTime: 4000 },
        { text: "It's easy if you try", startTime: 4000, endTime: 8000 },
        { text: "No hell below us", startTime: 8000, endTime: 12000 },
        { text: "Above us only sky", startTime: 12000, endTime: 16000 },
        { text: "Imagine all the people", startTime: 16000, endTime: 20000 },
        { text: "Living for today", startTime: 20000, endTime: 24000 },
        { text: "Imagine there's no countries", startTime: 24000, endTime: 28000 },
        { text: "It isn't hard to do", startTime: 28000, endTime: 32000 },
        { text: "Nothing to kill or die for", startTime: 32000, endTime: 36000 },
        { text: "And no religion too", startTime: 36000, endTime: 40000 },
      ]
    },
    {
      id: '3',
      title: 'Hotel California',
      artist: 'Eagles',
      duration: 391000, // 6:31 in milliseconds
      audioUrl: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav', // Test audio
      lyrics: [
        { text: "On a dark desert highway", startTime: 0, endTime: 4000 },
        { text: "Cool wind in my hair", startTime: 4000, endTime: 8000 },
        { text: "Warm smell of colitas", startTime: 8000, endTime: 12000 },
        { text: "Rising up through the air", startTime: 12000, endTime: 16000 },
        { text: "Up ahead in the distance", startTime: 16000, endTime: 20000 },
        { text: "I saw a shimmering light", startTime: 20000, endTime: 24000 },
        { text: "My head grew heavy and my sight grew dim", startTime: 24000, endTime: 28000 },
        { text: "I had to stop for the night", startTime: 28000, endTime: 32000 },
        { text: "There she stood in the doorway", startTime: 32000, endTime: 36000 },
        { text: "I heard the mission bell", startTime: 36000, endTime: 40000 },
        { text: "And I was thinking to myself", startTime: 40000, endTime: 44000 },
        { text: "This could be heaven or this could be hell", startTime: 44000, endTime: 48000 },
      ]
    },
    {
      id: '4',
      title: 'Happy Birthday',
      artist: 'Traditional',
      duration: 15000, // 15 seconds
      audioUrl: 'https://www.learningcontainer.com/wp-content/uploads/2020/02/Kalimba.mp3', // Test audio
      lyrics: [
        { text: "Happy birthday to you", startTime: 0, endTime: 3000 },
        { text: "Happy birthday to you", startTime: 3000, endTime: 6000 },
        { text: "Happy birthday dear friend", startTime: 6000, endTime: 9000 },
        { text: "Happy birthday to you", startTime: 9000, endTime: 12000 },
        { text: "Make a wish and blow the candles", startTime: 12000, endTime: 15000 },
      ]
    },
    {
      id: '5',
      title: 'Twinkle Twinkle Little Star',
      artist: 'Traditional',
      duration: 30000, // 30 seconds
      audioUrl: 'https://www.learningcontainer.com/wp-content/uploads/2020/02/Kalimba.mp3',
      lyrics: [
        { text: "Twinkle, twinkle, little star", startTime: 0, endTime: 4000 },
        { text: "How I wonder what you are", startTime: 4000, endTime: 8000 },
        { text: "Up above the world so high", startTime: 8000, endTime: 12000 },
        { text: "Like a diamond in the sky", startTime: 12000, endTime: 16000 },
        { text: "Twinkle, twinkle, little star", startTime: 16000, endTime: 20000 },
        { text: "How I wonder what you are", startTime: 20000, endTime: 24000 },
        { text: "When the blazing sun is gone", startTime: 24000, endTime: 28000 },
        { text: "When he nothing shines upon", startTime: 28000, endTime: 30000 },
      ]
    },
    {
      id: '6',
      title: 'Row Row Row Your Boat',
      artist: 'Traditional',
      duration: 20000, // 20 seconds
      audioUrl: 'https://www.learningcontainer.com/wp-content/uploads/2020/02/Kalimba.mp3',
      lyrics: [
        { text: "Row, row, row your boat", startTime: 0, endTime: 3000 },
        { text: "Gently down the stream", startTime: 3000, endTime: 6000 },
        { text: "Merrily, merrily, merrily, merrily", startTime: 6000, endTime: 10000 },
        { text: "Life is but a dream", startTime: 10000, endTime: 13000 },
        { text: "Row, row, row your boat", startTime: 13000, endTime: 16000 },
        { text: "Gently down the stream", startTime: 16000, endTime: 20000 },
      ]
    }
  ];

  async initialize(): Promise<void> {
    await databaseService.init();
    await this.loadSampleSongs();
  }

  async loadSampleSongs(): Promise<void> {
    try {
      for (const songMetadata of this.sampleSongs) {
        const existingSong = await databaseService.getSong(songMetadata.id);
        if (!existingSong) {
          const song: Omit<Song, 'createdAt' | 'updatedAt'> = {
            id: songMetadata.id,
            title: songMetadata.title,
            artist: songMetadata.artist,
            duration: songMetadata.duration,
            audioUrl: songMetadata.audioUrl,
            lyrics: JSON.stringify(songMetadata.lyrics),
            timing: JSON.stringify(songMetadata.lyrics),
            isDownloaded: false,
          };
          await databaseService.saveSong(song);
        }
      }
    } catch (error) {
      console.error('Failed to load sample songs:', error);
    }
  }

  async getSongs(): Promise<Song[]> {
    return await databaseService.getSongs();
  }

  async getSong(id: string): Promise<Song | null> {
    return await databaseService.getSong(id);
  }

  async getSongLyrics(songId: string): Promise<LyricLine[]> {
    const song = await databaseService.getSong(songId);
    if (!song) return [];
    
    try {
      return JSON.parse(song.lyrics) as LyricLine[];
    } catch (error) {
      console.error('Failed to parse lyrics:', error);
      return [];
    }
  }

  async downloadSong(songId: string): Promise<boolean> {
    try {
      const song = await databaseService.getSong(songId);
      if (!song) return false;

      // Create local directory for songs
      const songsDir = `${FileSystem.documentDirectory}songs/`;
      const dirInfo = await FileSystem.getInfoAsync(songsDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(songsDir, { intermediates: true });
      }

      // Download audio file
      const localPath = `${songsDir}${songId}.m4a`;
      const downloadResult = await FileSystem.downloadAsync(song.audioUrl, localPath);
      
      if (downloadResult.status === 200) {
        // Update song with local path
        const updatedSong: Omit<Song, 'createdAt' | 'updatedAt'> = {
          ...song,
          audioUrl: downloadResult.uri,
          isDownloaded: true,
        };
        await databaseService.saveSong(updatedSong);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to download song:', error);
      return false;
    }
  }

  async deleteDownloadedSong(songId: string): Promise<boolean> {
    try {
      const song = await databaseService.getSong(songId);
      if (!song || !song.isDownloaded) return false;

      // Delete local file
      const fileInfo = await FileSystem.getInfoAsync(song.audioUrl);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(song.audioUrl);
      }

      // Update song status
      await databaseService.updateSongDownloadStatus(songId, false);
      return true;
    } catch (error) {
      console.error('Failed to delete downloaded song:', error);
      return false;
    }
  }

  async searchSongs(query: string): Promise<Song[]> {
    const songs = await databaseService.getSongs();
    const lowercaseQuery = query.toLowerCase();
    
    return songs.filter(song => 
      song.title.toLowerCase().includes(lowercaseQuery) ||
      song.artist.toLowerCase().includes(lowercaseQuery)
    );
  }

  async getOfflineSongs(): Promise<Song[]> {
    return await databaseService.getOfflineSongs();
  }

  // Utility method to parse timing data
  parseTimingData(timingJson: string): LyricLine[] {
    try {
      return JSON.parse(timingJson) as LyricLine[];
    } catch (error) {
      console.error('Failed to parse timing data:', error);
      return [];
    }
  }

  // Utility method to format duration
  formatDuration(milliseconds: number): string {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  // Firebase integration methods
  async syncSongToFirebase(songId: string, audioFile?: File | Blob): Promise<string | null> {
    try {
      const localSong = await databaseService.getSong(songId);
      if (!localSong) {
        throw new Error('Song not found locally');
      }

      const firebaseSongId = await firebaseService.syncLocalSongToFirebase(localSong, audioFile);
      
      // Update local song with Firebase ID for future reference
      await databaseService.updateSongDownloadStatus(songId, true);
      
      return firebaseSongId;
    } catch (error) {
      console.error('Failed to sync song to Firebase:', error);
      return null;
    }
  }

  async getFirebaseSongs(limit: number = 50): Promise<FirebaseSong[]> {
    try {
      return await firebaseService.getSongs(limit);
    } catch (error) {
      console.error('Failed to get Firebase songs:', error);
      return [];
    }
  }

  async searchFirebaseSongs(query: string, limit: number = 20): Promise<FirebaseSong[]> {
    try {
      return await firebaseService.searchSongs(query, limit);
    } catch (error) {
      console.error('Failed to search Firebase songs:', error);
      return [];
    }
  }

  async getFirebaseSong(songId: string): Promise<FirebaseSong | null> {
    try {
      return await firebaseService.getSong(songId);
    } catch (error) {
      console.error('Failed to get Firebase song:', error);
      return null;
    }
  }

  async downloadFirebaseSong(firebaseSongId: string): Promise<boolean> {
    try {
      console.log('🎵 Starting download for Firebase song:', firebaseSongId);
      
      const firebaseSong = await firebaseService.getSong(firebaseSongId);
      if (!firebaseSong) {
        console.error('❌ Firebase song not found:', firebaseSongId);
        return false;
      }
      
      console.log('📄 Firebase song data:', {
        id: firebaseSong.id,
        title: firebaseSong.title,
        artist: firebaseSong.artist,
        audioUrl: firebaseSong.audioUrl
      });

      // Create local directory for songs
      const songsDir = `${FileSystem.documentDirectory}songs/`;
      console.log('📁 Songs directory:', songsDir);
      
      const dirInfo = await FileSystem.getInfoAsync(songsDir);
      if (!dirInfo.exists) {
        console.log('📁 Creating songs directory...');
        await FileSystem.makeDirectoryAsync(songsDir, { intermediates: true });
        console.log('✅ Songs directory created');
      }

      // Test the audio URL first
      console.log('🔍 Testing audio URL:', firebaseSong.audioUrl);
      try {
        const testResponse = await fetch(firebaseSong.audioUrl, { method: 'HEAD' });
        console.log('🌐 URL test response status:', testResponse.status);
        
        if (testResponse.status !== 200) {
          console.error('❌ Audio URL not accessible:', testResponse.status);
          throw new Error(`Audio URL returned status ${testResponse.status}`);
        }
        
        const contentLength = testResponse.headers.get('content-length');
        console.log('📏 Content length:', contentLength);
        if (contentLength && parseInt(contentLength) === 0) {
          console.error('❌ Audio file is empty on server');
          throw new Error('Audio file is empty on server');
        }
        console.log('✅ Audio URL test passed');
      } catch (urlError) {
        console.error('❌ Audio URL test failed:', urlError);
        
        // Try fallback URLs for testing
        console.log('🔄 Trying fallback URLs...');
        const fallbackUrls = [
          'https://www.learningcontainer.com/wp-content/uploads/2020/02/Kalimba.mp3',
          'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav'
        ];
        
        let workingUrl = null;
        for (const fallbackUrl of fallbackUrls) {
          try {
            console.log('🔍 Testing fallback URL:', fallbackUrl);
            const testResponse = await fetch(fallbackUrl, { method: 'HEAD' });
            if (testResponse.status === 200) {
              workingUrl = fallbackUrl;
              console.log('✅ Found working fallback URL:', fallbackUrl);
              break;
            }
          } catch (fallbackError) {
            console.log('❌ Fallback URL failed:', fallbackUrl);
          }
        }
        
        if (!workingUrl) {
          console.error('❌ No working URLs found');
          throw new Error(`Audio URL not accessible: ${urlError instanceof Error ? urlError.message : 'Unknown error'}`);
        }
        
        // Update the song with the working URL
        firebaseSong.audioUrl = workingUrl;
        console.log('🔄 Using fallback URL:', workingUrl);
      }

      // Download audio file with progress tracking
      const localPath = `${songsDir}${firebaseSongId}.m4a`;
      console.log('📥 Starting download to:', localPath);
      
      const downloadResult = await FileSystem.downloadAsync(
        firebaseSong.audioUrl, 
        localPath,
        {
          headers: {
            'User-Agent': 'KaraokeMate/1.0',
            'Accept': 'audio/*',
          },
        }
      );
      
      console.log('📥 Download result:', {
        status: downloadResult.status,
        uri: downloadResult.uri,
        headers: downloadResult.headers
      });
      
      if (downloadResult.status === 200) {
        // Verify file exists
        console.log('🔍 Verifying downloaded file...');
        const fileInfo = await FileSystem.getInfoAsync(downloadResult.uri);
        console.log('📄 File info:', {
          exists: fileInfo.exists,
          size: fileInfo.size,
          uri: fileInfo.uri
        });
        
        if (!fileInfo.exists || fileInfo.size === 0) {
          console.error('❌ Downloaded file is empty or missing');
          return false;
        }
        
        console.log('✅ File verification passed');
        
        // Save to AsyncStorage (like recordings)
        console.log('💾 Saving song to AsyncStorage...');
        const downloadedSong = {
          id: firebaseSongId,
          title: firebaseSong.title,
          artist: firebaseSong.artist,
          duration: firebaseSong.duration,
          audioUrl: downloadResult.uri,
          lyrics: firebaseSong.lyrics,
          timing: firebaseSong.lyrics,
          genre: firebaseSong.genre || 'Unknown',
          difficulty: firebaseSong.difficulty || 'Medium',
          downloadCount: firebaseSong.downloadCount || 0,
          rating: firebaseSong.rating || 0,
          tags: firebaseSong.tags || [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isDownloaded: true,
        };
        
        await this.saveDownloadedSong(downloadedSong);
        console.log('✅ Song saved to AsyncStorage');
        
        // Increment download count in Firebase
        try {
          await firebaseService.incrementDownloadCount(firebaseSongId);
          console.log('✅ Download count incremented');
        } catch (countError) {
          console.log('⚠️ Failed to increment download count (non-critical):', countError);
          // Don't fail the download for this
        }
        
        console.log('🎉 Download completed successfully!');
        return true;
      } else {
        console.error('❌ Download failed with status:', downloadResult.status);
        return false;
      }
      
    } catch (error) {
      console.error('❌ Failed to download Firebase song:', error);
      
      // Provide more specific error information
      if (error instanceof Error) {
        if (error.message.includes('Network')) {
          console.error('🌐 Network error - check internet connection');
        } else if (error.message.includes('timeout')) {
          console.error('⏰ Download timeout - try again');
        } else if (error.message.includes('404')) {
          console.error('🔍 Audio file not found on server');
        } else if (error.message.includes('403')) {
          console.error('🚫 Access denied to audio file');
        }
      }
      
      return false;
    }
  }

  // AsyncStorage methods for downloaded songs (like recordings)
  async saveDownloadedSong(song: any): Promise<void> {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      
      console.log('📱 Saving downloaded song to AsyncStorage:', song.title);
      
      // Get existing downloaded songs
      const songsJson = await AsyncStorage.getItem('karaoke_downloaded_songs');
      let songs: any[] = [];
      
      if (songsJson) {
        songs = JSON.parse(songsJson);
        console.log('📱 Existing downloaded songs count:', songs.length);
      } else {
        console.log('📱 No existing downloaded songs, starting fresh');
      }
      
      // Check if song already exists and update it, otherwise add new
      const existingIndex = songs.findIndex(s => s.id === song.id);
      if (existingIndex >= 0) {
        songs[existingIndex] = song;
        console.log('📱 Updated existing song');
      } else {
        songs.unshift(song); // Add to beginning of array
        console.log('📱 Added new song');
      }
      
      console.log('📱 Total downloaded songs after saving:', songs.length);
      
      // Save back to AsyncStorage
      await AsyncStorage.setItem('karaoke_downloaded_songs', JSON.stringify(songs));
      console.log('✅ Downloaded song saved to AsyncStorage successfully');
      
    } catch (error) {
      console.error('❌ Error saving downloaded song to AsyncStorage:', error);
      throw error;
    }
  }

  async getDownloadedSongs(): Promise<any[]> {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const songsJson = await AsyncStorage.getItem('karaoke_downloaded_songs');
      
      if (songsJson) {
        const songs = JSON.parse(songsJson);
        console.log('📱 Loaded downloaded songs:', songs.length);
        return songs;
      }
      
      console.log('📱 No downloaded songs found');
      return [];
    } catch (error) {
      console.error('❌ Error loading downloaded songs:', error);
      return [];
    }
  }

  async getDownloadedSong(songId: string): Promise<any | null> {
    try {
      const songs = await this.getDownloadedSongs();
      const song = songs.find(s => s.id === songId);
      return song || null;
    } catch (error) {
      console.error('❌ Error getting downloaded song:', error);
      return null;
    }
  }

  async deleteDownloadedSong(songId: string): Promise<boolean> {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      
      // Get existing downloaded songs
      const songsJson = await AsyncStorage.getItem('karaoke_downloaded_songs');
      if (!songsJson) {
        console.log('📱 No downloaded songs to delete');
        return false;
      }
      
      const songs = JSON.parse(songsJson);
      const filteredSongs = songs.filter((s: any) => s.id !== songId);
      
      if (filteredSongs.length === songs.length) {
        console.log('📱 Song not found in downloaded songs');
        return false;
      }
      
      // Save back to AsyncStorage
      await AsyncStorage.setItem('karaoke_downloaded_songs', JSON.stringify(filteredSongs));
      console.log('✅ Downloaded song deleted from AsyncStorage');
      
      return true;
    } catch (error) {
      console.error('❌ Error deleting downloaded song:', error);
      return false;
    }
  }

  async debugDownloadedSongs(): Promise<void> {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const songsJson = await AsyncStorage.getItem('karaoke_downloaded_songs');
      
      console.log('🔍 DEBUG: AsyncStorage content:');
      console.log('🔍 Raw JSON:', songsJson);
      
      if (songsJson) {
        const songs = JSON.parse(songsJson);
        console.log('🔍 Parsed songs:', songs);
        console.log('🔍 Number of songs:', songs.length);
        songs.forEach((song: any, index: number) => {
          console.log(`🔍 Song ${index + 1}:`, {
            id: song.id,
            title: song.title,
            artist: song.artist,
            isDownloaded: song.isDownloaded,
            audioUrl: song.audioUrl
          });
        });
      } else {
        console.log('🔍 No songs found in AsyncStorage');
      }
    } catch (error) {
      console.error('🔍 DEBUG: Error reading AsyncStorage:', error);
    }
  }

  async uploadSongToFirebase(
    title: string,
    artist: string,
    duration: number,
    lyrics: LyricLine[],
    audioFile: File | Blob,
    genre?: string,
    language?: string,
    difficulty?: 'easy' | 'medium' | 'hard',
    tags?: string[]
  ): Promise<string | null> {
    try {
      // Upload audio file first
      const fileName = `${title.replace(/\s+/g, '_')}_${artist.replace(/\s+/g, '_')}_${Date.now()}.mp3`;
      const audioUrl = await firebaseService.uploadAudioFile(audioFile, fileName);

      // Create song data
      const songData: Omit<FirebaseSong, 'id' | 'createdAt' | 'updatedAt' | 'downloadCount' | 'rating'> = {
        title,
        artist,
        duration,
        audioUrl,
        lyrics,
        genre: genre || 'Unknown',
        language: language || 'English',
        difficulty: difficulty || 'medium',
        isPublic: true,
        uploadedBy: 'current-user', // You might want to get this from auth
        tags: tags || [artist.toLowerCase(), title.toLowerCase()]
      };

      // Add song to Firebase
      const songId = await firebaseService.syncLocalSongToFirebase(songData);
      
      // Also save locally for offline access
      const localSong: Omit<Song, 'createdAt' | 'updatedAt'> = {
        id: songId,
        title,
        artist,
        duration,
        audioUrl: audioUrl,
        lyrics: JSON.stringify(lyrics),
        timing: JSON.stringify(lyrics),
        isDownloaded: false,
      };
      await databaseService.saveSong(localSong);

      return songId;
    } catch (error) {
      console.error('Failed to upload song to Firebase:', error);
      return null;
    }
  }

  async getPopularFirebaseSongs(limit: number = 20): Promise<FirebaseSong[]> {
    try {
      return await firebaseService.getPopularSongs(limit);
    } catch (error) {
      console.error('Failed to get popular Firebase songs:', error);
      return [];
    }
  }

  async getFirebaseSongsByGenre(genre: string, limit: number = 20): Promise<FirebaseSong[]> {
    try {
      return await firebaseService.getSongsByGenre(genre, limit);
    } catch (error) {
      console.error('Failed to get Firebase songs by genre:', error);
      return [];
    }
  }

  async rateFirebaseSong(songId: string, rating: number): Promise<boolean> {
    try {
      await firebaseService.updateSongRating(songId, rating);
      return true;
    } catch (error) {
      console.error('Failed to rate Firebase song:', error);
      return false;
    }
  }
}

export const songService = new SongService();
