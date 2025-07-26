import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Share,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, APP_CONSTANTS } from '../../constants';
import { useApp } from '../../contexts/AppContext';
import VariantPopup from '../../components/VariantPopup';
import ApiService from '../../services/apiService';
import type { Product, ProductVariant } from '../../services/apiService';

const { width: screenWidth } = Dimensions.get('window');

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { state, addToCart, addToCartWithVariant, addToWishlist, removeFromWishlist, isInWishlist } = useApp();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  
  const [showVariantPopup, setShowVariantPopup] = useState(false);
  const [variantAction, setVariantAction] = useState<'cart' | 'buy'>('cart');
  
  const [actionLoading, setActionLoading] = useState({
    cart: false,
    wishlist: false,
    buy: false,
  });

  const loadProduct = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const response = await ApiService.getProductById(id);
      if (response.success && response.data) {
        setProduct(response.data.product);
      } else {
        Alert.alert('Error', response.message || 'Product not found');
        router.back();
      }
    } catch (error) {
      console.error('Error loading product:', error);
      Alert.alert('Error', 'Failed to load product details.');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  const handleAction = (type: 'cart' | 'buy') => {
    if (!product) return;
    if (!state.isAuthenticated) {
      Alert.alert('Authentication Required', `Please login to ${type === 'cart' ? 'add items to cart' : 'buy products'}.`);
      router.push('/auth');
      return;
    }

    if (product.hasVariants && product.variants && product.variants.filter(v => v.stock > 0).length > 0) {
      setVariantAction(type);
      setShowVariantPopup(true);
    } else {
      if (type === 'cart') {
        handleAddToCart(product._id, 1);
      } else {
        handleBuyNow(product._id, 1);
      }
    }
  };

  const handleAddToCart = async (productId: string, quantity: number, selectedVariant?: ProductVariant) => {
    setActionLoading(prev => ({ ...prev, cart: true }));
    try {
      const success = selectedVariant 
        ? await addToCartWithVariant(productId, quantity, selectedVariant._id)
        : await addToCart(productId, quantity);
      
      if (success) {
        Alert.alert('Success', `${product?.name} added to cart.`);
      } else {
        Alert.alert('Error', 'Could not add product to cart.');
      }
    } finally {
      setActionLoading(prev => ({ ...prev, cart: false }));
    }
  };

  const handleBuyNow = async (productId: string, quantity: number, selectedVariant?: ProductVariant) => {
    setActionLoading(prev => ({ ...prev, buy: true }));
    try {
      const success = selectedVariant
        ? await addToCartWithVariant(productId, quantity, selectedVariant._id)
        : await addToCart(productId, quantity);

      if (success) {
        router.push('/(tabs)/cart');
      } else {
        Alert.alert('Error', 'Could not process your order.');
      }
    } finally {
      setActionLoading(prev => ({ ...prev, buy: false }));
    }
  };

  const handleWishlistToggle = async () => {
    if (!product) return;
    if (!state.isAuthenticated) {
      Alert.alert('Authentication Required', 'Please login to manage your wishlist.');
      router.push('/auth');
      return;
    }

    setActionLoading(prev => ({ ...prev, wishlist: true }));
    try {
      if (isInWishlist(product._id)) {
        await removeFromWishlist(product._id);
      } else {
        await addToWishlist(product._id);
      }
    } finally {
      setActionLoading(prev => ({ ...prev, wishlist: false }));
    }
  };
  
  const onShare = async () => {
    if (!product) return;
    try {
      await Share.share({
        message: `Check out this product: ${product.name}`,
        title: product.name,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
        <Text style={styles.loadingText}>Loading Product...</Text>
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={60} color={COLORS.ERROR} />
        <Text style={styles.errorText}>Product not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const isWishlisted = isInWishlist(product._id);
  const hasDiscount = product.originalPrice && product.originalPrice > product.price;
  const discountPercent = hasDiscount 
    ? Math.round(((product.originalPrice! - product.price) / product.originalPrice!) * 100)
    : 0;
  const isOutOfStock = !product.hasVariants && product.stock === 0;
  const hasAvailableVariants = product.hasVariants && product.variants && product.variants.some(v => v.stock > 0);
  const isProductUnavailable = isOutOfStock || (product.hasVariants && !hasAvailableVariants);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerIcon}>
          <Ionicons name="arrow-back" size={24} color={COLORS.TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{product.name}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={onShare} style={styles.headerIcon}>
            <Ionicons name="share-social-outline" size={24} color={COLORS.TEXT_PRIMARY} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleWishlistToggle} style={styles.headerIcon}>
            {actionLoading.wishlist ? (
              <ActivityIndicator size="small" color={COLORS.PRIMARY} />
            ) : (
              <Ionicons 
                name={isWishlisted ? "heart" : "heart-outline"} 
                size={24} 
                color={isWishlisted ? COLORS.ERROR : COLORS.TEXT_PRIMARY} 
              />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.imageGallery}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
              setSelectedImageIndex(index);
            }}
            scrollEventThrottle={16}
          >
            {product.images.map((img, index) => (
              <Image key={index} source={{ uri: img || APP_CONSTANTS.IMAGE_PLACEHOLDER }} style={styles.productImage} />
            ))}
          </ScrollView>
          <View style={styles.pagination}>
            {product.images.length > 1 && product.images.map((_, i) => (
              <View key={i} style={[styles.dot, i === selectedImageIndex ? styles.activeDot : {}]} />
            ))}
          </View>
          {hasDiscount && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>{discountPercent}% OFF</Text>
            </View>
          )}
        </View>

        <View style={styles.detailsContainer}>
          <Text style={styles.productName}>{product.name}</Text>
          
          <View style={styles.priceSection}>
            <Text style={styles.currentPrice}>{APP_CONSTANTS.CURRENCY}{product.price.toLocaleString()}</Text>
            {hasDiscount && product.originalPrice && (
              <Text style={styles.originalPrice}>{APP_CONSTANTS.CURRENCY}{product.originalPrice.toLocaleString()}</Text>
            )}
          </View>

          {product.rating && product.rating > 0 && (
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={16} color={COLORS.WARNING} />
              <Text style={styles.ratingText}>{product.rating.toFixed(1)} ({product.reviewCount || 0} reviews)</Text>
            </View>
          )}

          <View style={styles.separator} />

          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{product.description}</Text>

          {isProductUnavailable && !hasAvailableVariants && (
            <View style={styles.stockInfo}>
              <Ionicons name="close-circle-outline" size={20} color={COLORS.ERROR} />
              <Text style={styles.outOfStockText}>Out of Stock</Text>
            </View>
          )}
          {product.stock > 0 && product.stock <= 10 && !product.hasVariants && (
            <View style={styles.stockInfo}>
              <Ionicons name="warning-outline" size={20} color={COLORS.WARNING} />
              <Text style={styles.lowStockText}>Only {product.stock} left in stock!</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {(product.hasVariants && hasAvailableVariants) ? (
          <TouchableOpacity 
            style={[styles.actionButton, styles.primaryButton]}
            onPress={() => handleAction('cart')}
          >
            <Ionicons name="options-outline" size={22} color={COLORS.WHITE} />
            <Text style={styles.actionButtonText}>Select Option</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity 
              style={[styles.actionButton, styles.secondaryButton, (isProductUnavailable || actionLoading.cart) && styles.disabledButton]}
              onPress={() => handleAction('cart')}
              disabled={isProductUnavailable || actionLoading.cart}
            >
              {actionLoading.cart ? <ActivityIndicator color={COLORS.PRIMARY} /> : (
                <>
                  <Ionicons name="cart-outline" size={22} color={COLORS.PRIMARY} />
                  <Text style={[styles.actionButtonText, { color: COLORS.PRIMARY }]}>Add to Cart</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButton, styles.primaryButton, (isProductUnavailable || actionLoading.buy) && styles.disabledButton]}
              onPress={() => handleAction('buy')}
              disabled={isProductUnavailable || actionLoading.buy}
            >
              {actionLoading.buy ? <ActivityIndicator color={COLORS.WHITE} /> : (
                <>
                  <Ionicons name="flash-outline" size={22} color={COLORS.WHITE} />
                  <Text style={styles.actionButtonText}>Buy Now</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>

      <VariantPopup
        isVisible={showVariantPopup}
        onClose={() => setShowVariantPopup(false)}
        product={product}
        actionType={variantAction}
        onAddToCart={handleAddToCart}
        onBuyNow={handleBuyNow}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND,
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.TEXT_SECONDARY,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    textAlign: 'center',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 50,
  },
  backButtonText: {
    color: COLORS.WHITE,
    fontSize: 16,
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: COLORS.WHITE,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  headerIcon: {
    padding: 5,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginHorizontal: 10,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageGallery: {
    height: screenWidth,
    backgroundColor: COLORS.WHITE,
  },
  productImage: {
    width: screenWidth,
    height: screenWidth,
    resizeMode: 'contain',
  },
  pagination: {
    position: 'absolute',
    bottom: 15,
    alignSelf: 'center',
    flexDirection: 'row',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.GRAY,
    marginHorizontal: 4,
    opacity: 0.5,
  },
  activeDot: {
    backgroundColor: COLORS.PRIMARY,
    opacity: 1,
  },
  discountBadge: {
    position: 'absolute',
    top: 15,
    left: 15,
    backgroundColor: COLORS.ERROR,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  discountText: {
    color: COLORS.WHITE,
    fontWeight: 'bold',
    fontSize: 12,
  },
  detailsContainer: {
    padding: 20,
    backgroundColor: COLORS.WHITE,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
  },
  productName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 10,
  },
  priceSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  currentPrice: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
  },
  originalPrice: {
    fontSize: 18,
    color: COLORS.TEXT_SECONDARY,
    textDecorationLine: 'line-through',
    marginLeft: 10,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  ratingText: {
    marginLeft: 5,
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.BORDER,
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: COLORS.TEXT_SECONDARY,
  },
  stockInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
    padding: 10,
    borderRadius: 8,
    backgroundColor: COLORS.BACKGROUND,
  },
  lowStockText: {
    color: COLORS.WARNING,
    fontWeight: '600',
    marginLeft: 10,
  },
  outOfStockText: {
    color: COLORS.ERROR,
    fontWeight: '600',
    marginLeft: 10,
  },
  footer: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: COLORS.WHITE,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 12,
    marginHorizontal: 5,
  },
  primaryButton: {
    backgroundColor: COLORS.PRIMARY,
  },
  secondaryButton: {
    backgroundColor: COLORS.WHITE,
    borderWidth: 1,
    borderColor: COLORS.PRIMARY,
  },
  actionButtonText: {
    color: COLORS.WHITE,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  disabledButton: {
    opacity: 0.5,
  },
});
