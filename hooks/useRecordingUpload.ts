import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { audioService } from '../services/audioService';
import { FirebaseRecording } from '../services/firebaseService';
import { LocalRecording } from '../services/localRecordingService';

export interface RecordingUploadOptions {
  songId?: string;
  songTitle?: string;
  songArtist?: string;
  duration: number;
  isPublic?: boolean;
  tags?: string[];
}

export interface UseRecordingUploadReturn {
  uploadRecording: (recordingUri: string, options: RecordingUploadOptions) => Promise<string>;
  getUserRecordings: () => Promise<FirebaseRecording[]>;
  getPublicRecordings: () => Promise<FirebaseRecording[]>;
  deleteRecording: (recordingId: string) => Promise<void>;
  updateRecordingVisibility: (recordingId: string, isPublic: boolean) => Promise<void>;
  getLocalRecordings: () => Promise<LocalRecording[]>;
  deleteLocalRecording: (recordingId: string) => Promise<boolean>;
  updateLocalRecording: (recordingId: string, updates: Partial<LocalRecording>) => Promise<boolean>;
  getStorageInfo: () => Promise<{ totalSize: number; fileCount: number; formattedSize: string }>;
  loading: boolean;
  error: string | null;
}

export const useRecordingUpload = (): UseRecordingUploadReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const uploadRecording = async (recordingUri: string, options: RecordingUploadOptions): Promise<string> => {
    if (!user) {
      throw new Error('User must be logged in to upload recordings');
    }

    setLoading(true);
    setError(null);

    try {
      const recordingId = await audioService.uploadRecordingToFirebase(
        recordingUri,
        user.uid,
        options
      );
      
      setLoading(false);
      return recordingId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload recording';
      setError(errorMessage);
      setLoading(false);
      throw err;
    }
  };

  const getUserRecordings = async (): Promise<FirebaseRecording[]> => {
    if (!user) {
      throw new Error('User must be logged in to get recordings');
    }

    setLoading(true);
    setError(null);

    try {
      const recordings = await audioService.getUserRecordings(user.uid);
      setLoading(false);
      return recordings;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get user recordings';
      setError(errorMessage);
      setLoading(false);
      throw err;
    }
  };

  const getPublicRecordings = async (): Promise<FirebaseRecording[]> => {
    setLoading(true);
    setError(null);

    try {
      const recordings = await audioService.getPublicRecordings();
      setLoading(false);
      return recordings;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get public recordings';
      setError(errorMessage);
      setLoading(false);
      throw err;
    }
  };

  const deleteRecording = async (recordingId: string): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      await audioService.deleteRecording(recordingId);
      setLoading(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete recording';
      setError(errorMessage);
      setLoading(false);
      throw err;
    }
  };

  const updateRecordingVisibility = async (recordingId: string, isPublic: boolean): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      await audioService.updateRecordingVisibility(recordingId, isPublic);
      setLoading(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update recording visibility';
      setError(errorMessage);
      setLoading(false);
      throw err;
    }
  };

  // Local recording methods
  const getLocalRecordings = async (): Promise<LocalRecording[]> => {
    setLoading(true);
    setError(null);

    try {
      const recordings = await audioService.getLocalRecordings();
      setLoading(false);
      return recordings;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get local recordings';
      setError(errorMessage);
      setLoading(false);
      throw err;
    }
  };

  const deleteLocalRecording = async (recordingId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const success = await audioService.deleteLocalRecording(recordingId);
      setLoading(false);
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete local recording';
      setError(errorMessage);
      setLoading(false);
      throw err;
    }
  };

  const updateLocalRecording = async (recordingId: string, updates: Partial<LocalRecording>): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const success = await audioService.updateLocalRecording(recordingId, updates);
      setLoading(false);
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update local recording';
      setError(errorMessage);
      setLoading(false);
      throw err;
    }
  };

  const getStorageInfo = async (): Promise<{ totalSize: number; fileCount: number; formattedSize: string }> => {
    setLoading(true);
    setError(null);

    try {
      const info = await audioService.getLocalRecordingStorageInfo();
      setLoading(false);
      return info;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get storage info';
      setError(errorMessage);
      setLoading(false);
      throw err;
    }
  };

  return {
    uploadRecording,
    getUserRecordings,
    getPublicRecordings,
    deleteRecording,
    updateRecordingVisibility,
    getLocalRecordings,
    deleteLocalRecording,
    updateLocalRecording,
    getStorageInfo,
    loading,
    error,
  };
};
