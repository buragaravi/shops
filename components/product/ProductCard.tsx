import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Product, ProductVariant } from '../../types';
import { COLORS, APP_CONSTANTS, API_BASE_URL, API_ENDPOINTS } from '../../constants';
import TokenStorage from '../../utils/tokenStorage';

interface ProductCardProps {
  product: Product & {
    hasVariants?: boolean;
  };
  onPress: (product: Product) => void;
  isWishlisted?: boolean;
  onWishlistUpdate?: (productId: string, isWishlisted: boolean) => void;
  onCartUpdate?: () => void;
  onVariantSelect?: (product: Product, actionType: 'cart' | 'buy') => void;
}

const { width: screenWidth } = Dimensions.get('window');
const cardWidth = (screenWidth - 48) / 2; // 16px margin on each side, 16px gap between cards

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onPress,
  isWishlisted = false,
  onWishlistUpdate,
  onCartUpdate,
  onVariantSelect,
}) => {
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isTogglingWishlist, setIsTogglingWishlist] = useState(false);

  // Get the product image - handle different response formats
  const getProductImage = () => {
    if (product?.images && Array.isArray(product.images) && product.images.length > 0) {
      return product.images[0];
    }
    if (product?.image) {
      return product.image;
    }
    return APP_CONSTANTS.IMAGE_PLACEHOLDER;
  };

  // Get rating value - handle different response formats  
  const getRating = () => {
    return product?.rating || product?.averageRating || 0;
  };

  // Get review count - handle different response formats
  const getReviewCount = () => {
    return product?.reviewCount || product?.totalReviews || 0;
  };

  // Variant helper functions
  const getDefaultVariant = (): ProductVariant | null => {
    if (!product?.hasVariants || !product?.variants || product.variants.length === 0) return null;
    
    // Filter variants with stock > 0
    const availableVariants = product.variants.filter(v => v.stock > 0);
    if (!availableVariants.length) return null;
    
    // Return cheapest variant as default
    return availableVariants.reduce((cheapest, current) => 
      current.price < cheapest.price ? current : cheapest
    );
  };

  const getDisplayPrice = () => {
    if (product.hasVariants && product.variants && product.variants.length > 0) {
      const defaultVariant = getDefaultVariant();
      return defaultVariant ? defaultVariant.price : product.price;
    }
    
    return product.price;
  };

  const getDisplayOriginalPrice = () => {
    if (product.hasVariants && product.variants && product.variants.length > 0) {
      const defaultVariant = getDefaultVariant();
      // ProductVariant doesn't have originalPrice, so use product's originalPrice
      return product.originalPrice;
    }
    
    return product.originalPrice;
  };

  const getDisplayStock = () => {
    if (product.hasVariants && product.variants && product.variants.length > 0) {
      const defaultVariant = getDefaultVariant();
      return defaultVariant ? defaultVariant.stock : 0;
    }
    
    return product.stock;
  };

  const getPriceRange = () => {
    if (product.hasVariants && product.variants && product.variants.length > 1) {
      const prices = product.variants.map(v => v.price);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      if (minPrice === maxPrice) {
        return `${APP_CONSTANTS.CURRENCY}${minPrice}`;
      }
      return `${APP_CONSTANTS.CURRENCY}${minPrice} - ${APP_CONSTANTS.CURRENCY}${maxPrice}`;
    }
    return null;
  };

  // Safely check for discount
  const displayPrice = getDisplayPrice();
  const displayOriginalPrice = getDisplayOriginalPrice();
  const hasDiscount = displayOriginalPrice && displayOriginalPrice > displayPrice;
  const discountPercentage = hasDiscount
    ? Math.round(((displayOriginalPrice! - displayPrice) / displayOriginalPrice!) * 100)
    : 0;

  // Handle wishlist toggle
  const handleWishlistToggle = async () => {
    try {
      setIsTogglingWishlist(true);
      const token = await TokenStorage.getToken();
      
      if (!token) {
        Alert.alert('Authentication Required', 'Please login to add to wishlist');
        return;
      }

      const endpoint = isWishlisted ? 
        `${API_BASE_URL}${API_ENDPOINTS.WISHLIST.REMOVE}` :
        `${API_BASE_URL}${API_ENDPOINTS.WISHLIST.ADD}`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ productId: product._id })
      });

      if (response.ok) {
        onWishlistUpdate?.(product._id, !isWishlisted);
      } else {
        throw new Error('Failed to update wishlist');
      }
    } catch (error) {
      console.error('Wishlist error:', error);
      Alert.alert('Error', 'Failed to update wishlist');
    } finally {
      setIsTogglingWishlist(false);
    }
  };

  // Handle add to cart
  const handleAddToCart = async () => {
    try {
      setIsAddingToCart(true);
      const token = await TokenStorage.getToken();
      
      if (!token) {
        Alert.alert('Authentication Required', 'Please login to add to cart');
        return;
      }

      const displayStock = getDisplayStock();
      if (displayStock <= 0) {
        Alert.alert('Out of Stock', 'This product is currently out of stock');
        return;
      }

      // If product has variants, show variant selection popup
      if (product.hasVariants && product.variants && product.variants.length > 0) {
        onVariantSelect?.(product, 'cart');
        return;
      }

      const requestBody = { 
        productId: product._id, 
        quantity: 1 
      };

      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.CART.ADD}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        Alert.alert('Success', `Added ${product.name} to cart`);
        onCartUpdate?.();
      } else {
        throw new Error('Failed to add to cart');
      }
    } catch (error) {
      console.error('Cart error:', error);
      Alert.alert('Error', 'Failed to add to cart');
    } finally {
      setIsAddingToCart(false);
    }
  };

  // Return null if product is not defined
  if (!product) {
    return null;
  }

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(product)}
      activeOpacity={0.8}
    >
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: getProductImage() }}
          style={styles.productImage}
          resizeMode="cover"
        />
        
        {hasDiscount && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{discountPercentage}% OFF</Text>
          </View>
        )}

        {/* Rating on image - opposite corner from discount */}
        {getRating() > 0 && (
          <View style={styles.ratingBadge}>
            <Ionicons name="star" size={12} color={COLORS.WARNING} />
            <Text style={styles.ratingBadgeText}>
              {getRating().toFixed(1)}
            </Text>
          </View>
        )}
        
        {/* Wishlist button */}
        <TouchableOpacity
          style={styles.wishlistButton}
          onPress={handleWishlistToggle}
          disabled={isTogglingWishlist}
        >
          {isTogglingWishlist ? (
            <ActivityIndicator size="small" color={COLORS.PRIMARY} />
          ) : (
            <Ionicons
              name={isWishlisted ? 'heart' : 'heart-outline'}
              size={20}
              color={isWishlisted ? COLORS.ERROR : COLORS.WHITE}
            />
          )}
        </TouchableOpacity>
      </View>
      
      <View style={styles.contentContainer}>
        <Text style={styles.productName} numberOfLines={2}>
          {product?.name || 'Product Name'}
        </Text>
        
        {/* Variants Badge */}
        {product.hasVariants && product.variants && product.variants.length > 0 && (
          <Text style={styles.variantsBadge}>
            {product.variants.length} variants available
          </Text>
        )}
        
        <View style={styles.priceContainer}>
          {getPriceRange() ? (
            <Text style={styles.currentPrice}>{getPriceRange()}</Text>
          ) : (
            <Text style={styles.currentPrice}>
              {APP_CONSTANTS.CURRENCY}{getDisplayPrice()}
            </Text>
          )}
          {hasDiscount && (
            <Text style={styles.originalPrice}>
              {APP_CONSTANTS.CURRENCY}{getDisplayOriginalPrice()}
            </Text>
          )}
        </View>

        {/* Stock status */}
        {getDisplayStock() <= 5 && getDisplayStock() > 0 && (
          <Text style={styles.stockText}>Only {getDisplayStock()} left!</Text>
        )}
        
        {getDisplayStock() === 0 && (
          <Text style={styles.outOfStockText}>Out of Stock</Text>
        )}

        {/* Add to Cart Button */}
        <TouchableOpacity
          style={[
            styles.addToCartButton,
            getDisplayStock() === 0 && styles.addToCartButtonDisabled
          ]}
          onPress={handleAddToCart}
          disabled={isAddingToCart || getDisplayStock() === 0}
        >
          {isAddingToCart ? (
            <ActivityIndicator size="small" color={COLORS.WHITE} />
          ) : (
            <>
              <Ionicons name="cart" size={16} color={COLORS.WHITE} />
              <Text style={styles.addToCartText}>
                {getDisplayStock() === 0 ? 'Out of Stock' : 
                 product.hasVariants ? 'Select & Add' : 'Add to Cart'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: cardWidth,
    backgroundColor: COLORS.WHITE,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: COLORS.BLACK,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  imageContainer: {
    position: 'relative',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: 160,
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: COLORS.ERROR,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 1,
  },
  discountText: {
    color: COLORS.WHITE,
    fontSize: 10,
    fontWeight: 'bold',
  },
  wishlistButton: {
    position: 'absolute',
    top: 40,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 15,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  contentContainer: {
    padding: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 8,
    lineHeight: 18,
  },
  variantsBadge: {
    fontSize: 10,
    color: COLORS.PRIMARY,
    backgroundColor: `${COLORS.PRIMARY}15`,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 6,
    alignSelf: 'flex-start',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  currentPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
    marginRight: 8,
  },
  originalPrice: {
    fontSize: 12,
    color: COLORS.GRAY,
    textDecorationLine: 'line-through',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  ratingText: {
    fontSize: 11,
    color: COLORS.TEXT_SECONDARY,
    marginLeft: 4,
  },
  ratingBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingBadgeText: {
    fontSize: 10,
    color: COLORS.WHITE,
    fontWeight: '600',
    marginLeft: 2,
  },
  addToCartButton: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  addToCartButtonDisabled: {
    backgroundColor: COLORS.GRAY,
  },
  addToCartText: {
    color: COLORS.WHITE,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  stockText: {
    fontSize: 10,
    color: COLORS.WARNING,
    fontWeight: '500',
    marginBottom: 4,
  },
  outOfStockText: {
    fontSize: 10,
    color: COLORS.ERROR,
    fontWeight: '500',
    marginBottom: 4,
  },
});

export default ProductCard;
