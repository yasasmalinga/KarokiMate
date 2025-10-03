import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '@/contexts/AuthContext';
import { databaseService } from '@/services/database';
import { syncService, SyncStatus } from '@/services/syncService';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Switch,
    TouchableOpacity,
    View,
} from 'react-native';

export default function SettingsTabScreen() {
  const { user, userProfile, logout } = useAuth();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: false,
    isSyncing: false,
    lastSyncTime: null,
    pendingUploads: 0,
    pendingDownloads: 0,
  });
  const [offlineMode, setOfflineMode] = useState(false);
  const [autoSync, setAutoSync] = useState(true);

  useEffect(() => {
    loadSettings();
    setupSyncListener();
  }, []);

  const loadSettings = async () => {
    try {
      await syncService.initialize();
      const status = await syncService.getSyncStatus();
      setSyncStatus(status);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const setupSyncListener = () => {
    syncService.setOnStatusChange(setSyncStatus);
  };

  const handleForceSync = async () => {
    try {
      await syncService.forceSync();
      Alert.alert('Success', 'Sync completed successfully');
    } catch (error) {
      console.error('Sync error:', error);
      Alert.alert('Error', 'Failed to sync. Please check your internet connection.');
    }
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'This will remove all downloaded songs and recordings. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear offline songs
              const songs = await databaseService.getSongs();
              for (const song of songs) {
                if (song.isDownloaded) {
                  await databaseService.updateSongDownloadStatus(song.id, false);
                }
              }
              Alert.alert('Success', 'Cache cleared successfully');
            } catch (error) {
              console.error('Clear cache error:', error);
              Alert.alert('Error', 'Failed to clear cache');
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              Alert.alert('Success', 'Logged out successfully');
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to logout');
            }
          },
        },
      ]
    );
  };

  const formatLastSync = (lastSyncTime: string | null) => {
    if (!lastSyncTime) return 'Never';
    const date = new Date(lastSyncTime);
    return date.toLocaleString();
  };

  const renderSettingItem = (
    title: string,
    subtitle: string,
    icon: string,
    onPress: () => void,
    rightElement?: React.ReactNode
  ) => (
    <TouchableOpacity style={styles.settingItem} onPress={onPress}>
      <View style={styles.settingLeft}>
        <View style={styles.settingIcon}>
          <Ionicons name={icon as any} size={24} color="#FF6B6B" />
        </View>
        <View style={styles.settingText}>
          <ThemedText style={styles.settingTitle}>{title}</ThemedText>
          <ThemedText style={styles.settingSubtitle}>{subtitle}</ThemedText>
        </View>
      </View>
      {rightElement || <Ionicons name="chevron-forward" size={20} color="#666" />}
    </TouchableOpacity>
  );

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title" style={styles.headerTitle}>Settings</ThemedText>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Sync Status */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Sync Status</ThemedText>
          
          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <ThemedText style={styles.statusLabel}>Connection</ThemedText>
              <View style={styles.statusValue}>
                <View style={[
                  styles.statusIndicator,
                  { backgroundColor: syncStatus.isOnline ? '#4CAF50' : '#F44336' }
                ]} />
                <ThemedText style={styles.statusText}>
                  {syncStatus.isOnline ? 'Online' : 'Offline'}
                </ThemedText>
              </View>
            </View>
            
            <View style={styles.statusRow}>
              <ThemedText style={styles.statusLabel}>Sync Status</ThemedText>
              <ThemedText style={styles.statusText}>
                {syncStatus.isSyncing ? 'Syncing...' : 'Idle'}
              </ThemedText>
            </View>
            
            <View style={styles.statusRow}>
              <ThemedText style={styles.statusLabel}>Last Sync</ThemedText>
              <ThemedText style={styles.statusText}>
                {formatLastSync(syncStatus.lastSyncTime)}
              </ThemedText>
            </View>
            
            <View style={styles.statusRow}>
              <ThemedText style={styles.statusLabel}>Pending Uploads</ThemedText>
              <ThemedText style={styles.statusText}>
                {syncStatus.pendingUploads}
              </ThemedText>
            </View>
          </View>

          <TouchableOpacity 
            style={[
              styles.syncButton,
              (!syncStatus.isOnline || syncStatus.isSyncing) && styles.syncButtonDisabled
            ]}
            onPress={handleForceSync}
            disabled={!syncStatus.isOnline || syncStatus.isSyncing}
          >
            <Ionicons 
              name={syncStatus.isSyncing ? "refresh" : "sync"} 
              size={20} 
              color="#fff" 
            />
            <ThemedText style={styles.syncButtonText}>
              {syncStatus.isSyncing ? 'Syncing...' : 'Force Sync'}
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* App Settings */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>App Settings</ThemedText>
          
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={styles.settingIcon}>
                <Ionicons name="wifi" size={24} color="#FF6B6B" />
              </View>
              <View style={styles.settingText}>
                <ThemedText style={styles.settingTitle}>Offline Mode</ThemedText>
                <ThemedText style={styles.settingSubtitle}>
                  Use only downloaded content
                </ThemedText>
              </View>
            </View>
            <Switch
              value={offlineMode}
              onValueChange={setOfflineMode}
              trackColor={{ false: '#666', true: '#FF6B6B' }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={styles.settingIcon}>
                <Ionicons name="sync" size={24} color="#FF6B6B" />
              </View>
              <View style={styles.settingText}>
                <ThemedText style={styles.settingTitle}>Auto Sync</ThemedText>
                <ThemedText style={styles.settingSubtitle}>
                  Automatically sync when online
                </ThemedText>
              </View>
            </View>
            <Switch
              value={autoSync}
              onValueChange={setAutoSync}
              trackColor={{ false: '#666', true: '#FF6B6B' }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Data Management */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Data Management</ThemedText>
          
          {renderSettingItem(
            'Clear Cache',
            'Remove all downloaded songs',
            'trash-outline',
            handleClearCache
          )}
        </View>

        {/* User Account */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Account</ThemedText>
          
          {userProfile && (
            <View style={styles.userCard}>
              <View style={styles.userInfo}>
                <View style={styles.userAvatar}>
                  <Ionicons name="person" size={24} color="#FF6B6B" />
                </View>
                <View style={styles.userDetails}>
                  <ThemedText style={styles.userName}>{userProfile.displayName}</ThemedText>
                  <ThemedText style={styles.userEmail}>{userProfile.email}</ThemedText>
                  <ThemedText style={styles.userStats}>
                    {userProfile.totalRecordings} recordings • {Math.floor(userProfile.totalDuration / 60000)} min
                  </ThemedText>
                </View>
              </View>
            </View>
          )}
          
          {renderSettingItem(
            'Logout',
            'Sign out of your account',
            'log-out-outline',
            handleLogout
          )}
        </View>

        {/* About */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>About</ThemedText>
          
          {renderSettingItem(
            'Version',
            '1.0.0',
            'information-circle-outline',
            () => {}
          )}
          
          {renderSettingItem(
            'Help & Support',
            'Get help and report issues',
            'help-circle-outline',
            () => Alert.alert('Help', 'Help functionality will be implemented')
          )}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#2a2a2a',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  statusCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusLabel: {
    fontSize: 14,
    color: '#ccc',
  },
  statusValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B6B',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
  },
  syncButtonDisabled: {
    backgroundColor: '#666',
  },
  syncButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 8,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
  },
  settingLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#ccc',
  },
  userCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 4,
  },
  userStats: {
    fontSize: 12,
    color: '#999',
  },
});

