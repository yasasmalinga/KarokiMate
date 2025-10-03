# KaraokeMate - Offline-First Karaoke App

A React Native mobile application that provides offline-first karaoke recording with automatic cloud synchronization.

## 🎯 Features

- **Offline-First Recording**: Record and play karaoke without internet
- **Automatic Cloud Sync**: Background upload to Firebase when online
- **Smart Storage Management**: Local and cloud storage with intelligent switching
- **Real-time Lyrics**: Synchronized lyric display with audio
- **Cross-Platform**: Works on iOS and Android
- **User Authentication**: Secure login with Firebase Auth

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Expo CLI
- Firebase project

### Installation

1. **Clone the repository**
   ```bash
   git clone [repository-url]
   cd karokemate
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Configure Firebase**
   - Create a Firebase project
   - Enable Authentication, Firestore, and Storage
   - Update `config/firebase.ts` with your Firebase config

4. **Start the development server**
   ```bash
   npm start
   # or
   yarn start
   ```

5. **Run on device/simulator**
   - Scan QR code with Expo Go app
   - Or press 'a' for Android, 'i' for iOS

## 📱 How It Works

### Offline-First Architecture
1. **Record**: Audio is saved locally immediately
2. **Play**: Local recordings work without internet
3. **Sync**: Background upload to Firebase when online
4. **Access**: Cloud recordings available across devices

### Storage Management
- **Online**: Shows Firebase recordings
- **Offline**: Shows local recordings
- **Automatic**: Switches based on network status

## 🛠️ Technology Stack

- **Frontend**: React Native, Expo, TypeScript
- **Backend**: Firebase (Auth, Firestore, Storage)
- **Audio**: Expo AV
- **Storage**: AsyncStorage (local), Firebase (cloud)
- **Navigation**: Expo Router

## 📁 Project Structure

```
karokemate/
├── app/                    # App screens (Expo Router)
│   ├── (tabs)/            # Tab navigation
│   ├── karaoke.tsx        # Recording screen
│   ├── playback.tsx       # Playback screen
│   └── ...
├── components/            # Reusable components
├── services/              # Core services
│   ├── audioService.ts    # Audio recording/playback
│   ├── database.ts        # Local storage
│   ├── firebaseService.ts # Cloud storage
│   └── ...
├── contexts/              # React contexts
├── hooks/                 # Custom hooks
├── config/                # Configuration files
└── assets/                # Static assets
```

## 🔧 Configuration

### Firebase Setup
1. Create Firebase project
2. Enable Authentication, Firestore, Storage
3. Update `config/firebase.ts`:

```typescript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};
```

### Firebase Storage Rules
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /user-recordings/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /audio-files/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

## 📊 Key Features Explained

### 1. Offline Recording
- Records audio locally using Expo AV
- Saves metadata to AsyncStorage
- Works without internet connection

### 2. Cloud Synchronization
- Background upload to Firebase Storage
- Metadata stored in Firestore
- Automatic sync when online

### 3. Smart Display
- Shows appropriate recordings based on connectivity
- Visual indicators for storage type
- Seamless online/offline transitions

### 4. Audio Management
- High-quality audio recording
- Efficient local storage
- Cloud backup and access

## 🧪 Testing

### Offline Testing
1. Turn off internet connection
2. Record a song
3. Verify local save and playback
4. Turn internet back on
5. Check automatic sync

### Online Testing
1. Ensure internet connection
2. Record a song
3. Verify cloud upload
4. Check cross-device access

## 🚀 Deployment

### Development Build
```bash
npx expo run:android
npx expo run:ios
```

### Production Build
```bash
npx eas build --platform all
```

### Web Deployment
```bash
npx expo export:web
npx firebase deploy
```

## 📝 Scripts

- `npm start` - Start development server
- `npm run android` - Run on Android
- `npm run ios` - Run on iOS
- `npm run web` - Run on web
- `npm run build` - Build for production
- `npm run add-sample-data` - Add sample songs to Firebase

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Expo team for the excellent development platform
- Firebase for cloud services
- React Native community for support and resources

## 📞 Support

For support, email [your-email] or create an issue in the repository.

---

**Developed for SE5070 - Enterprise Mobility Course**# KarokiMate
