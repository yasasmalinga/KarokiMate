import { initializeApp } from 'firebase/app';
import { addDoc, collection, getFirestore, serverTimestamp } from 'firebase/firestore';

// Firebase configuration - using the actual config from the project
const firebaseConfig = {
  apiKey: "AIzaSyD2RIaK9dSViKTw2NZkAdnuK_OR2ugTf1g",
  authDomain: "karoki-7f866.firebaseapp.com",
  projectId: "karoki-7f866",
  storageBucket: "karoki-7f866.firebasestorage.app",
  messagingSenderId: "267694471343",
  appId: "1:267694471343:web:cb19d8d54e48c9d9453c5a",
  measurementId: "G-8QKZZCBK5H"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Sample songs data
const sampleSongs = [
  {
    title: "Twinkle Twinkle Little Star new",
    artist: "Traditional",
    duration: 30000, // 30 seconds
    audioUrl: "https://jayarathnemovers.lk/twincle.mp3",
    lyrics: [
      { text: "Twinkle, twinkle, little star", startTime: 1000, endTime: 15000 },
      { text: "How I wonder what you are", startTime: 16000, endTime: 21000 },
      { text: "Up above the world so high", startTime: 21000, endTime: 26000 },
      { text: "Like a diamond in the sky", startTime: 27000, endTime: 32000 },
      { text: "Twinkle, twinkle, little star", startTime: 32000, endTime: 37000 },
      { text: "How I wonder what you are", startTime: 37000, endTime: 42000 },
      { text: "When the blazing sun is gone", startTime: 42000, endTime: 28000 },
      { text: "When he nothing shines upon", startTime: 28000, endTime: 30000 },
    ],
    genre: "Children",
    language: "English",
    difficulty: "easy",
    isPublic: true,
    uploadedBy: "admin",
    downloadCount: 0,
    rating: 0,
    tags: ["children", "traditional", "nursery", "easy"]
  },
  {
    title: "Happy Birthday",
    artist: "Traditional",
    duration: 210000, // 210 seconds
    audioUrl: "https://jayarathnemovers.lk/happybirthday.mp3", 
    lyrics: [
      { text: "Happy birthday to you", startTime: 600, endTime: 12000 },
      { text: "Happy birthday to you", startTime: 12000, endTime: 17000 },
      { text: "Happy birthday dear friend", startTime: 17000, endTime: 23000 },
      { text: "Happy birthday to you", startTime: 23000, endTime: 29000 },
      { text: "Happy birthday to you", startTime: 29000, endTime: 35000 },
      { text: "Happy birthday to you", startTime: 35000, endTime: 41000 },
      { text: "Happy birthday dear friend", startTime: 41000, endTime: 47000 },
      { text: "Happy birthday to you", startTime: 47000, endTime: 53000 },
    ],
    genre: "Celebration",
    language: "English",
    difficulty: "easy",
    isPublic: true,
    uploadedBy: "admin",
    downloadCount: 0,
    rating: 0,
    tags: ["birthday", "celebration", "traditional", "easy"]
  }
];

async function addSampleData() {
  try {
    for (const song of sampleSongs) {
      const docRef = await addDoc(collection(db, 'songs'), {
        ...song,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
  } catch (error) {
    console.error('❌ Error adding sample data:', error);
  }
}

// Run the function
addSampleData();

