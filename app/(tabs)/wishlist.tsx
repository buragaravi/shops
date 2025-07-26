import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  Image,
  Alert,
  ActivityIndicator,
  Dimensions,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS } from '../../constants';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import type { WishlistItem } from '../../services/apiService';

const { width: screenWidth } = Dimensions.get('window');

export default function WishlistScreen() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const { 
    state, 
    loadWishlist, 
    addToWishlist, 
    removeFromWishlist,
    addToCart
  } = useApp();
  
  const [refreshing, setRefreshing] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      loadInitialData();
    }
  }, [isAuthenticated]);

  // Redirect to auth if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      Alert.alert(
        'Authentication Required',
        'Please login to view your wishlist',
        [
          { text: 'Login', onPress: () => router.push('/auth') },
          { text: 'Cancel', onPress: () => router.back() }
        ]
      );
    }
  }, [isAuthenticated]);

  const loadInitialData = async () => {
    try {
      console.log('Loading wishlist data...');
      await loadWishlist();
    } catch (error) {
      console.error('Error loading wishlist:', error);
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

  const handleRemoveFromWishlist = async (itemId: string) => {
    Alert.alert(
      'Remove from Wishlist',
      'Are you sure you want to remove this item from your wishlist?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setRemoving(itemId);
            try {
              await removeFromWishlist(itemId);
            } catch (error) {
              console.error('Error removing from wishlist:', error);
              Alert.alert('Error', 'Failed to remove item from wishlist');
            } finally {
              setRemoving(null);
            }
          },
        },
      ]
    );
  };

  const handleAddToCart = async (item: WishlistItem) => {
    try {
      const success = await addToCart(item.productId._id, 1);
      if (success) {
        Alert.alert('Success', 'Item added to cart successfully!');
      } else {
        Alert.alert('Error', 'Failed to add item to cart');
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      Alert.alert('Error', 'Failed to add item to cart');
    }
  };

  const renderWishlistItem = ({ item }: { item: WishlistItem }) => {
    const isRemoving = removing === item._id;
    const product = item.productId;

    return (
      <View style={styles.wishlistItem}>
        {isRemoving && <View style={styles.removingOverlay} />}
        
        <TouchableOpacity 
          style={styles.itemContainer}
          onPress={() => router.push(`/product/${product._id}`)}
        >
          <Image 
            source={{ uri: product.images?.[0] || 'https://via.placeholder.com/300x300?text=No+Image' }} 
            style={styles.productImage} 
          />
          
          <View style={styles.productInfo}>
            <Text style={styles.productName} numberOfLines={2}>
              {product.name}
            </Text>
            <Text style={styles.categoryText}>{product.category}</Text>
            
            <View style={styles.priceContainer}>
              <Text style={styles.price}>₹{product.price}</Text>
              {product.originalPrice && product.originalPrice > product.price && (
                <Text style={styles.originalPrice}>₹{product.originalPrice}</Text>
              )}
            </View>
            
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={14} color="#FFD700" />
              <Text style={styles.rating}>
                {product.averageRating?.toFixed(1) || 'No rating'}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
        
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.cartButton]}
            onPress={() => handleAddToCart(item)}
            disabled={isRemoving}
          >
            <Ionicons name="cart-outline" size={20} color={COLORS.WHITE} />
            <Text style={styles.cartButtonText}>Add to Cart</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.removeButton]}
            onPress={() => handleRemoveFromWishlist(item._id)}
            disabled={isRemoving}
          >
            {isRemoving ? (
              <ActivityIndicator size="small" color={COLORS.WHITE} />
            ) : (
              <>
                <Ionicons name="trash-outline" size={20} color={COLORS.WHITE} />
                <Text style={styles.removeButtonText}>Remove</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Show authentication required screen if not logged in
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.WHITE} />
        <View style={styles.centerContainer}>
          <Ionicons name="heart-outline" size={64} color={COLORS.GRAY} />
          <Text style={styles.emptyTitle}>Login Required</Text>
          <Text style={styles.emptySubtitle}>
            Please login to view your wishlist
          </Text>
          <TouchableOpacity style={styles.loginButton} onPress={() => router.push('/auth')}>
            <Text style={styles.loginButtonText}>Login Now</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.WHITE} />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Wishlist</Text>
        <Text style={styles.itemCount}>
          {state.wishlistItems.length} {state.wishlistItems.length === 1 ? 'item' : 'items'}
        </Text>
      </View>

      {state.wishlistItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="heart-outline" size={64} color={COLORS.GRAY} />
          <Text style={styles.emptyTitle}>Your wishlist is empty</Text>
          <Text style={styles.emptySubtitle}>
            Add items you love to your wishlist and find them here
          </Text>
          <TouchableOpacity 
            style={styles.shopButton}
            onPress={() => router.push('/products')}
          >
            <Text style={styles.shopButtonText}>Start Shopping</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={state.wishlistItems}
          renderItem={renderWishlistItem}
          keyExtractor={(item) => item._id}
          style={styles.wishlistList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.WHITE,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
  },
  itemCount: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 4,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  loginButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 16,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.WHITE,
  },
  shopButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 24,
  },
  shopButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.WHITE,
  },
  wishlistList: {
    flex: 1,
    paddingVertical: 8,
  },
  wishlistItem: {
    backgroundColor: COLORS.WHITE,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  removingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 12,
    zIndex: 1,
  },
  itemContainer: {
    flexDirection: 'row',
    padding: 16,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: COLORS.BACKGROUND,
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    lineHeight: 20,
  },
  categoryText: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 4,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
  },
  originalPrice: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    textDecorationLine: 'line-through',
    marginLeft: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  rating: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
    marginLeft: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  cartButton: {
    backgroundColor: COLORS.PRIMARY,
  },
  cartButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.WHITE,
  },
  removeButton: {
    backgroundColor: COLORS.ERROR,
  },
  removeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.WHITE,
  },
});
