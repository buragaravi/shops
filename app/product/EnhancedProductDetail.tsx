import React, { useEffect, useState } from 'react';
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
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, APP_CONSTANTS } from '../../constants';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import VariantPopup from '../../components/VariantPopup';
import ApiService from '../../services/apiService';
import type { Product, ProductVariant } from '../../services/apiService';

const { width: screenWidth } = Dimensions.get('window');

const EnhancedProductDetailScreen: React.FC = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { 
    addToCart, 
    addToCartWithVariant, 
    addToWishlist, 
    removeFromWishlist, 
    isInWishlist 
  } = useApp();

  // Local state
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [showVariantPopup, setShowVariantPopup] = useState(false);
  const [variantAction, setVariantAction] = useState<'cart' | 'buy'>('cart');

  useEffect(() => {
    if (id) {
      loadProduct();
    }
  }, [id]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      const response = await ApiService.getProductById(id!);
      if (response.success && response.data) {
        setProduct(response.data.product);
        
        // Set default variant if product has variants
        if (response.data.product.hasVariants && response.data.product.variants?.length) {
          const defaultVariant = response.data.product.variants.find(v => v.isDefault) ||
                                  response.data.product.variants[0];
          setSelectedVariant(defaultVariant);
        }
      } else {
        Alert.alert('Error', 'Product not found');
      }
    } catch (error) {
      console.error('Error loading product:', error);
      Alert.alert('Error', 'Failed to load product');
    } finally {
      setLoading(false);
    }
  };

  const handleImagePress = (index: number) => {
    setSelectedImageIndex(index);
  };

  const handleQuantityChange = (delta: number) => {
    const newQuantity = quantity + delta;
    const maxStock = selectedVariant?.stock || product?.stock || 0;
    
    if (newQuantity >= 1 && newQuantity <= maxStock) {
      setQuantity(newQuantity);
    }
  };

  const handleAddToCart = async () => {
    if (!user) {
      Alert.alert('Authentication Required', 'Please login to add items to cart');
      return;
    }

    if (!product) return;

    // Check if product has variants and none is selected
    if (product.hasVariants && product.variants?.length && !selectedVariant) {
      setVariantAction('cart');
      setShowVariantPopup(true);
      return;
    }

    try {
      let success = false;
      
      if (selectedVariant) {
        success = await addToCartWithVariant(product._id, quantity, selectedVariant._id);
      } else {
        success = await addToCart(product._id, quantity);
      }
      
      if (success) {
        Alert.alert('Success', 'Product added to cart');
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      Alert.alert('Error', 'Failed to add product to cart');
    }
  };

  const handleBuyNow = async () => {
    if (!user) {
      Alert.alert('Authentication Required', 'Please login to buy products');
      return;
    }

    if (!product) return;

    // Check if product has variants and none is selected
    if (product.hasVariants && product.variants?.length && !selectedVariant) {
      setVariantAction('buy');
      setShowVariantPopup(true);
      return;
    }

    try {
      let success = false;
      
      if (selectedVariant) {
        success = await addToCartWithVariant(product._id, quantity, selectedVariant._id);
      } else {
        success = await addToCart(product._id, quantity);
      }
      
      if (success) {
        router.push('/cart');
      }
    } catch (error) {
      console.error('Error buying now:', error);
      Alert.alert('Error', 'Failed to process purchase');
    }
  };

  const handleWishlistToggle = async () => {
    if (!user) {
      Alert.alert('Authentication Required', 'Please login to add items to wishlist');
      return;
    }

    if (!product) return;

    try {
      if (isInWishlist(product._id)) {
        await removeFromWishlist(product._id);
        Alert.alert('Removed', 'Product removed from wishlist');
      } else {
        await addToWishlist(product._id);
        Alert.alert('Added', 'Product added to wishlist');
      }
    } catch (error) {
      console.error('Error toggling wishlist:', error);
      Alert.alert('Error', 'Failed to update wishlist');
    }
  };

  const handleVariantSelect = (variant: ProductVariant) => {
    setSelectedVariant(variant);
    setQuantity(1); // Reset quantity when variant changes
  };

  const handleAddToCartWithVariant = async (
    productId: string,
    quantity: number,
    selectedVariant: ProductVariant
  ) => {
    try {
      const success = await addToCartWithVariant(productId, quantity, selectedVariant._id);
      if (success) {
        Alert.alert('Success', 'Product added to cart');
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      Alert.alert('Error', 'Failed to add product to cart');
    }
  };

  const handleBuyNowWithVariant = async (
    productId: string,
    quantity: number,
    selectedVariant: ProductVariant
  ) => {
    try {
      const success = await addToCartWithVariant(productId, quantity, selectedVariant._id);
      if (success) {
        router.push('/cart');
      }
    } catch (error) {
      console.error('Error buying now:', error);
      Alert.alert('Error', 'Failed to process purchase');
    }
  };

  const getDisplayPrice = () => {
    if (selectedVariant) {
      return selectedVariant.price;
    }
    return product?.price || 0;
  };

  const getDisplayOriginalPrice = () => {
    if (selectedVariant) {
      return selectedVariant.originalPrice;
    }
    return product?.originalPrice;
  };

  const getDisplayStock = () => {
    if (selectedVariant) {
      return selectedVariant.stock;
    }
    return product?.stock || 0;
  };

  const renderImageItem = ({ item, index }: { item: string; index: number }) => (
    <TouchableOpacity onPress={() => handleImagePress(index)}>
      <Image
        source={{ uri: item }}
        style={[
          styles.thumbnailImage,
          index === selectedImageIndex && styles.selectedThumbnail
        ]}
        resizeMode="cover"
      />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY} />
          <Text style={styles.loadingText}>Loading product...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color={COLORS.ERROR} />
          <Text style={styles.errorText}>Product not found</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const displayPrice = getDisplayPrice();
  const displayOriginalPrice = getDisplayOriginalPrice();
  const displayStock = getDisplayStock();
  const hasDiscount = displayOriginalPrice && displayOriginalPrice > displayPrice;
  const discountPercentage = hasDiscount
    ? Math.round(((displayOriginalPrice! - displayPrice) / displayOriginalPrice!) * 100)
    : 0;
  const isOutOfStock = displayStock <= 0;
  const isWishlisted = isInWishlist(product._id);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Product Details</Text>
        <TouchableOpacity onPress={handleWishlistToggle} style={styles.headerButton}>
          <Ionicons 
            name={isWishlisted ? 'heart' : 'heart-outline'} 
            size={24} 
            color={isWishlisted ? COLORS.ERROR : COLORS.TEXT_PRIMARY} 
          />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Main Product Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: product.images?.[selectedImageIndex] || APP_CONSTANTS.IMAGE_PLACEHOLDER }}
            style={styles.mainImage}
            resizeMode="cover"
          />
          
          {/* Discount Badge */}
          {hasDiscount && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>{discountPercentage}% OFF</Text>
            </View>
          )}
        </View>

        {/* Image Thumbnails */}
        {product.images && product.images.length > 1 && (
          <View style={styles.thumbnailContainer}>
            <FlatList
              data={product.images}
              renderItem={renderImageItem}
              keyExtractor={(_, index) => index.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.thumbnailList}
            />
          </View>
        )}

        {/* Product Info */}
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{product.name}</Text>
          
          {/* Rating */}
          <View style={styles.ratingContainer}>
            <View style={styles.ratingStars}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Ionicons
                  key={star}
                  name={star <= (product.rating || 0) ? 'star' : 'star-outline'}
                  size={16}
                  color={star <= (product.rating || 0) ? '#FFD700' : COLORS.TEXT_SECONDARY}
                />
              ))}
            </View>
            <Text style={styles.ratingText}>
              ({product.reviewCount || 0} reviews)
            </Text>
          </View>

          {/* Price */}
          <View style={styles.priceContainer}>
            <Text style={styles.currentPrice}>
              {APP_CONSTANTS.CURRENCY}{displayPrice.toLocaleString()}
            </Text>
            {hasDiscount && (
              <Text style={styles.originalPrice}>
                {APP_CONSTANTS.CURRENCY}{displayOriginalPrice!.toLocaleString()}
              </Text>
            )}
          </View>

          {/* Stock Status */}
          <View style={styles.stockContainer}>
            {isOutOfStock ? (
              <Text style={styles.outOfStockText}>Out of Stock</Text>
            ) : displayStock <= 10 ? (
              <Text style={styles.lowStockText}>Only {displayStock} left in stock!</Text>
            ) : (
              <Text style={styles.inStockText}>In Stock ({displayStock} available)</Text>
            )}
          </View>

          {/* Variants */}
          {product.hasVariants && product.variants?.length && (
            <View style={styles.variantsContainer}>
              <Text style={styles.sectionTitle}>Available Variants:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.variantsList}>
                  {product.variants.map((variant) => (
                    <TouchableOpacity
                      key={variant._id}
                      style={[
                        styles.variantChip,
                        selectedVariant?._id === variant._id && styles.selectedVariantChip,
                        variant.stock <= 0 && styles.disabledVariantChip,
                      ]}
                      onPress={() => handleVariantSelect(variant)}
                      disabled={variant.stock <= 0}
                    >
                      <Text style={[
                        styles.variantChipText,
                        selectedVariant?._id === variant._id && styles.selectedVariantChipText,
                        variant.stock <= 0 && styles.disabledVariantChipText,
                      ]}>
                        {variant.name}
                      </Text>
                      <Text style={[
                        styles.variantChipPrice,
                        selectedVariant?._id === variant._id && styles.selectedVariantChipPrice,
                        variant.stock <= 0 && styles.disabledVariantChipText,
                      ]}>
                        {APP_CONSTANTS.CURRENCY}{variant.price}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {/* Quantity Selector */}
          {!isOutOfStock && (
            <View style={styles.quantityContainer}>
              <Text style={styles.sectionTitle}>Quantity:</Text>
              <View style={styles.quantitySelector}>
                <TouchableOpacity
                  style={[styles.quantityButton, quantity <= 1 && styles.quantityButtonDisabled]}
                  onPress={() => handleQuantityChange(-1)}
                  disabled={quantity <= 1}
                >
                  <Text style={[styles.quantityButtonText, quantity <= 1 && styles.quantityButtonTextDisabled]}>−</Text>
                </TouchableOpacity>
                
                <Text style={styles.quantityText}>{quantity}</Text>
                
                <TouchableOpacity
                  style={[styles.quantityButton, quantity >= displayStock && styles.quantityButtonDisabled]}
                  onPress={() => handleQuantityChange(1)}
                  disabled={quantity >= displayStock}
                >
                  <Text style={[styles.quantityButtonText, quantity >= displayStock && styles.quantityButtonTextDisabled]}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Description */}
          <View style={styles.descriptionContainer}>
            <Text style={styles.sectionTitle}>Description:</Text>
            <Text style={styles.descriptionText}>{product.description}</Text>
          </View>

          {/* Product Details */}
          <View style={styles.detailsContainer}>
            <Text style={styles.sectionTitle}>Product Details:</Text>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Category:</Text>
              <Text style={styles.detailValue}>{product.category}</Text>
            </View>
            {selectedVariant?.sku && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>SKU:</Text>
                <Text style={styles.detailValue}>{selectedVariant.sku}</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.totalPriceContainer}>
          <Text style={styles.totalLabel}>Total:</Text>
          <Text style={styles.totalPrice}>
            {APP_CONSTANTS.CURRENCY}{(displayPrice * quantity).toLocaleString()}
          </Text>
        </View>
        
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.addToCartButton, isOutOfStock && styles.disabledButton]}
            onPress={handleAddToCart}
            disabled={isOutOfStock}
          >
            <Ionicons name="cart" size={20} color={COLORS.WHITE} />
            <Text style={styles.addToCartText}>Add to Cart</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.buyNowButton, isOutOfStock && styles.disabledButton]}
            onPress={handleBuyNow}
            disabled={isOutOfStock}
          >
            <Ionicons name="flash" size={20} color={COLORS.WHITE} />
            <Text style={styles.buyNowText}>Buy Now</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Variant Popup */}
      <VariantPopup
        isVisible={showVariantPopup}
        onClose={() => setShowVariantPopup(false)}
        product={product}
        onAddToCart={handleAddToCartWithVariant}
        onBuyNow={handleBuyNowWithVariant}
        actionType={variantAction}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.WHITE,
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
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.ERROR,
    marginTop: 16,
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backButtonText: {
    color: COLORS.WHITE,
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
  },
  content: {
    flex: 1,
  },
  imageContainer: {
    position: 'relative',
    height: 300,
    backgroundColor: COLORS.BACKGROUND,
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  discountBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: COLORS.ERROR,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  discountText: {
    color: COLORS.WHITE,
    fontSize: 12,
    fontWeight: 'bold',
  },
  thumbnailContainer: {
    paddingVertical: 16,
    backgroundColor: COLORS.BACKGROUND,
  },
  thumbnailList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  thumbnailImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 8,
  },
  selectedThumbnail: {
    borderWidth: 2,
    borderColor: COLORS.PRIMARY,
  },
  productInfo: {
    padding: 20,
  },
  productName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  ratingStars: {
    flexDirection: 'row',
    marginRight: 8,
  },
  ratingText: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  currentPrice: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
    marginRight: 12,
  },
  originalPrice: {
    fontSize: 18,
    color: COLORS.TEXT_SECONDARY,
    textDecorationLine: 'line-through',
  },
  stockContainer: {
    marginBottom: 20,
  },
  outOfStockText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.ERROR,
  },
  lowStockText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF9500',
  },
  inStockText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.SUCCESS,
  },
  variantsContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 12,
  },
  variantsList: {
    flexDirection: 'row',
    gap: 8,
  },
  variantChip: {
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
  },
  selectedVariantChip: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: `${COLORS.PRIMARY}15`,
  },
  disabledVariantChip: {
    opacity: 0.5,
  },
  variantChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  selectedVariantChipText: {
    color: COLORS.PRIMARY,
  },
  disabledVariantChipText: {
    color: COLORS.TEXT_SECONDARY,
  },
  variantChipPrice: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 2,
  },
  selectedVariantChipPrice: {
    color: COLORS.PRIMARY,
  },
  quantityContainer: {
    marginBottom: 20,
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: COLORS.BACKGROUND,
    borderRadius: 12,
    overflow: 'hidden',
  },
  quantityButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.WHITE,
  },
  quantityButtonDisabled: {
    opacity: 0.5,
  },
  quantityButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
  },
  quantityButtonTextDisabled: {
    color: COLORS.TEXT_SECONDARY,
  },
  quantityText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    minWidth: 60,
    textAlign: 'center',
    backgroundColor: COLORS.WHITE,
    lineHeight: 44,
  },
  descriptionContainer: {
    marginBottom: 20,
  },
  descriptionText: {
    fontSize: 16,
    lineHeight: 24,
    color: COLORS.TEXT_SECONDARY,
  },
  detailsContainer: {
    marginBottom: 20,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  detailLabel: {
    fontSize: 16,
    color: COLORS.TEXT_SECONDARY,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  bottomBar: {
    backgroundColor: COLORS.WHITE,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
    shadowColor: COLORS.BLACK,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  totalPriceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 16,
    color: COLORS.TEXT_SECONDARY,
  },
  totalPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  addToCartButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.PRIMARY,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  buyNowButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF9500',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  disabledButton: {
    opacity: 0.5,
  },
  addToCartText: {
    color: COLORS.WHITE,
    fontSize: 16,
    fontWeight: 'bold',
  },
  buyNowText: {
    color: COLORS.WHITE,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default EnhancedProductDetailScreen;
