import { User } from 'firebase/auth';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { authService, UserProfile } from '../services/authService';
import { syncService } from '../services/syncService';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<UserProfile>;
  register: (email: string, password: string, displayName: string) => Promise<UserProfile>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Load saved login credentials on app start
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log('🔐 Initializing authentication...');
        
        // Set up Firebase auth state listener first
        const unsubscribe = authService.onAuthStateChange(async (user) => {
          console.log('🔐 Firebase auth state changed:', user ? `User logged in: ${user.email}` : 'User logged out');
          setUser(user);
          
          if (user) {
            try {
              console.log('👤 Loading user profile for:', user.email);
              const profile = await authService.getUserProfile(user.uid);
              console.log('✅ User profile loaded:', profile?.displayName || 'No display name');
              setUserProfile(profile);
              syncService.setUserId(user.uid);
            } catch (error) {
              console.error('❌ Failed to load user profile:', error);
              setUserProfile(null);
              syncService.setUserId(null);
            }
          } else {
            console.log('👤 User logged out, clearing profile');
            setUserProfile(null);
            syncService.setUserId(null);
          }
          
          setLoading(false);
        });

        // Set a fallback timeout to ensure loading doesn't get stuck
        const fallbackTimeout = setTimeout(() => {
          console.log('⏰ Auth initialization timeout, setting loading to false');
          setLoading(false);
        }, 3000); // 3 second timeout

        // Check if we have saved login credentials
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        const savedCredentials = await AsyncStorage.getItem('karaoke_saved_credentials');
        
        if (savedCredentials) {
          console.log('🔐 Found saved credentials, attempting auto-login...');
          const { email, password } = JSON.parse(savedCredentials);
          
          try {
            // Attempt to login with saved credentials
            const profile = await authService.login(email, password);
            console.log('✅ Auto-login successful:', profile.displayName);
            
            // Get the current user from Firebase
            const currentUser = authService.getCurrentUser();
            if (currentUser) {
              console.log('👤 Setting user state from auto-login:', currentUser.email);
              setUser(currentUser);
              setUserProfile(profile);
              syncService.setUserId(currentUser.uid);
            }
            
            // The Firebase auth state listener will also handle this, but we set it immediately for faster response
          } catch (error) {
            console.log('❌ Auto-login failed, clearing saved credentials:', error);
            // Clear invalid credentials
            await AsyncStorage.removeItem('karaoke_saved_credentials');
            // Ensure loading is set to false even if auto-login fails
            clearTimeout(fallbackTimeout);
            setLoading(false);
          }
        } else {
          console.log('🔐 No saved credentials found');
          // If no saved credentials, set loading to false immediately
          clearTimeout(fallbackTimeout);
          setLoading(false);
        }

        return () => {
          clearTimeout(fallbackTimeout);
          unsubscribe();
        };
      } catch (error) {
        console.error('❌ Error initializing auth:', error);
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string): Promise<UserProfile> => {
    setLoading(true);
    try {
      const profile = await authService.login(email, password);
      
      // Save credentials to AsyncStorage for auto-login
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.setItem('karaoke_saved_credentials', JSON.stringify({
        email,
        password,
        loginTime: new Date().toISOString()
      }));
      console.log('💾 Login credentials saved for auto-login');
      
      // Force update the user state
      const currentUser = authService.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        setUserProfile(profile);
      }
      
      return profile;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, displayName: string): Promise<UserProfile> => {
    setLoading(true);
    try {
      const profile = await authService.register(email, password, displayName);
      
      // Save credentials to AsyncStorage for auto-login
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.setItem('karaoke_saved_credentials', JSON.stringify({
        email,
        password,
        loginTime: new Date().toISOString()
      }));
      console.log('💾 Registration credentials saved for auto-login');
      
      // Force update the user state
      const currentUser = authService.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        setUserProfile(profile);
      }
      
      return profile;
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setLoading(true);
    try {
      console.log('🚪 AuthContext: Starting logout process...');
      
      // Clear saved credentials from AsyncStorage
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.removeItem('karaoke_saved_credentials');
      console.log('🗑️ Saved credentials cleared on logout');
      
      // Logout from Firebase
      await authService.logout();
      console.log('🔥 Firebase logout completed');
      
      // Clear local state immediately
      setUser(null);
      setUserProfile(null);
      syncService.setUserId(null);
      
      console.log('✅ AuthContext: Logout completed successfully');
    } catch (error) {
      console.error('❌ AuthContext: Logout error:', error);
      // Even if there's an error, clear the local state
      setUser(null);
      setUserProfile(null);
      syncService.setUserId(null);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string): Promise<void> => {
    await authService.resetPassword(email);
  };

  const updateProfile = async (updates: Partial<UserProfile>): Promise<void> => {
    if (!user) throw new Error('No user logged in');
    
    await authService.updateUserProfile(user.uid, updates);
    
    // Update local state
    setUserProfile(prev => prev ? { ...prev, ...updates } : null);
  };

  const value: AuthContextType = {
    user,
    userProfile,
    loading,
    login,
    register,
    logout,
    resetPassword,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
