import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { firebaseService } from '../services/firebaseService';

export const FirebaseDataManager: React.FC = () => {
  const [isAdding, setIsAdding] = useState(false);

  const sampleSongs = [
    {
      title: "Twinkle Twinkle Little Star",
      artist: "Traditional",
      duration: 30000,
      audioUrl: "https://www.learningcontainer.com/wp-content/uploads/2020/02/Kalimba.mp3",
      lyrics: [
        { text: "Twinkle, twinkle, little star", startTime: 0, endTime: 4000 },
        { text: "How I wonder what you are", startTime: 4000, endTime: 8000 },
        { text: "Up above the world so high", startTime: 8000, endTime: 12000 },
        { text: "Like a diamond in the sky", startTime: 12000, endTime: 16000 },
      ],
      genre: "Children",
      language: "English",
      difficulty: "easy" as const,
      isPublic: true,
      uploadedBy: "admin",
      tags: ["children", "traditional", "nursery", "easy"]
    },
    {
      title: "Happy Birthday",
      artist: "Traditional",
      duration: 15000,
      audioUrl: "https://www.learningcontainer.com/wp-content/uploads/2020/02/Kalimba.mp3",
      lyrics: [
        { text: "Happy birthday to you", startTime: 0, endTime: 3000 },
        { text: "Happy birthday to you", startTime: 3000, endTime: 6000 },
        { text: "Happy birthday dear friend", startTime: 6000, endTime: 9000 },
        { text: "Happy birthday to you", startTime: 9000, endTime: 12000 },
      ],
      genre: "Celebration",
      language: "English",
      difficulty: "easy" as const,
      isPublic: true,
      uploadedBy: "admin",
      tags: ["birthday", "celebration", "traditional", "easy"]
    },
    {
      title: "Imagine",
      artist: "John Lennon",
      duration: 183000,
      audioUrl: "https://www.learningcontainer.com/wp-content/uploads/2020/02/Kalimba.mp3",
      lyrics: [
        { text: "Imagine there's no heaven", startTime: 0, endTime: 4000 },
        { text: "It's easy if you try", startTime: 4000, endTime: 8000 },
        { text: "No hell below us", startTime: 8000, endTime: 12000 },
        { text: "Above us only sky", startTime: 12000, endTime: 16000 },
      ],
      genre: "Rock",
      language: "English",
      difficulty: "medium" as const,
      isPublic: true,
      uploadedBy: "admin",
      tags: ["rock", "classic", "peace", "medium"]
    }
  ];

  const addSampleSongs = async () => {
    setIsAdding(true);
    try {
      let addedCount = 0;
      
      for (const song of sampleSongs) {
        try {
          await firebaseService.addSong(song);
          addedCount++;
          } catch (error) {
          console.error(`❌ Failed to add ${song.title}:`, error);
        }
      }
      
      Alert.alert(
        'Success!', 
        `Successfully added ${addedCount} songs to Firebase!`
      );
    } catch (error) {
      console.error('Error adding songs:', error);
      Alert.alert('Error', 'Failed to add songs to Firebase');
    } finally {
      setIsAdding(false);
    }
  };

  const addSingleSong = async (song: typeof sampleSongs[0]) => {
    try {
      await firebaseService.addSong(song);
      Alert.alert('Success!', `Added "${song.title}" to Firebase!`);
    } catch (error) {
      console.error('Error adding song:', error);
      Alert.alert('Error', `Failed to add "${song.title}"`);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Firebase Data Manager</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Add Sample Songs</Text>
        <Text style={styles.description}>
          Add sample songs to your Firebase database for testing
        </Text>
        
        <TouchableOpacity
          style={[styles.button, styles.addAllButton]}
          onPress={addSampleSongs}
          disabled={isAdding}
        >
          {isAdding ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Add All Sample Songs</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Individual Songs</Text>
        {sampleSongs.map((song, index) => (
          <View key={index} style={styles.songItem}>
            <View style={styles.songInfo}>
              <Text style={styles.songTitle}>{song.title}</Text>
              <Text style={styles.songArtist}>{song.artist}</Text>
              <Text style={styles.songGenre}>Genre: {song.genre}</Text>
              <Text style={styles.songDifficulty}>Difficulty: {song.difficulty}</Text>
            </View>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => addSingleSong(song)}
            >
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Instructions</Text>
        <Text style={styles.instructionText}>
          1. Make sure your Firebase project is set up{'\n'}
          2. Update the Firebase config with your project details{'\n'}
          3. Click "Add All Sample Songs" to populate your database{'\n'}
          4. Use the Firebase Song Browser to view the added songs
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  addAllButton: {
    backgroundColor: '#34C759',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  songItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  songInfo: {
    flex: 1,
  },
  songTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  songArtist: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  songGenre: {
    fontSize: 12,
    color: '#888',
    marginBottom: 2,
  },
  songDifficulty: {
    fontSize: 12,
    color: '#888',
  },
  addButton: {
    backgroundColor: '#007AFF',
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});

export default FirebaseDataManager;

