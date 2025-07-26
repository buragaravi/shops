import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../../constants';
import { useCartWishlist } from '../../contexts/CartWishlistContext';
import { COLORS } from '../../constants';
import TokenStorage from '../../utils/tokenStorage';
import AppHeader from '../../components/AppHeader';

interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  phone: string;
  addresses?: Array<{
    name: string;
    address: string;
    phone: string;
  }>;
}

interface ProfileData extends User {
  // Additional profile fields if needed
}

const ProfileScreen: React.FC = () => {
  const router = useRouter();
  const { cartCount, wishlistCount, clearCart, clearWishlist } = useCartWishlist();
  
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Profile editing state
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
  });
  const [updateLoading, setUpdateLoading] = useState(false);
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({
    name: '',
    address: '',
    phone: '',
  });
  const [addressLoading, setAddressLoading] = useState(false);

  useEffect(() => {
    checkAuthAndFetchProfile();
  }, []);

  const checkAuthAndFetchProfile = async () => {
    try {
      setLoading(true);
      
      // First check if we have a token
      const token = await TokenStorage.getToken();
      
      if (!token) {
        // No token, user needs to login
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }

      // Try to fetch profile with existing token
      const success = await fetchUserProfile(token);
      
      if (!success) {
        // Token invalid, try to auto-login with stored credentials
        await tryAutoLogin();
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProfile = async (token: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setFormData({
          name: data.user.name || '',
          phone: data.user.phone || '',
        });
        setIsAuthenticated(true);
        return true;
      } else {
        if (response.status === 401) {
          // Token expired or invalid
          await TokenStorage.clearAuthData();
          return false;
        }
        throw new Error('Failed to fetch profile');
      }
    } catch (error) {
      console.error('Profile fetch error:', error);
      return false;
    }
  };

  const tryAutoLogin = async () => {
    try {
      console.log('Attempting auto-login for remembered user');
      
      // Check if user opted for "remember me"
      const storedCredentials = await TokenStorage.getStoredCredentials();
      
      if (storedCredentials) {
        const { username, password } = storedCredentials;
        
        if (!username || !password) {
          console.log('Invalid stored credentials');
          return false;
        }
        
        console.log('Making auto-login request for user:', username);
        
        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username, password }),
        });

        const data = await response.json();

        if (response.ok) {
          console.log('Auto-login successful');
          
          // Store new token and user data using TokenStorage
          await TokenStorage.storeAuthData({
            token: data.token,
            user: data.user,
            userType: 'user'
          });
          
          setUser(data.user);
          setFormData({
            name: data.user?.name || '',
            phone: data.user?.phone || '',
          });
          setIsAuthenticated(true);
          return true;
        } else {
          console.log('Auto-login failed:', data.message || 'Unknown error');
        }
      } else {
        console.log('No stored credentials found');
      }
      
      // Auto-login failed, user needs to login manually
      setIsAuthenticated(false);
      return false;
    } catch (error) {
      console.error('Auto-login error:', error);
      setIsAuthenticated(false);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await checkAuthAndFetchProfile();
    setRefreshing(false);
  };

  const handleSignIn = () => {
    router.push('/auth');
  };

  const handleLogout = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear all auth data
              await AsyncStorage.multiRemove([
                'userToken',
                'user',
                'userType',
                'remember_me',
                'stored_credentials',
                'isAuthenticated'
              ]);
              
              // Clear cart and wishlist
              await clearCart();
              await clearWishlist();
              
              // Update state
              setIsAuthenticated(false);
              setUser(null);
              
              Alert.alert('Success', 'You have been signed out successfully');
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ]
    );
  };

  const updateProfile = async () => {
    if (!user) return;
    
    setUpdateLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setIsEditing(false);
        Alert.alert('Success', 'Profile updated successfully');
      } else {
        const data = await response.json();
        Alert.alert('Error', data.message || 'Error updating profile');
      }
    } catch (error) {
      console.error('Update profile error:', error);
      Alert.alert('Error', 'Error updating profile');
    } finally {
      setUpdateLoading(false);
    }
  };

  const addAddress = async () => {
    if (!newAddress.name || !newAddress.address || !newAddress.phone) {
      Alert.alert('Error', 'Please fill in all address fields');
      return;
    }

    setAddressLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      const response = await fetch(`${API_BASE_URL}/api/auth/address/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newAddress)
      });

      if (response.ok) {
        await fetchUserProfile(token!);
        setNewAddress({ name: '', address: '', phone: '' });
        setShowAddAddress(false);
        Alert.alert('Success', 'Address added successfully');
      } else {
        const data = await response.json();
        Alert.alert('Error', data.message || 'Error adding address');
      }
    } catch (error) {
      console.error('Add address error:', error);
      Alert.alert('Error', 'Error adding address');
    } finally {
      setAddressLoading(false);
    }
  };

  // Profile menu items
  const menuItems = [
    {
      id: 'orders',
      title: 'My Orders',
      subtitle: 'Track your orders',
      icon: 'receipt-outline',
      onPress: () => router.push('/orders'),
      badge: null,
    },
    {
      id: 'wishlist',
      title: 'My Wishlist',
      subtitle: 'Saved items',
      icon: 'heart-outline',
      onPress: () => router.push('/wishlist'),
      badge: wishlistCount > 0 ? wishlistCount : null,
    },
    {
      id: 'cart',
      title: 'Shopping Cart',
      subtitle: 'Items in cart',
      icon: 'bag-outline',
      onPress: () => router.push('/cart'),
      badge: cartCount > 0 ? cartCount : null,
    },
    {
      id: 'addresses',
      title: 'Addresses',
      subtitle: 'Manage delivery addresses',
      icon: 'location-outline',
      onPress: () => Alert.alert('Coming Soon', 'Address management will be available soon'),
      badge: null,
    },
    {
      id: 'payments',
      title: 'Payment Methods',
      subtitle: 'Manage payment options',
      icon: 'card-outline',
      onPress: () => Alert.alert('Coming Soon', 'Payment methods will be available soon'),
      badge: null,
    },
    {
      id: 'notifications',
      title: 'Notifications',
      subtitle: 'Manage preferences',
      icon: 'notifications-outline',
      onPress: () => Alert.alert('Coming Soon', 'Notification settings will be available soon'),
      badge: null,
    },
    {
      id: 'help',
      title: 'Help & Support',
      subtitle: 'Get assistance',
      icon: 'help-circle-outline',
      onPress: () => Alert.alert('Help & Support', 'Contact us at support@indiraa1.com'),
      badge: null,
    },
    {
      id: 'about',
      title: 'About',
      subtitle: 'App version & info',
      icon: 'information-circle-outline',
      onPress: () => Alert.alert('About Indiraa1', 'Version 1.0.0\n\nYour trusted shopping companion'),
      badge: null,
    },
  ];

  // Render profile header for authenticated users
  const renderAuthenticatedHeader = () => (
    <View style={styles.profileHeader}>
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </Text>
        </View>
      </View>
      
      <View style={styles.userInfo}>
        <Text style={styles.userName}>
          {user?.name || 'User'}
        </Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
        <Text style={styles.userPhone}>{user?.phone}</Text>
      </View>
      
      <TouchableOpacity 
        style={styles.editButton}
        onPress={() => Alert.alert('Coming Soon', 'Profile editing will be available soon')}
      >
        <Ionicons name="pencil" size={20} color={COLORS.PRIMARY} />
      </TouchableOpacity>
    </View>
  );

  // Render guest header
  const renderGuestHeader = () => (
    <View style={styles.guestHeader}>
      <View style={styles.guestAvatar}>
        <Ionicons name="person-outline" size={40} color="#9ca3af" />
      </View>
      
      <View style={styles.guestInfo}>
        <Text style={styles.guestTitle}>Welcome, Guest!</Text>
        <Text style={styles.guestSubtitle}>
          Sign in to sync your cart, wishlist, and orders across devices
        </Text>
      </View>
      
      <TouchableOpacity style={styles.signInButton} onPress={handleSignIn}>
        <Text style={styles.signInButtonText}>Sign In</Text>
      </TouchableOpacity>
    </View>
  );

  // Render menu item
  const renderMenuItem = (item: any) => (
    <TouchableOpacity
      key={item.id}
      style={styles.menuItem}
      onPress={item.onPress}
    >
      <View style={styles.menuItemLeft}>
        <View style={styles.menuIcon}>
          <Ionicons name={item.icon} size={24} color={COLORS.PRIMARY} />
        </View>
        
        <View style={styles.menuText}>
          <Text style={styles.menuTitle}>{item.title}</Text>
          <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
        </View>
      </View>
      
      <View style={styles.menuItemRight}>
        {item.badge && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{item.badge}</Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
      </View>
    </TouchableOpacity>
  );

  // Loading screen
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY} />
          <Text style={styles.loadingText}>Checking authentication...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Not authenticated - show sign in screen
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView 
          style={styles.scrollView} 
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          <View style={styles.guestContainer}>
            <View style={styles.guestHeader}>
              <View style={styles.guestAvatar}>
                <Ionicons name="person-outline" size={48} color="#9ca3af" />
              </View>
              
              <Text style={styles.guestTitle}>Welcome to Indiraa1!</Text>
              <Text style={styles.guestSubtitle}>
                Sign in to access your profile, orders, and synchronized cart & wishlist
              </Text>
              
              <TouchableOpacity style={styles.signInButton} onPress={handleSignIn}>
                <Ionicons name="log-in-outline" size={20} color="white" />
                <Text style={styles.signInButtonText}>Sign In</Text>
              </TouchableOpacity>
            </View>

            {/* Limited menu for guests */}
            <View style={styles.menuContainer}>
              <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/cart')}>
                <View style={styles.menuItemLeft}>
                  <View style={styles.menuIcon}>
                    <Ionicons name="bag-outline" size={24} color={COLORS.PRIMARY} />
                  </View>
                  <View style={styles.menuText}>
                    <Text style={styles.menuTitle}>Shopping Cart</Text>
                    <Text style={styles.menuSubtitle}>Items in cart</Text>
                  </View>
                </View>
                <View style={styles.menuItemRight}>
                  {cartCount > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{cartCount}</Text>
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/wishlist')}>
                <View style={styles.menuItemLeft}>
                  <View style={styles.menuIcon}>
                    <Ionicons name="heart-outline" size={24} color={COLORS.PRIMARY} />
                  </View>
                  <View style={styles.menuText}>
                    <Text style={styles.menuTitle}>Wishlist</Text>
                    <Text style={styles.menuSubtitle}>Saved items</Text>
                  </View>
                </View>
                <View style={styles.menuItemRight}>
                  {wishlistCount > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{wishlistCount}</Text>
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Authenticated - show full profile
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView} 
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Profile</Text>
        </View>

        {/* Profile Information Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.name ? user.name.charAt(0).toUpperCase() : user?.username?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
            
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user?.name || user?.username}</Text>
              <Text style={styles.profileEmail}>{user?.email}</Text>
            </View>

            <TouchableOpacity 
              style={styles.editButton} 
              onPress={() => setIsEditing(!isEditing)}
            >
              <Ionicons name={isEditing ? "close" : "pencil"} size={20} color={COLORS.PRIMARY} />
            </TouchableOpacity>
          </View>

          {/* Profile Edit Form */}
          {isEditing && (
            <View style={styles.editForm}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Username</Text>
                <TextInput
                  style={[styles.input, styles.disabledInput]}
                  value={user?.username}
                  editable={false}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                  placeholder="Enter your full name"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={[styles.input, styles.disabledInput]}
                  value={user?.email}
                  editable={false}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone</Text>
                <TextInput
                  style={styles.input}
                  value={formData.phone}
                  onChangeText={(text) => setFormData({ ...formData, phone: text })}
                  placeholder="Enter your phone number"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.editActions}>
                <TouchableOpacity 
                  style={[styles.saveButton, updateLoading && styles.disabledButton]} 
                  onPress={updateProfile}
                  disabled={updateLoading}
                >
                  {updateLoading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={20} color="white" />
                      <Text style={styles.saveButtonText}>Save Changes</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.cancelButton} 
                  onPress={() => {
                    setIsEditing(false);
                    setFormData({
                      name: user?.name || '',
                      phone: user?.phone || '',
                    });
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItem}
              onPress={item.onPress}
            >
              <View style={styles.menuItemLeft}>
                <View style={styles.menuIcon}>
                  <Ionicons name={item.icon as any} size={24} color={COLORS.PRIMARY} />
                </View>
                <View style={styles.menuText}>
                  <Text style={styles.menuTitle}>{item.title}</Text>
                  <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                </View>
              </View>
              <View style={styles.menuItemRight}>
                {item.badge && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.badge}</Text>
                  </View>
                )}
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout Button */}
        <View style={styles.logoutContainer}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#dc2626" />
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Made with ❤️ for better shopping</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.TEXT_SECONDARY,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
    backgroundColor: COLORS.WHITE,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
  },
  guestContainer: {
    flex: 1,
  },
  guestHeader: {
    paddingHorizontal: 20,
    paddingVertical: 40,
    backgroundColor: COLORS.WHITE,
    marginBottom: 20,
    alignItems: 'center',
  },
  guestAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.GRAY_LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  guestTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 12,
  },
  guestSubtitle: {
    fontSize: 16,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  signInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 25,
    gap: 8,
  },
  signInButtonText: {
    color: COLORS.WHITE,
    fontSize: 16,
    fontWeight: '600',
  },
  profileCard: {
    backgroundColor: COLORS.WHITE,
    marginBottom: 20,
    padding: 20,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.WHITE,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: 2,
  },
  userPhone: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
  },
  guestInfo: {
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
  },
  editButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: COLORS.GRAY_LIGHT,
  },
  editForm: {
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.TEXT_PRIMARY,
    backgroundColor: COLORS.WHITE,
  },
  disabledInput: {
    backgroundColor: COLORS.GRAY_LIGHT,
    color: COLORS.TEXT_SECONDARY,
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.PRIMARY,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  saveButtonText: {
    color: COLORS.WHITE,
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.GRAY_LIGHT,
    paddingVertical: 14,
    borderRadius: 12,
  },
  cancelButtonText: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  menuContainer: {
    backgroundColor: COLORS.WHITE,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.GRAY_LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuText: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    backgroundColor: COLORS.ERROR,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeText: {
    color: COLORS.WHITE,
    fontSize: 12,
    fontWeight: 'bold',
  },
  logoutContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  logoutText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#dc2626',
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
  },
});

export default ProfileScreen;
