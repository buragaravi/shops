import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  StatusBar,
  SafeAreaView,
  TouchableOpacity,
  RefreshControl,
  FlatList,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS } from '../../constants';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';

const { width: screenWidth } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const { user, isAuthenticated, logout, loading } = useAuth();
  const { state, loadCategories } = useApp();
  const [refreshing, setRefreshing] = useState(false);

  // Debug authentication state
  console.log('HomeScreen - isAuthenticated:', isAuthenticated);
  console.log('HomeScreen - user:', user);
  console.log('HomeScreen - auth loading:', loading);

  useEffect(() => {
    loadInitialData();
  }, []);

  // Also add effect to track auth state changes
  useEffect(() => {
    console.log('🏠 HomeScreen auth state changed:');
    console.log('  - isAuthenticated:', isAuthenticated);
    console.log('  - user:', user?.firstName || 'null');
    console.log('  - loading:', loading);
    console.log('  - token exists:', !!user);
  }, [isAuthenticated, user, loading]);

  // Load initial data
  const loadInitialData = async () => {
    try {
      console.log('🔄 Loading initial home screen data...');
      await loadCategories();
      console.log('✅ Home screen data loaded successfully');
    } catch (error) {
      console.error('❌ Error loading home screen data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadInitialData();
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleAuth = () => {
    if (isAuthenticated) {
      Alert.alert(
        'Account Options',
        `Welcome ${user?.firstName || 'User'}!`,
        [
          { text: 'View Profile', onPress: () => router.push('/profile') },
          { text: 'Logout', style: 'destructive', onPress: logout },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } else {
      router.push('/auth');
    }
  };

  const quickActions = [
    {
      id: 'products',
      title: 'Products',
      icon: 'storefront-outline',
      color: COLORS.PRIMARY,
      onPress: () => router.push('/products'),
    },
    {
      id: 'categories',
      title: 'Categories',
      icon: 'grid-outline',
      color: COLORS.SECONDARY,
      onPress: () => router.push('/categories'),
    },
    {
      id: 'cart',
      title: 'Cart',
      icon: 'cart-outline',
      color: COLORS.SUCCESS,
      onPress: () => router.push('/cart'),
    },
    {
      id: 'wishlist',
      title: 'Wishlist',
      icon: 'heart-outline',
      color: COLORS.ERROR,
      onPress: () => router.push('/wishlist'),
    },
  ];

  const renderQuickAction = ({ item }: { item: typeof quickActions[0] }) => (
    <TouchableOpacity style={styles.quickActionCard} onPress={item.onPress}>
      <View style={[styles.quickActionIcon, { backgroundColor: `${item.color}20` }]}>
        <Ionicons name={item.icon as any} size={32} color={item.color} />
      </View>
      <Text style={styles.quickActionTitle}>{item.title}</Text>
    </TouchableOpacity>
  );

  const renderCategoryItem = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={styles.categoryCard}
      onPress={() => router.push(`/products?category=${encodeURIComponent(item)}`)}
    >
      <View style={styles.categoryIcon}>
        <Ionicons name="apps-outline" size={24} color={COLORS.PRIMARY} />
      </View>
      <Text style={styles.categoryTitle}>{item}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.WHITE} />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.appName}>IndiraShop</Text>
          <Text style={styles.tagline}>Quality Groceries Delivered</Text>
        </View>
        
        <View style={styles.headerRight}>
          {isAuthenticated ? (
            <TouchableOpacity style={styles.profileButton} onPress={() => router.push('/profile')}>
              <View style={styles.profileAvatar}>
                <Text style={styles.profileInitial}>
                  {user?.firstName?.charAt(0)?.toUpperCase() || 'U'}
                </Text>
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>Hi, {user?.firstName || 'User'}</Text>
                <Text style={styles.profileEmail}>{user?.email || ''}</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.loginButton} onPress={handleAuth}>
              <Ionicons name="log-in-outline" size={20} color={COLORS.WHITE} />
              <Text style={styles.loginButtonText}>Sign In</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <FlatList
            data={quickActions}
            renderItem={renderQuickAction}
            keyExtractor={(item) => item.id}
            numColumns={2}
            scrollEnabled={false}
            contentContainerStyle={styles.quickActionsGrid}
          />
        </View>

        {/* Categories */}
        {state.categories.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Shop by Category</Text>
              <TouchableOpacity onPress={() => router.push('/categories')}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={state.categories.slice(0, 6)}
              renderItem={renderCategoryItem}
              keyExtractor={(item) => item}
              numColumns={3}
              scrollEnabled={false}
              contentContainerStyle={styles.categoriesGrid}
            />
          </View>
        )}

        {/* Featured Banner */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.bannerCard} onPress={() => router.push('/products')}>
            <View style={styles.bannerContent}>
              <Text style={styles.bannerTitle}>Explore Our Products</Text>
              <Text style={styles.bannerSubtitle}>Discover amazing deals and new arrivals</Text>
              <View style={styles.bannerButton}>
                <Text style={styles.bannerButtonText}>Shop Now</Text>
                <Ionicons name="arrow-forward" size={16} color={COLORS.WHITE} />
              </View>
            </View>
            <Ionicons name="storefront" size={60} color={COLORS.PRIMARY} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.WHITE,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  headerLeft: {
    flex: 1,
  },
  appName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
  },
  tagline: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 2,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  profileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    backgroundColor: `${COLORS.PRIMARY}10`,
  },
  profileAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  profileInitial: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.WHITE,
  },
  profileInfo: {
    alignItems: 'flex-start',
  },
  profileName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  profileEmail: {
    fontSize: 11,
    color: COLORS.TEXT_SECONDARY,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: COLORS.PRIMARY,
  },
  loginButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.WHITE,
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
  },
  viewAllText: {
    fontSize: 14,
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },
  quickActionsGrid: {
    gap: 12,
  },
  quickActionCard: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
    backgroundColor: COLORS.WHITE,
    borderRadius: 12,
    marginHorizontal: 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  quickActionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  quickActionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    textAlign: 'center',
  },
  categoriesGrid: {
    gap: 12,
  },
  categoryCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.WHITE,
    borderRadius: 8,
    marginHorizontal: 4,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${COLORS.PRIMARY}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  categoryTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.TEXT_PRIMARY,
    textAlign: 'center',
  },
  bannerCard: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bannerContent: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.WHITE,
    marginBottom: 4,
  },
  bannerSubtitle: {
    fontSize: 14,
    color: COLORS.WHITE,
    opacity: 0.9,
    marginBottom: 12,
  },
  bannerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.WHITE}20`,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  bannerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.WHITE,
    marginRight: 6,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 20,
    marginVertical: 8,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.WHITE,
    marginLeft: 6,
  },
  authButtonDisabled: {
    opacity: 0.6,
  },
  authButtonTextDisabled: {
    color: COLORS.GRAY,
  },
});
