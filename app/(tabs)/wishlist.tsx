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
// Updated to handle products directly instead of WishlistItem structure
import type { Product } from '../../services/apiService';

const { width: screenWidth } = Dimensions.get('window');

export default function WishlistScreen() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const { 
    state, 
    loadWishlist, 
    removeFromWishlist,
    addToCart,
    loadCart
  } = useApp();
  
  const [refreshing, setRefreshing] = useState(false);
  const [removingItems, setRemovingItems] = useState(new Set<string>());
  const [movingItems, setMovingItems] = useState(new Set<string>());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/auth');
      return;
    }    
    fetchWishlist();
  }, [isAuthenticated]);

  const fetchWishlist = async () => {
    try {
      setLoading(true);
      setError(null);
      await loadWishlist();
    } catch (error) {
      console.error('❌ Error fetching wishlist:', error);
      setError('Error fetching wishlist');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchWishlist();
    setRefreshing(false);
  };

  const handleRemoveFromWishlist = async (productId: string) => {
    if (removingItems.has(productId)) return;
    
    setRemovingItems(prev => new Set(prev).add(productId));
    
    try {
      console.log('🗑️ Removing from wishlist:', productId);
      await removeFromWishlist(productId);
      console.log('✅ Removed from wishlist successfully');
      
      // Refresh wishlist data to ensure reliable state
      await loadWishlist();
      console.log('✅ Wishlist data refreshed');
    } catch (error) {
      console.error('❌ Error removing from wishlist:', error);
      Alert.alert('Error', 'Failed to remove item from wishlist');
    } finally {
      setRemovingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(productId);
        return newSet;
      });
    }
  };

  const handleMoveToCart = async (productId: string, hasVariants: boolean = false, isCombopack: boolean = false) => {
    if (movingItems.has(productId)) return;
    
    // If product has variants and is not a combopack, navigate to product detail page for variant selection
    if (hasVariants && !isCombopack) {
      Alert.alert(
        'Select Variant',
        'This product has variants. Please select your preferred variant from the product page.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Go to Product', 
            onPress: () => router.push(`/product/${productId}` as any)
          }
        ]
      );
      return;
    }
    
    setMovingItems(prev => new Set(prev).add(productId));
    
    try {
      console.log('🛒 Moving to cart:', productId);
      console.log('📦 Current wishlist items before:', state.wishlistItems?.length);
      
      // Step 1: Add to cart
      const addToCartSuccess = await addToCart(productId, 1);
      
      if (addToCartSuccess) {
        console.log('✅ Added to cart successfully');
        
        // Step 2: Remove from wishlist (this will auto-update the wishlist state)
        console.log('🗑️ Starting wishlist removal...');
        await removeFromWishlist(productId);
        console.log('✅ Removed from wishlist successfully');
        
        // Small delay to ensure state update
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Step 3: Force refresh both cart and wishlist to ensure data consistency
        console.log('🔄 Refreshing cart and wishlist data...');
        await Promise.all([
          loadCart(),
          loadWishlist()
        ]);
        console.log('✅ Data refreshed successfully');
        console.log('📦 Final wishlist items count:', state.wishlistItems?.length);
        
        Alert.alert('Success', 'Moved to cart successfully!');
      } else {
        Alert.alert('Error', 'Failed to add item to cart');
      }
    } catch (error) {
      console.error('❌ Error moving to cart:', error);
      Alert.alert('Error', 'Error moving item to cart');
    } finally {
      setMovingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(productId);
        return newSet;
      });
    }
  };

  const handleClearWishlist = async () => {
    Alert.alert(
      'Clear Wishlist',
      'Are you sure you want to remove all items from your wishlist?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear All', 
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              console.log('🗑️ Clearing wishlist...');
              
              // Clear all items from the backend
              const promises = wishlistItems.map(item => 
                removeFromWishlist(item._id)
              );
              
              await Promise.all(promises);
              console.log('✅ All items removed from wishlist');
              
              // Reload the wishlist to get updated state
              await loadWishlist();
              console.log('✅ Wishlist data refreshed');
              
              Alert.alert('Success', 'Wishlist cleared successfully!');
            } catch (error) {
              console.error('❌ Error clearing wishlist:', error);
              Alert.alert('Error', 'Error clearing wishlist');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const renderWishlistItem = ({ item, index }: { item: any; index: number }) => {
    if (!item) {
      return null;
    }
    
    // The product data is directly in the item, not under productId
    const product = item;
    
    if (!product || !product._id) {
      return (
        <View style={[styles.wishlistItem, { padding: 20, alignItems: 'center' }]}>
          <Text style={{ color: COLORS.ERROR }}>Product not found</Text>
        </View>
      );
    }

    // Check if it's a combo pack to skip variant handling later
    const isCombopack = product.category?.toLowerCase() === 'combopack' || product.name?.toLowerCase().includes('combo');
    
    // Check if product has variants
    const hasVariants = product.hasVariants || (product.variants && product.variants.length > 0);

    const isRemoving = removingItems.has(product._id);
    const isMoving = movingItems.has(product._id);
    const isOutOfStock = (product.stock || 0) <= 0;

    return (
      <View style={[styles.wishlistItem, { opacity: isRemoving ? 0.5 : 1 }]}>
        {/* Product Image */}
        <View style={styles.imageContainer}>
          <TouchableOpacity
            onPress={() => router.push(`/product/${product._id}` as any)}
            style={styles.imageWrapper}
          >
            <Image 
              source={{ uri: product?.images?.[0] || 'https://via.placeholder.com/300x300?text=No+Image' }} 
              style={styles.productImage}
              resizeMode="cover"
            />
            {isOutOfStock && (
              <View style={styles.outOfStockOverlay}>
                <Text style={styles.outOfStockText}>Out of Stock</Text>
              </View>
            )}
            {hasVariants && !isCombopack && (
              <View style={styles.variantBadge}>
                <Text style={styles.variantBadgeText}>Variants</Text>
              </View>
            )}
          </TouchableOpacity>
          
          {/* Quick View Button */}
          <TouchableOpacity
            style={styles.quickViewButton}
            onPress={() => router.push(`/product/${product._id}` as any)}
          >
            <Ionicons name="eye-outline" size={16} color={COLORS.WHITE} />
          </TouchableOpacity>
        </View>

        {/* Product Details */}
        <View style={styles.productDetails}>
          <TouchableOpacity
            onPress={() => router.push(`/product/${product._id}` as any)}
            style={styles.productInfoSection}
          >
            <Text style={styles.productName} numberOfLines={2}>
              {product.name}
            </Text>
            
            <View style={styles.priceContainer}>
              <Text style={styles.currentPrice}>₹{product.price}</Text>
              {product.originalPrice && product.originalPrice > product.price && (
                <Text style={styles.originalPrice}>₹{product.originalPrice}</Text>
              )}
            </View>

            {/* Rating */}
            <View style={styles.ratingContainer}>
              <View style={styles.starContainer}>
                {[...Array(5)].map((_, i) => (
                  <Ionicons
                    key={i}
                    name={i < Math.floor(product.rating || 0) ? "star" : "star-outline"}
                    size={12}
                    color={COLORS.WARNING}
                  />
                ))}
              </View>
              <Text style={styles.ratingText}>
                {product.rating ? product.rating.toFixed(1) : '0.0'} 
                ({product.reviewCount || product.totalReviews || product.reviews?.length || 0})
              </Text>
            </View>
          </TouchableOpacity>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[
                styles.moveToCartButton,
                { opacity: isOutOfStock || isMoving ? 0.5 : 1 }
              ]}
              onPress={() => handleMoveToCart(product._id, hasVariants, isCombopack)}
              disabled={isOutOfStock || isMoving}
            >
              {isMoving ? (
                <ActivityIndicator size="small" color={COLORS.WHITE} />
              ) : (
                <>
                  <Ionicons name="bag-outline" size={16} color={COLORS.WHITE} />
                  <Text style={styles.moveToCartText}>
                    {isOutOfStock ? 'Out of Stock' : hasVariants && !isCombopack ? 'Select Variant' : 'Move to Cart'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.removeButton, { opacity: isRemoving ? 0.5 : 1 }]}
              onPress={() => handleRemoveFromWishlist(product._id)}
              disabled={isRemoving}
            >
              {isRemoving ? (
                <ActivityIndicator size="small" color={COLORS.ERROR} />
              ) : (
                <Ionicons name="heart" size={18} color={COLORS.ERROR} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY} />
          <Text style={styles.loadingText}>Loading your wishlist...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.errorContainer}>
          <Ionicons name="heart-outline" size={64} color={COLORS.ERROR} />
          <Text style={styles.errorTitle}>Error</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchWishlist}>
            <Ionicons name="refresh-outline" size={20} color={COLORS.WHITE} />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const wishlistItems = state.wishlistItems || [];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconContainer}>
            <Ionicons name="heart" size={24} color={COLORS.WHITE} />
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>My Wishlist</Text>
            <Text style={styles.headerSubtitle}>
              {wishlistItems.length === 0 
                ? 'No items in your wishlist' 
                : `${wishlistItems.length} item${wishlistItems.length !== 1 ? 's' : ''} saved`
              }
            </Text>
          </View>
        </View>
        
        {wishlistItems.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClearWishlist}
          >
            <Ionicons name="trash-outline" size={16} color={COLORS.ERROR} />
            <Text style={styles.clearButtonText}>Clear Wishlist</Text>
          </TouchableOpacity>
        )}
      </View>

      {wishlistItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyContent}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="heart-outline" size={64} color={COLORS.PRIMARY} />
            </View>
            <Text style={styles.emptyTitle}>Your wishlist is empty</Text>
            <Text style={styles.emptySubtitle}>
              Save items you love to your wishlist and shop them later
            </Text>
            <TouchableOpacity
              style={styles.continueShoppingButton}
              onPress={() => router.push('/(tabs)/products' as any)}
            >
              <Ionicons name="bag-outline" size={20} color={COLORS.WHITE} />
              <Text style={styles.continueShoppingText}>Continue Shopping</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <FlatList
          data={wishlistItems}
          renderItem={renderWishlistItem}
          keyExtractor={(item: any, index) => item._id || `item-${index}`}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.PRIMARY]}
            />
          }
          showsVerticalScrollIndicator={false}
          numColumns={2}
          columnWrapperStyle={wishlistItems.length > 1 ? styles.row : null}
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.WHITE,
    marginLeft: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: COLORS.WHITE,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.WHITE,
    borderWidth: 1,
    borderColor: COLORS.ERROR + '30',
    borderRadius: 20,
  },
  clearButtonText: {
    fontSize: 12,
    color: COLORS.ERROR,
    marginLeft: 4,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyContent: {
    alignItems: 'center',
    backgroundColor: COLORS.WHITE,
    paddingHorizontal: 32,
    paddingVertical: 48,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    backgroundColor: COLORS.PRIMARY + '10',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  continueShoppingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: COLORS.PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  continueShoppingText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.WHITE,
    marginLeft: 8,
  },
  listContainer: {
    padding: 16,
  },
  row: {
    justifyContent: 'space-between',
  },
  wishlistItem: {
    backgroundColor: COLORS.WHITE,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    width: (screenWidth - 48) / 2,
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 160,
  },
  imageWrapper: {
    width: '100%',
    height: '100%',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  outOfStockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  outOfStockText: {
    color: COLORS.WHITE,
    fontSize: 12,
    fontWeight: '600',
    backgroundColor: COLORS.ERROR,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  quickViewButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productDetails: {
    padding: 16,
  },
  productInfoSection: {
    marginBottom: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 8,
    lineHeight: 20,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  currentPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
  },
  originalPrice: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
    textDecorationLine: 'line-through',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  starContainer: {
    flexDirection: 'row',
    marginRight: 4,
  },
  ratingText: {
    fontSize: 10,
    color: COLORS.TEXT_SECONDARY,
    marginLeft: 4,
  },
  variantBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  variantBadgeText: {
    fontSize: 8,
    color: COLORS.WHITE,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  moveToCartButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.PRIMARY,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 4,
  },
  disabledButton: {
    backgroundColor: COLORS.TEXT_SECONDARY,
  },
  moveToCartText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.WHITE,
  },
  removeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.WHITE,
    borderWidth: 1,
    borderColor: COLORS.ERROR + '30',
    borderRadius: 8,
  },
});
