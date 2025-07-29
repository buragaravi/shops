import React, { useState } from 'react';
import { 
  View, 
  Text, 
  Image, 
  TouchableOpacity, 
  StyleSheet, 
  Dimensions, 
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, APP_CONSTANTS } from '../../constants';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import type { Product, ProductVariant, ComboPack } from '../../services/apiService';

interface EnhancedProductCardProps {
  product: Product | ComboPack;
  index?: number;
  onPress: (product: Product | ComboPack) => void;
  onVariantSelect?: (product: Product, actionType: 'cart' | 'buy') => void;
  compact?: boolean;
}

const { width: screenWidth } = Dimensions.get('window');
const cardWidth = (screenWidth - 48) / 2;

const EnhancedProductCard: React.FC<EnhancedProductCardProps> = ({
  product,
  index = 0,
  onPress,
  onVariantSelect,
  compact = false,
}) => {
  const { state, addToCart, addToWishlist, removeFromWishlist, isInWishlist, addComboToCart, addComboToWishlist, removeComboFromWishlist, isComboInWishlist } = useApp();
  const { isAuthenticated, user } = useAuth();
  const [loading, setLoading] = useState({
    cart: false,
    wishlist: false,
  });

  // Early return if product is not valid
  if (!product || !product._id || !product.name) {
    console.warn('⚠️ EnhancedProductCard: Invalid product data:', product);
    return null;
  }

  // Type guard to check if item is a combo pack
  const isComboPack = (item: Product | ComboPack): item is ComboPack => {
    return 'comboPrice' in item;
  };

  const isWishlisted = isComboPack(product) 
    ? isComboInWishlist(product._id) 
    : isInWishlist(product._id);

  // Get product image
  const getProductImage = () => {
    if (product?.images && Array.isArray(product.images) && product.images.length > 0) {
      return product.images[0] || APP_CONSTANTS.IMAGE_PLACEHOLDER;
    }
    return APP_CONSTANTS.IMAGE_PLACEHOLDER;
  };

  // Get display price (handles variants)
  const getDisplayPrice = () => {
    if (isComboPack(product)) {
      return `${APP_CONSTANTS.CURRENCY}${product.comboPrice || 0}`;
    }
    
    if (product.hasVariants && product.variants?.length) {
      const availableVariants = product.variants.filter((v: ProductVariant) => v.stock > 0);
      if (availableVariants.length === 0) return `${APP_CONSTANTS.CURRENCY}${product.price || 0}`;
      
      const prices = availableVariants.map((v: ProductVariant) => v.price || 0);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      
      if (minPrice === maxPrice) {
        return `${APP_CONSTANTS.CURRENCY}${minPrice}`;
      }
      return `${APP_CONSTANTS.CURRENCY}${minPrice} - ${APP_CONSTANTS.CURRENCY}${maxPrice}`;
    }
    return `${APP_CONSTANTS.CURRENCY}${product.price || 0}`;
  };

  // Get original price for discount calculation
  const getDisplayOriginalPrice = () => {
    if (isComboPack(product)) {
      return product.originalTotalPrice;
    }
    
    if (product.hasVariants && product.variants?.length) {
      const availableVariants = product.variants.filter((v: ProductVariant) => v.stock > 0 && v.originalPrice);
      if (availableVariants.length === 0) return product.originalPrice;
      
      const originalPrices = availableVariants.map((v: ProductVariant) => v.originalPrice!);
      const minOriginalPrice = Math.min(...originalPrices);
      return minOriginalPrice;
    }
    return product.originalPrice;
  };

  // Get display stock
  const getDisplayStock = () => {
    if (isComboPack(product)) {
      return product.stock;
    }
    
    if (product.hasVariants && product.variants?.length) {
      const availableVariants = product.variants.filter((v: ProductVariant) => v.stock > 0);
      return availableVariants.reduce((sum: number, v: ProductVariant) => sum + v.stock, 0);
    }
    return product.stock;
  };

  // Check if product has discount
  const displayPrice = parseFloat(getDisplayPrice().replace(APP_CONSTANTS.CURRENCY, '').split(' - ')[0]);
  const displayOriginalPrice = getDisplayOriginalPrice();
  const hasDiscount = displayOriginalPrice && displayOriginalPrice > displayPrice;
  const discountPercentage = hasDiscount
    ? Math.round(((displayOriginalPrice! - displayPrice) / displayOriginalPrice!) * 100)
    : 0;

  // Get rating
  const getRating = () => {
    if (isComboPack(product)) {
      return product.averageRating || 0;
    }
    return product?.rating || product?.averageRating || 0;
  };

  const getReviewCount = () => {
    if (isComboPack(product)) {
      return product.totalReviews || 0;
    }
    return product?.reviewCount || product?.totalReviews || 0;
  };

  // Handle add to cart
  const handleAddToCart = async () => {
    console.log('🛒 EnhancedProductCard: Add to cart called', { isAuthenticated, userState: !!user });
    
    if (!isAuthenticated || !user) {
      console.log('❌ EnhancedProductCard: Not authenticated');
      Alert.alert('Authentication Required', 'Please login to add items to cart');
      return;
    }

    // Handle combo pack
    if (isComboPack(product)) {
      setLoading(prev => ({ ...prev, cart: true }));
      try {
        console.log('🔄 EnhancedProductCard: Adding combo pack to cart:', product._id);
        const success = await addComboToCart(product._id, 1);
        if (success) {
          Alert.alert('Success', 'Combo pack added to cart');
        } else {
          Alert.alert('Error', 'Failed to add combo pack to cart');
        }
      } catch (error) {
        console.error('❌ EnhancedProductCard: Combo cart error:', error);
        Alert.alert('Error', 'Failed to add combo pack to cart');
      } finally {
        setLoading(prev => ({ ...prev, cart: false }));
      }
      return;
    }

    // Handle regular product with variants
    if (product.hasVariants && product.variants?.length) {
      // Show variant selection popup
      onVariantSelect?.(product as Product, 'cart');
      return;
    }

    // Add product without variants
    setLoading(prev => ({ ...prev, cart: true }));
    try {
      console.log('🔄 EnhancedProductCard: Adding to cart:', product._id);
      const success = await addToCart(product._id, 1);
      if (success) {
        Alert.alert('Success', 'Product added to cart');
      } else {
        Alert.alert('Error', 'Failed to add product to cart');
      }
    } catch (error) {
      console.error('❌ EnhancedProductCard: Cart error:', error);
      Alert.alert('Error', 'Failed to add product to cart');
    } finally {
      setLoading(prev => ({ ...prev, cart: false }));
    }
  };

  // Handle wishlist toggle
  const handleWishlistToggle = async () => {
    console.log('❤️ EnhancedProductCard: Wishlist toggle called', { isAuthenticated, userState: !!user });
    
    if (!isAuthenticated || !user) {
      console.log('❌ EnhancedProductCard: Not authenticated for wishlist');
      Alert.alert('Authentication Required', 'Please login to add items to wishlist');
      return;
    }

    setLoading(prev => ({ ...prev, wishlist: true }));
    try {
      if (isComboPack(product)) {
        if (isWishlisted) {
          await removeComboFromWishlist(product._id);
        } else {
          await addComboToWishlist(product._id);
        }
      } else {
        if (isWishlisted) {
          await removeFromWishlist(product._id);
        } else {
          await addToWishlist(product._id);
        }
      }
    } catch (error) {
      console.error('❌ EnhancedProductCard: Wishlist error:', error);
      Alert.alert('Error', 'Failed to update wishlist');
    } finally {
      setLoading(prev => ({ ...prev, wishlist: false }));
    }
  };

  // Handle buy now
  const handleBuyNow = () => {
    console.log('🛍️ EnhancedProductCard: Buy now called', { isAuthenticated, userState: !!user });
    
    if (!isAuthenticated || !user) {
      console.log('❌ EnhancedProductCard: Not authenticated for buy now');
      Alert.alert('Authentication Required', 'Please login to buy products');
      return;
    }

    if (isComboPack(product)) {
      // For combo packs, add to cart and navigate to cart
      handleAddToCart();
      return;
    }

    if (product.hasVariants && product.variants?.length) {
      onVariantSelect?.(product as Product, 'buy');
      return;
    }

    // Navigate to checkout with this product
    Alert.alert('Buy Now', 'This feature will be implemented with checkout flow');
  };

  const stockStatus = getDisplayStock();
  const isOutOfStock = stockStatus <= 0;

  return (
    <View style={[styles.container, compact && styles.compactContainer]}>
      <TouchableOpacity
        onPress={() => onPress(product)}
        style={styles.cardContent}
        activeOpacity={0.8}
      >
        {/* Product Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: getProductImage() }}
            style={styles.productImage}
            resizeMode="cover"
          />
          
          {/* Discount Badge */}
          {hasDiscount && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>{discountPercentage}% OFF</Text>
            </View>
          )}

          {/* Stock Badge */}
          {stockStatus <= 5 && stockStatus > 0 && (
            <View style={styles.stockBadge}>
              <Text style={styles.stockBadgeText}>Only {stockStatus} left!</Text>
            </View>
          )}

          {/* Out of Stock Overlay */}
          {isOutOfStock && (
            <View style={styles.outOfStockOverlay}>
              <Text style={styles.outOfStockText}>Out of Stock</Text>
            </View>
          )}

          {/* Wishlist Button */}
          <TouchableOpacity
            style={styles.wishlistButton}
            onPress={handleWishlistToggle}
            disabled={loading.wishlist}
          >
            {loading.wishlist ? (
              <ActivityIndicator size="small" color={COLORS.PRIMARY} />
            ) : (
              <Ionicons
                name={isWishlisted ? 'heart' : 'heart-outline'}
                size={20}
                color={isWishlisted ? COLORS.ERROR : COLORS.TEXT_SECONDARY}
              />
            )}
          </TouchableOpacity>
        </View>

        {/* Product Info */}
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>
            {product.name}
          </Text>

          {/* Rating */}
          <View style={styles.ratingContainer}>
            <View style={styles.ratingStars}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Ionicons
                  key={star}
                  name={star <= getRating() ? 'star' : 'star-outline'}
                  size={12}
                  color={star <= getRating() ? '#FFD700' : COLORS.TEXT_SECONDARY}
                />
              ))}
            </View>
            <Text style={styles.ratingText}>
              ({getReviewCount()})
            </Text>
          </View>

          {/* Price */}
          <View style={styles.priceContainer}>
            <Text style={styles.currentPrice}>{getDisplayPrice()}</Text>
            {hasDiscount && (
              <Text style={styles.originalPrice}>
                {APP_CONSTANTS.CURRENCY}{displayOriginalPrice}
              </Text>
            )}
          </View>

          {/* Variant indicator or Combo Pack indicator */}
          {!isComboPack(product) && product.hasVariants && product.variants?.length && (
            <Text style={styles.variantIndicator}>
              {product.variants.length} variants available
            </Text>
          )}
          {isComboPack(product) && product.products && (
            <Text style={styles.comboIndicator}>
              {product.products.length} products included
            </Text>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[
              styles.addToCartButton,
              isOutOfStock && styles.addToCartButtonDisabled
            ]}
            onPress={handleAddToCart}
            disabled={loading.cart || isOutOfStock}
          >
            {loading.cart ? (
              <ActivityIndicator size="small" color={COLORS.WHITE} />
            ) : (
              <>
                <Ionicons name="cart" size={16} color={COLORS.WHITE} />
                <Text style={styles.addToCartText}>
                  {isOutOfStock ? 'Out of Stock' : 
                   isComboPack(product) ? 'Add to Cart' :
                   product.hasVariants ? 'Select & Add' : 'Add to Cart'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {!isOutOfStock && (
            <TouchableOpacity
              style={styles.buyNowButton}
              onPress={handleBuyNow}
            >
              <Ionicons name="flash" size={16} color={COLORS.WHITE} />
              <Text style={styles.buyNowText}>Buy Now</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: cardWidth,
    backgroundColor: COLORS.WHITE,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: COLORS.BLACK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  compactContainer: {
    marginBottom: 12,
  },
  cardContent: {
    flex: 1,
  },
  imageContainer: {
    position: 'relative',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
    height: 160,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: COLORS.ERROR,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  discountText: {
    color: COLORS.WHITE,
    fontSize: 10,
    fontWeight: 'bold',
  },
  stockBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: '#FF9500',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stockBadgeText: {
    color: COLORS.WHITE,
    fontSize: 10,
    fontWeight: 'bold',
  },
  outOfStockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  outOfStockText: {
    color: COLORS.WHITE,
    fontSize: 14,
    fontWeight: 'bold',
  },
  wishlistButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.WHITE,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.BLACK,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  productInfo: {
    padding: 12,
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 8,
    lineHeight: 18,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingStars: {
    flexDirection: 'row',
    marginRight: 4,
  },
  ratingText: {
    fontSize: 11,
    color: COLORS.TEXT_SECONDARY,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  currentPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
    marginRight: 8,
  },
  originalPrice: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
    textDecorationLine: 'line-through',
  },
  variantIndicator: {
    fontSize: 11,
    color: COLORS.TEXT_SECONDARY,
    fontStyle: 'italic',
  },
  comboIndicator: {
    fontSize: 11,
    color: COLORS.SUCCESS,
    fontStyle: 'italic',
    fontWeight: '500',
  },
  actionButtons: {
    padding: 12,
    gap: 8,
  },
  addToCartButton: {
    backgroundColor: COLORS.PRIMARY,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  addToCartButtonDisabled: {
    backgroundColor: COLORS.TEXT_SECONDARY,
  },
  addToCartText: {
    color: COLORS.WHITE,
    fontSize: 12,
    fontWeight: '600',
  },
  buyNowButton: {
    backgroundColor: '#FF9500',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  buyNowText: {
    color: COLORS.WHITE,
    fontSize: 12,
    fontWeight: '600',
  },
});

export default EnhancedProductCard;
