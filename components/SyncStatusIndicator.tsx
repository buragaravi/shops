import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NetworkManager } from '../utils/cartWishlistManager';
import { COLORS } from '../constants';

interface SyncStatusProps {
  type?: 'cart' | 'wishlist' | 'all';
  onSyncComplete?: () => void;
}

const SyncStatusIndicator: React.FC<SyncStatusProps> = ({ 
  type = 'all', 
  onSyncComplete 
}) => {
  const [pendingOperations, setPendingOperations] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    checkSyncStatus();
    
    // Check sync status every 30 seconds
    const interval = setInterval(checkSyncStatus, 30000);
    return () => clearInterval(interval);
  }, [type]);

  const checkSyncStatus = async () => {
    try {
      const pendingOps = await NetworkManager.getPendingOperations();
      
      let filteredOps = pendingOps;
      if (type === 'cart') {
        filteredOps = pendingOps.filter(op => op.type.startsWith('cart_'));
      } else if (type === 'wishlist') {
        filteredOps = pendingOps.filter(op => op.type.startsWith('wishlist_'));
      }
      
      setPendingOperations(filteredOps.length);
      
      const online = await NetworkManager.isOnline();
      setIsOnline(online);
    } catch (error) {
      console.error('Error checking sync status:', error);
    }
  };

  const handleSyncNow = async () => {
    if (!isOnline) {
      return;
    }

    try {
      setSyncing(true);
      await NetworkManager.syncPendingOperations();
      await checkSyncStatus();
      
      if (onSyncComplete) {
        onSyncComplete();
      }
    } catch (error) {
      console.error('Error syncing operations:', error);
    } finally {
      setSyncing(false);
    }
  };

  // Don't render if no pending operations
  if (pendingOperations === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.leftSection}>
          <Ionicons 
            name={isOnline ? "cloud-upload-outline" : "cloud-offline-outline"} 
            size={18} 
            color={isOnline ? COLORS.WARNING : COLORS.ERROR} 
          />
          <Text style={styles.statusText}>
            {pendingOperations} operation{pendingOperations > 1 ? 's' : ''} pending
          </Text>
        </View>
        
        {isOnline && (
          <TouchableOpacity 
            style={styles.syncButton} 
            onPress={handleSyncNow}
            disabled={syncing}
          >
            {syncing ? (
              <ActivityIndicator size="small" color={COLORS.WHITE} />
            ) : (
              <>
                <Ionicons name="sync" size={14} color={COLORS.WHITE} />
                <Text style={styles.syncButtonText}>Sync</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
      
      {!isOnline && (
        <Text style={styles.offlineText}>
          Will sync automatically when back online
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff3cd',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.WARNING,
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#856404',
    fontWeight: '500',
    flex: 1,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: 60,
    justifyContent: 'center',
  },
  syncButtonText: {
    color: COLORS.WHITE,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  offlineText: {
    fontSize: 12,
    color: '#856404',
    marginTop: 4,
    fontStyle: 'italic',
  },
});

export default SyncStatusIndicator;
