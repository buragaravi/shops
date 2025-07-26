import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCartWishlist } from '../contexts/CartWishlistContext';
import { COLORS } from '../constants';
import TokenStorage from '../utils/tokenStorage';

interface HeaderProps {
  title: string;
  showWishlist?: boolean;
  showProfile?: boolean;
}

const AppHeader: React.FC<HeaderProps> = ({ 
  title, 
  showWishlist = true, 
  showProfile = true 
}) => {
  const router = useRouter();
  const { wishlistCount } = useCartWishlist();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const isAuth = await TokenStorage.isAuthenticated();
      setIsAuthenticated(isAuth);
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const handleWishlistPress = () => {
    if (isAuthenticated) {
      router.push('/(tabs)/wishlist');
    } else {
      Alert.alert(
        'Sign In Required',
        'Please sign in to access your wishlist',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => router.push('/auth') }
        ]
      );
    }
  };

  const handleProfilePress = () => {
    if (isAuthenticated) {
      router.push('/(tabs)/profile');
    } else {
      router.push('/auth');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.leftSection}>
          <Text style={styles.title}>{title}</Text>
        </View>
        
        <View style={styles.rightSection}>
          {showWishlist && (
            <TouchableOpacity 
              style={styles.iconButton} 
              onPress={handleWishlistPress}
            >
              <Ionicons 
                name={isAuthenticated ? "heart" : "heart-outline"} 
                size={24} 
                color={isAuthenticated ? COLORS.PRIMARY : COLORS.TEXT_SECONDARY} 
              />
              {isAuthenticated && wishlistCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{wishlistCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
          
          {showProfile && (
            <TouchableOpacity 
              style={styles.iconButton} 
              onPress={handleProfilePress}
            >
              <Ionicons 
                name={isAuthenticated ? "person" : "log-in-outline"} 
                size={24} 
                color={isAuthenticated ? COLORS.PRIMARY : COLORS.TEXT_SECONDARY} 
              />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: COLORS.WHITE,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.WHITE,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  leftSection: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    position: 'relative',
    padding: 8,
    borderRadius: 20,
    backgroundColor: COLORS.GRAY_LIGHT,
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: COLORS.ERROR,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeText: {
    color: COLORS.WHITE,
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default AppHeader;
