import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ComboPack } from '../../types';
import { COLORS, APP_CONSTANTS, API_BASE_URL, API_ENDPOINTS } from '../../constants';
import TokenStorage from '../../utils/tokenStorage';

interface ComboPackCardProps {
  comboPack: ComboPack;
  onPress: (comboPack: ComboPack) => void;
  isWishlisted?: boolean;
  onWishlistUpdate?: (comboPackId: string, isWishlisted: boolean) => void;
  onCartUpdate?: () => void;
}

const { width: screenWidth } = Dimensions.get('window');
const cardWidth = screenWidth - 32; // 16px margin on each side

const ComboPackCard: React.FC<ComboPackCardProps> = ({
  comboPack,
  onPress,
  isWishlisted = false,
  onWishlistUpdate,
  onCartUpdate,
}) => {
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isTogglingWishlist, setIsTogglingWishlist] = useState(false);

  // Return null if comboPack is not defined
  if (!comboPack) {
    return null;
  }

  // Get pricing information - handle different response formats
  const getOriginalPrice = () => {
    return comboPack?.originalPrice || comboPack?.originalTotalPrice || 0;
  };

  const getDiscountedPrice = () => {
    return comboPack?.discountedPrice || comboPack?.comboPrice || comboPack?.originalPrice || 0;
  };

  const getDiscountPercentage = () => {
    if (comboPack?.discountPercentage) {
      return comboPack.discountPercentage;
    }
    const original = getOriginalPrice();
    const discounted = getDiscountedPrice();
    if (original > discounted) {
      return Math.round(((original - discounted) / original) * 100);
    }
    return 0;
  };

  const getSavingsAmount = () => {
    if (comboPack?.discountAmount) {
      return comboPack.discountAmount;
    }
    return getOriginalPrice() - getDiscountedPrice();
  };

  // Get combo image - handle different response formats
  const getComboImage = () => {
    if (comboPack?.mainImage) {
      return comboPack.mainImage;
    }
    if (comboPack?.images && Array.isArray(comboPack.images) && comboPack.images.length > 0) {
      return comboPack.images[0];
    }
    // Fallback to first product image
    if (comboPack?.products && Array.isArray(comboPack.products) && comboPack.products.length > 0) {
      const firstProduct = comboPack.products[0]?.product;
      if (firstProduct?.images && Array.isArray(firstProduct.images) && firstProduct.images.length > 0) {
        return firstProduct.images[0];
      }
      if (firstProduct?.image) {
        return firstProduct.image;
      }
    }
    return APP_CONSTANTS.IMAGE_PLACEHOLDER;
  };

  const discountPercentage = getDiscountPercentage();
  const originalPrice = getOriginalPrice();
  const discountedPrice = getDiscountedPrice();
  const savingsAmount = getSavingsAmount();

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
        `${API_BASE_URL}/api/combo-packs/wishlist/remove` :
        `${API_BASE_URL}/api/combo-packs/wishlist/add`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ comboPackId: comboPack._id })
      });

      if (response.ok) {
        onWishlistUpdate?.(comboPack._id, !isWishlisted);
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

      if (comboPack.stock <= 0) {
        Alert.alert('Out of Stock', 'This combo pack is currently out of stock');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/combo-packs/cart/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          comboPackId: comboPack._id, 
          quantity: 1 
        })
      });

      if (response.ok) {
        Alert.alert('Success', `Added ${comboPack.name} to cart`);
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

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(comboPack)}
      activeOpacity={0.8}
    >
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: getComboImage() }}
          style={styles.comboImage}
          resizeMode="cover"
        />
        
        {/* Combo Badge */}
        <View style={styles.comboBadge}>
          <Text style={styles.comboBadgeText}>COMBO</Text>
        </View>
        
        {/* Discount Badge */}
        {discountPercentage > 0 && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{discountPercentage}% OFF</Text>
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
        
        {/* Offer Badge */}
        {comboPack?.offer && (
          <View style={styles.offerBadge}>
            <Text style={styles.offerText}>{comboPack.offer}</Text>
          </View>
        )}

        {/* Custom Badge */}
        {(comboPack?.badge || comboPack?.badgeText) && (
          <View style={styles.customBadge}>
            <Text style={styles.customBadgeText}>
              {comboPack.badge || comboPack.badgeText}
            </Text>
          </View>
        )}
      </View>
      
      <View style={styles.contentContainer}>
        <Text style={styles.comboName} numberOfLines={2}>
          {comboPack?.name || 'Combo Pack'}
        </Text>
        
        <Text style={styles.comboDescription} numberOfLines={2}>
          {comboPack?.description || 'Special combo offer'}
        </Text>
        
        <View style={styles.productsInfo}>
          <Ionicons name="cube" size={14} color={COLORS.PRIMARY} />
          <Text style={styles.productsText}>
            {comboPack?.products?.length || 0} Products
          </Text>
        </View>
        
        <View style={styles.priceContainer}>
          <View style={styles.priceRow}>
            <Text style={styles.currentPrice}>
              {APP_CONSTANTS.CURRENCY}{discountedPrice}
            </Text>
            {originalPrice > discountedPrice && (
              <Text style={styles.originalPrice}>
                {APP_CONSTANTS.CURRENCY}{originalPrice}
              </Text>
            )}
          </View>
          {savingsAmount > 0 && (
            <Text style={styles.savingsText}>
              You save {APP_CONSTANTS.CURRENCY}{savingsAmount}!
            </Text>
          )}
        </View>
        
        {/* Rating */}
        {comboPack?.averageRating && comboPack.averageRating > 0 && (
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={12} color={COLORS.WARNING} />
            <Text style={styles.ratingText}>
              {comboPack.averageRating.toFixed(1)} ({comboPack?.totalReviews || 0})
            </Text>
          </View>
        )}
        
        {comboPack?.stock <= 5 && comboPack?.stock > 0 && (
          <Text style={styles.stockText}>Only {comboPack.stock} left!</Text>
        )}
        
        {comboPack?.stock === 0 && (
          <Text style={styles.outOfStockText}>Out of Stock</Text>
        )}

        {/* Add to Cart Button */}
        <TouchableOpacity
          style={[
            styles.addToCartButton,
            comboPack?.stock === 0 && styles.addToCartButtonDisabled
          ]}
          onPress={handleAddToCart}
          disabled={isAddingToCart || comboPack?.stock === 0}
        >
          {isAddingToCart ? (
            <ActivityIndicator size="small" color={COLORS.WHITE} />
          ) : (
            <>
              <Ionicons name="cart" size={16} color={COLORS.WHITE} />
              <Text style={styles.addToCartText}>
                {comboPack?.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
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
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: COLORS.BLACK,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },
  imageContainer: {
    position: 'relative',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden',
  },
  comboImage: {
    width: '100%',
    height: 180,
  },
  comboBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  comboBadgeText: {
    color: COLORS.WHITE,
    fontSize: 12,
    fontWeight: 'bold',
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: COLORS.ERROR,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  discountText: {
    color: COLORS.WHITE,
    fontSize: 10,
    fontWeight: 'bold',
  },
  offerBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: COLORS.WARNING,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  offerText: {
    color: COLORS.WHITE,
    fontSize: 11,
    fontWeight: 'bold',
  },
  contentContainer: {
    padding: 16,
  },
  comboName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 6,
    lineHeight: 20,
  },
  comboDescription: {
    fontSize: 13,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: 8,
    lineHeight: 16,
  },
  productsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  productsText: {
    fontSize: 12,
    color: COLORS.PRIMARY,
    marginLeft: 4,
    fontWeight: '600',
  },
  priceContainer: {
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  currentPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
    marginRight: 12,
  },
  originalPrice: {
    fontSize: 14,
    color: COLORS.GRAY,
    textDecorationLine: 'line-through',
  },
  savingsText: {
    fontSize: 12,
    color: COLORS.SUCCESS,
    fontWeight: '600',
  },
  stockText: {
    fontSize: 11,
    color: COLORS.WARNING,
    fontWeight: '500',
    marginBottom: 8,
  },
  outOfStockText: {
    fontSize: 11,
    color: COLORS.ERROR,
    fontWeight: '500',
    marginBottom: 8,
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
  addToCartButton: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
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
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  customBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: COLORS.SECONDARY,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  customBadgeText: {
    color: COLORS.WHITE,
    fontSize: 11,
    fontWeight: 'bold',
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
});

export default ComboPackCard;
