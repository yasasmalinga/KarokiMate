import { firebaseService, FirebaseSong } from '@/services/firebaseService';
import { useEffect, useState } from 'react';

export interface UseFirebaseSongsReturn {
  songs: FirebaseSong[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  searchSongs: (query: string) => Promise<void>;
  getSongsByGenre: (genre: string) => Promise<void>;
  getPopularSongs: () => Promise<void>;
}

export function useFirebaseSongs(): UseFirebaseSongsReturn {
  const [songs, setSongs] = useState<FirebaseSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSongs = async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedSongs = await firebaseService.getSongs(50);
      setSongs(fetchedSongs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch songs');
      console.error('Error fetching songs:', err);
    } finally {
      setLoading(false);
    }
  };

  const searchSongs = async (query: string) => {
    try {
      setLoading(true);
      setError(null);
      const searchResults = await firebaseService.searchSongs(query, 20);
      setSongs(searchResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search songs');
      console.error('Error searching songs:', err);
    } finally {
      setLoading(false);
    }
  };

  const getSongsByGenre = async (genre: string) => {
    try {
      setLoading(true);
      setError(null);
      const genreSongs = await firebaseService.getSongsByGenre(genre, 20);
      setSongs(genreSongs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch songs by genre');
      console.error('Error fetching songs by genre:', err);
    } finally {
      setLoading(false);
    }
  };

  const getPopularSongs = async () => {
    try {
      setLoading(true);
      setError(null);
      const popularSongs = await firebaseService.getPopularSongs(20);
      setSongs(popularSongs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch popular songs');
      console.error('Error fetching popular songs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSongs();
  }, []);

  return {
    songs,
    loading,
    error,
    refetch: fetchSongs,
    searchSongs,
    getSongsByGenre,
    getPopularSongs,
  };
}
