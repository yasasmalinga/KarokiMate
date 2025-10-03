import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import { Alert } from 'react-native';

export interface ShareOptions {
  title: string;
  message: string;
  url?: string;
  filePath?: string;
}

class ShareService {
  async shareRecording(recordingPath: string, songTitle: string, artist: string): Promise<boolean> {
    try {
      // Request permissions
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant permission to access media library');
        return false;
      }

      // Create a shareable file
      const shareablePath = await this.prepareRecordingForShare(recordingPath, songTitle, artist);
      
      // Save to media library
      const asset = await MediaLibrary.createAssetAsync(shareablePath);
      
      // Create album if it doesn't exist
      const albumName = 'KaraokeMate Recordings';
      let album = await MediaLibrary.getAlbumAsync(albumName);
      if (!album) {
        album = await MediaLibrary.createAlbumAsync(albumName, asset, false);
      } else {
        await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
      }

      Alert.alert(
        'Recording Saved',
        `Your recording of "${songTitle}" by ${artist} has been saved to your media library and can now be shared!`,
        [
          { text: 'OK', style: 'default' }
        ]
      );

      return true;
    } catch (error) {
      console.error('Failed to share recording:', error);
      Alert.alert('Error', 'Failed to share recording');
      return false;
    }
  }

  private async prepareRecordingForShare(recordingPath: string, songTitle: string, artist: string): Promise<string> {
    try {
      // Create a copy with a more descriptive name
      const fileName = `${songTitle} - ${artist} (KaraokeMate).m4a`;
      const shareablePath = `${FileSystem.documentDirectory}${fileName}`;
      
      // Copy the file
      await FileSystem.copyAsync({
        from: recordingPath,
        to: shareablePath,
      });

      return shareablePath;
    } catch (error) {
      console.error('Failed to prepare recording for share:', error);
      throw error;
    }
  }

  async shareApp(): Promise<boolean> {
    try {
      const shareOptions: ShareOptions = {
        title: 'KaraokeMate - Record Karaoke',
        message: 'Check out KaraokeMate - the best karaoke app for recording your performances!',
        url: 'https://example.com/karokemate', // Replace with actual app store URL
      };

      // In a real app, you would use a sharing library like expo-sharing
      Alert.alert(
        'Share KaraokeMate',
        'Tell your friends about KaraokeMate!',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Share', onPress: () => this.performShare(shareOptions) }
        ]
      );

      return true;
    } catch (error) {
      console.error('Failed to share app:', error);
      return false;
    }
  }

  private async performShare(options: ShareOptions): Promise<void> {
    // This would integrate with the device's native sharing capabilities
    // For now, we'll just show a placeholder
    Alert.alert('Share', `Sharing: ${options.title}\n${options.message}`);
  }

  async exportRecordings(): Promise<string | null> {
    try {
      // Create a zip file with all recordings
      const recordingsDir = `${FileSystem.documentDirectory}recordings/`;
      const exportPath = `${FileSystem.documentDirectory}karaokemate_recordings_${Date.now()}.zip`;
      
      // In a real app, you would use a zip library to create the archive
      Alert.alert('Export', 'Export functionality will be implemented with a zip library');
      
      return null;
    } catch (error) {
      console.error('Failed to export recordings:', error);
      Alert.alert('Error', 'Failed to export recordings');
      return null;
    }
  }

  async importRecordings(): Promise<boolean> {
    try {
      // In a real app, this would allow users to import recordings from files
      Alert.alert('Import', 'Import functionality will be implemented');
      return false;
    } catch (error) {
      console.error('Failed to import recordings:', error);
      Alert.alert('Error', 'Failed to import recordings');
      return false;
    }
  }

  async shareToSocialMedia(platform: 'facebook' | 'twitter' | 'instagram', content: string): Promise<boolean> {
    try {
      const shareOptions: ShareOptions = {
        title: 'KaraokeMate Recording',
        message: content,
      };

      // In a real app, you would integrate with social media SDKs
      Alert.alert(
        `Share to ${platform.charAt(0).toUpperCase() + platform.slice(1)}`,
        `Sharing: ${content}`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Share', onPress: () => this.performShare(shareOptions) }
        ]
      );

      return true;
    } catch (error) {
      console.error(`Failed to share to ${platform}:`, error);
      return false;
    }
  }
}

export const shareService = new ShareService();

