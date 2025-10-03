import {
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    sendPasswordResetEmail,
    signInWithEmailAndPassword,
    signOut,
    updateProfile,
    User
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: string;
  lastLoginAt: string;
  totalRecordings: number;
  totalDuration: number;
  favoriteGenre?: string;
}

class AuthService {
  private currentUser: User | null = null;
  private authStateListeners: ((user: User | null) => void)[] = [];

  constructor() {
    // Listen for auth state changes
    onAuthStateChanged(auth, (user) => {
      this.currentUser = user;
      this.authStateListeners.forEach(listener => listener(user));
    });
  }

  // Register new user
  async register(email: string, password: string, displayName: string): Promise<UserProfile> {
    try {
      // Create user account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Update display name
      await updateProfile(user, {
        displayName: displayName
      });
      
      // Create user profile in Firestore
      const userProfile: UserProfile = {
        uid: user.uid,
        email: user.email!,
        displayName: displayName,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        totalRecordings: 0,
        totalDuration: 0,
        favoriteGenre: 'Unknown'
      };
      
      await setDoc(doc(db, 'users', user.uid), userProfile);
      return userProfile;
    } catch (error) {
      console.error('❌ Registration failed:', error);
      throw this.handleAuthError(error);
    }
  }

  // Login existing user
  async login(email: string, password: string): Promise<UserProfile> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Update last login time
      await setDoc(doc(db, 'users', user.uid), {
        lastLoginAt: new Date().toISOString()
      }, { merge: true });
      
      // Get user profile
      const userProfile = await this.getUserProfile(user.uid);
      return userProfile;
    } catch (error) {
      console.error('❌ Login failed:', error);
      throw this.handleAuthError(error);
    }
  }

  // Logout current user
  async logout(): Promise<void> {
    try {
      await signOut(auth);
      } catch (error) {
      console.error('❌ Logout failed:', error);
      throw this.handleAuthError(error);
    }
  }

  // Get current user
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  // Get user profile from Firestore
  async getUserProfile(uid: string): Promise<UserProfile> {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        return userDoc.data() as UserProfile;
      } else {
        throw new Error('User profile not found');
      }
    } catch (error) {
      console.error('❌ Failed to get user profile:', error);
      throw error;
    }
  }

  // Update user profile
  async updateUserProfile(uid: string, updates: Partial<UserProfile>): Promise<void> {
    try {
      await setDoc(doc(db, 'users', uid), updates, { merge: true });
      } catch (error) {
      console.error('❌ Failed to update user profile:', error);
      throw error;
    }
  }

  // Reset password
  async resetPassword(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(auth, email);
      } catch (error) {
      console.error('❌ Password reset failed:', error);
      throw this.handleAuthError(error);
    }
  }

  // Listen for auth state changes
  onAuthStateChange(callback: (user: User | null) => void): () => void {
    this.authStateListeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.authStateListeners.indexOf(callback);
      if (index > -1) {
        this.authStateListeners.splice(index, 1);
      }
    };
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  // Get user ID
  getUserId(): string | null {
    return this.currentUser?.uid || null;
  }

  // Get user email
  getUserEmail(): string | null {
    return this.currentUser?.email || null;
  }

  // Get user display name
  getUserDisplayName(): string | null {
    return this.currentUser?.displayName || null;
  }

  // Handle authentication errors
  private handleAuthError(error: any): Error {
    let message = 'Authentication failed';
    
    if (error.code) {
      switch (error.code) {
        case 'auth/email-already-in-use':
          message = 'Email is already registered';
          break;
        case 'auth/weak-password':
          message = 'Password is too weak';
          break;
        case 'auth/invalid-email':
          message = 'Invalid email address';
          break;
        case 'auth/user-not-found':
          message = 'No account found with this email';
          break;
        case 'auth/wrong-password':
          message = 'Incorrect password';
          break;
        case 'auth/too-many-requests':
          message = 'Too many failed attempts. Please try again later';
          break;
        case 'auth/network-request-failed':
          message = 'Network error. Please check your connection';
          break;
        default:
          message = error.message || 'Authentication failed';
      }
    }
    
    return new Error(message);
  }
}

export const authService = new AuthService();
