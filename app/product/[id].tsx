import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  StatusBar,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  TextInput,
  Modal,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router, useRouter } from 'expo-router';
import { debugAuthState, testTokenPersistence } from '../../utils/debugAuth';
import { COLORS } from '../../constants';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import type { Product, ProductVariant } from '../../services/apiService';
import VariantPopup from '../../components/VariantPopup';

const { width: screenWidth } = Dimensions.get('window');

export default function ProductDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user, isAuthenticated } = useAuth();
  const { state, addToCart, addToWishlist, removeFromWishlist, isInWishlist } = useApp();
  
  // State
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showImageModal, setShowImageModal] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [wishlisted, setWishlisted] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);
  const [showVariantPopup, setShowVariantPopup] = useState(false);
  const [popupAction, setPopupAction] = useState<'cart' | 'buy'>('cart');
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);

  useEffect(() => {
    loadProductDetails();
  }, [id]);

  useEffect(() => {
    if (product) {
      setWishlisted(isInWishlist(product._id));
    }
  }, [product, isInWishlist]);

  useEffect(() => {
    // Reset quantity when variant changes
    setQuantity(1);
  }, [selectedVariant]);

  const loadProductDetails = async () => {
    try {
      setLoading(true);
      
      // Find product from state
      const foundProduct = state.products.find(p => p._id === id);
      
      if (foundProduct) {
        setProduct(foundProduct);
        setReviews([]); // TODO: Load reviews from API
        
        // Auto-select default variant if product has variants
        if (foundProduct.hasVariants && foundProduct.variants?.length) {
          const defaultVariant = getDefaultVariant(foundProduct);
          setSelectedVariant(defaultVariant);
        }
      } else {
        setError('Product not found');
      }
    } catch (error) {
      console.error('Error loading product:', error);
      setError('Failed to load product details');
    } finally {
      setLoading(false);
    }
  };

  // Variant helper functions
  const getDefaultVariant = (product: Product): ProductVariant | null => {
    if (!product?.hasVariants || !product?.variants?.length) return null;
    
    // Filter variants with stock > 0
    const availableVariants = product.variants.filter(v => v.stock > 0);
    if (!availableVariants.length) return null;
    
    // Find explicitly marked default variant
    const defaultVariant = availableVariants.find(v => v.isDefault);
    if (defaultVariant) return defaultVariant;
    
    // Return cheapest variant as default
    return availableVariants.reduce((cheapest, current) => 
      current.price < cheapest.price ? current : cheapest
    );
  };

  const getDisplayStock = (product: Product): number => {
    if (selectedVariant) return selectedVariant.stock;
    
    if (product.hasVariants && product.variants && product.variants.length > 0) {
      const defaultVariant = getDefaultVariant(product);
      return defaultVariant ? defaultVariant.stock : 0;
    }
    return product.stock;
  };

  const getDisplayPrice = (product: Product): number => {
    if (selectedVariant) return selectedVariant.price;
    
    if (product.hasVariants && product.variants && product.variants.length > 0) {
      const defaultVariant = getDefaultVariant(product);
      return defaultVariant ? defaultVariant.price : product.price;
    }
    return product.price;
  };

  const getDisplayOriginalPrice = (product: Product): number | undefined => {
    if (selectedVariant) return selectedVariant.originalPrice;
    
    if (product.hasVariants && product.variants && product.variants.length > 0) {
      const defaultVariant = getDefaultVariant(product);
      return defaultVariant ? defaultVariant.originalPrice : product.originalPrice;
    }
    return product.originalPrice;
  };

  const handleWishlistToggle = async () => {
    if (!isAuthenticated || !user) {
      Alert.alert('Login Required', 'Please login to add items to your wishlist.');
      router.push('/auth');
      return;
    }

    if (!product) return;
    
    try {
      if (wishlisted) {
        await removeFromWishlist(product._id);
        Alert.alert('Success', 'Removed from wishlist');
      } else {
        const success = await addToWishlist(product._id);
        if (success) {
          Alert.alert('Success', 'Added to wishlist');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update wishlist');
      console.error('Wishlist error:', error);
    }
  };

  const handleAddToCart = async (productId = id as string, qty = quantity, variantFromPopup: ProductVariant | null = null): Promise<void> => {
    console.log('🛒 Add to cart called:', { productId, qty, variantFromPopup, isAuthenticated, userState: !!user });
    
    if (!isAuthenticated || !user) {
      console.log('❌ Not authenticated, showing login alert');
      Alert.alert('Login Required', 'Please login to add items to cart.');
      router.push('/auth');
      return;
    }

    if (!product) {
      console.log('❌ No product found');
      return;
    }

    // Use variant from popup, selected variant, or check if product has variants
    const variantToUse = variantFromPopup || selectedVariant;
    
    // If product has variants and no variant is selected, show variant popup
    if (product.hasVariants && !variantToUse) {
      console.log('🔄 Product has variants, showing variant popup');
      setPopupAction('cart');
      setShowVariantPopup(true);
      return;
    }

    // Check stock
    const stockToCheck = variantToUse ? variantToUse.stock : product.stock;
    if (stockToCheck <= 0) {
      Alert.alert('Out of Stock', 'This product is currently out of stock.');
      return;
    }
    
    try {
      console.log('🔄 Adding to cart:', { productId, qty, variantId: variantToUse?.id });
      const success = await addToCart(productId, qty, variantToUse?.id);
      if (success) {
        Alert.alert('Success', `Added ${qty} item(s) to cart`);
      } else {
        Alert.alert('Error', 'Failed to add to cart - please try again');
      }
    } catch (error) {
      console.error('❌ Cart error:', error);
      Alert.alert('Error', 'Failed to add to cart - please check your connection');
    }
  };

  const handleBuyNow = async (productId = id as string, qty = quantity, variantFromPopup: ProductVariant | null = null): Promise<void> => {
    console.log('🛍️ Buy now called:', { productId, qty, variantFromPopup, isAuthenticated, userState: !!user });
    
    if (!isAuthenticated || !user) {
      console.log('❌ Not authenticated, showing login alert');
      Alert.alert('Login Required', 'Please login to make a purchase.');
      router.push('/auth');
      return;
    }

    if (!product) {
      console.log('❌ No product found');
      return;
    }

    // Use variant from popup, selected variant, or check if product has variants
    const variantToUse = variantFromPopup || selectedVariant;
    
    // If product has variants and no variant is selected, show variant popup
    if (product.hasVariants && !variantToUse) {
      console.log('🔄 Product has variants, showing variant popup');
      setPopupAction('buy');
      setShowVariantPopup(true);
      return;
    }

    // Check stock
    const stockToCheck = variantToUse ? variantToUse.stock : product.stock;
    if (stockToCheck <= 0) {
      Alert.alert('Out of Stock', 'This product is currently out of stock.');
      return;
    }
    
    try {
      console.log('🔄 Adding to cart for buy now:', { productId, qty, variantId: variantToUse?._id });
      const success = await addToCart(productId, qty, variantToUse?._id);
      if (success) {
        router.push('/(tabs)/cart');
      } else {
        Alert.alert('Error', 'Failed to process order - please try again');
      }
    } catch (error) {
      console.error('❌ Buy now error:', error);
      Alert.alert('Error', 'Failed to process order - please check your connection');
    }
  };

  const handleVariantConfirm = async (productId: string, quantity: number, selectedVariant: ProductVariant): Promise<void> => {
    setShowVariantPopup(false);
    if (popupAction === 'cart') {
      await handleAddToCart(productId, quantity, selectedVariant);
    } else {
      await handleBuyNow(productId, quantity, selectedVariant);
    }
  };

  const handleVariantBuyNow = async (productId: string, quantity: number, selectedVariant: ProductVariant): Promise<void> => {
    setShowVariantPopup(false);
    await handleBuyNow(productId, quantity, selectedVariant);
  };

  // Debug function for Android authentication issues
  const handleDebugAuth = async () => {
    console.log('🔍 Starting manual auth debug...');
    Alert.alert('Debug', 'Starting auth debug - check console logs');
    
    try {
      await debugAuthState();
      await testTokenPersistence();
      Alert.alert('Debug Complete', 'Check console for detailed auth state information');
    } catch (error) {
      console.error('Debug error:', error);
      Alert.alert('Debug Error', 'Failed to run debug - check console');
    }
  };

  const submitReview = async () => {
    if (!isAuthenticated) {
      Alert.alert('Login Required', 'Please login to submit a review.');
      return;
    }

    if (!product) return;

    if (myRating === 0) {
      Alert.alert('Invalid Review', 'Please select a rating.');
      return;
    }
    
    if (!myComment.trim()) {
      Alert.alert('Invalid Review', 'Please write a review.');
      return;
    }
    
    if (myComment.trim().length < 10) {
      Alert.alert('Invalid Review', 'Review must be at least 10 characters long.');
      return;
    }

    setSubmitting(true);
    try {
      // TODO: Implement review submission
      Alert.alert('Success', 'Review submitted successfully');
      setMyRating(0);
      setMyComment('');
    } catch (error) {
      Alert.alert('Error', 'Failed to submit review');
      console.error('Review error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (rating: number, interactive = false, onStarClick?: (star: number) => void, onStarHover?: (star: number) => void) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => interactive && onStarClick && onStarClick(star)}
            onPressIn={() => interactive && onStarHover && onStarHover(star)}
            onPressOut={() => interactive && onStarHover && onStarHover(0)}
            disabled={!interactive}
            style={styles.starButton}
          >
            <Ionicons
              name={star <= rating ? 'star' : 'star-outline'}
              size={20}
              color={star <= rating ? COLORS.WARNING : COLORS.GRAY}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const images = product?.images?.length ? product.images : ['/placeholder.png'];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.WHITE} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY} />
          <Text style={styles.loadingText}>Loading product details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !product) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.WHITE} />
        <View style={styles.errorContainer}>
          <Ionicons name="cube-outline" size={64} color={COLORS.GRAY} />
          <Text style={styles.errorTitle}>Product Not Found</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
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
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Product Details</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Product Details Card */}
        <View style={styles.productCard}>
          <View style={styles.productGrid}>
            {/* Left Column - Images */}
            <View style={styles.imageSection}>
              <View style={styles.mainImageContainer}>
                <TouchableOpacity
                  onPress={() => setShowImageModal(true)}
                  style={styles.mainImageTouchable}
                >
                  <Image
                    source={{ uri: images[selectedImageIndex] }}
                    style={styles.mainImage}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
                
                {getDisplayStock(product) <= 0 && (
                  <View style={styles.outOfStockBadge}>
                    <Text style={styles.outOfStockText}>Out of Stock</Text>
                  </View>
                )}
              </View>
              
              {images.length > 1 && (
                <ScrollView 
                  horizontal 
                  style={styles.thumbnailContainer}
                  showsHorizontalScrollIndicator={false}
                >
                  {images.map((img, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.thumbnail,
                        selectedImageIndex === idx && styles.thumbnailSelected
                      ]}
                      onPress={() => setSelectedImageIndex(idx)}
                    >
                      <Image 
                        source={{ uri: img }} 
                        style={styles.thumbnailImage} 
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>

            {/* Right Column - Product Info */}
            <View style={styles.productInfo}>
              <View style={styles.productHeader}>
                <Text style={styles.productName}>{product.name}</Text>
                <TouchableOpacity
                  style={[
                    styles.wishlistButton,
                    wishlisted && styles.wishlistButtonActive
                  ]}
                  onPress={handleWishlistToggle}
                >
                  <Ionicons 
                    name={wishlisted ? "heart" : "heart-outline"} 
                    size={24} 
                    color={wishlisted ? COLORS.ERROR : COLORS.TEXT_SECONDARY} 
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.priceContainer}>
                <Text style={styles.currentPrice}>
                  ₹{getDisplayPrice(product).toLocaleString()}
                </Text>
                {getDisplayOriginalPrice(product) && getDisplayOriginalPrice(product)! > getDisplayPrice(product) && (
                  <Text style={styles.originalPrice}>
                    ₹{getDisplayOriginalPrice(product)!.toLocaleString()}
                  </Text>
                )}
              </View>

              <View style={styles.ratingCard}>
                <View style={styles.ratingContainer}>
                  {renderStars(Math.round(reviews.reduce((a, b) => a + (b.rating || 0), 0) / (reviews.length || 1)))}
                  <Text style={styles.ratingText}>
                    ({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})
                  </Text>
                </View>
              </View>

              <View style={styles.categoryCard}>
                <Text style={styles.categoryLabel}>{product.category}</Text>
                <Text style={styles.productDescription}>{product.description}</Text>
              </View>

              {/* Variant Selector */}
              {product.hasVariants && product.variants && (
                <View style={styles.variantSection}>
                  <Text style={styles.variantTitle}>Choose Variant:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.variantList}>
                      {product.variants.map((variant) => (
                        <TouchableOpacity
                          key={variant._id}
                          style={[
                            styles.variantOption,
                            selectedVariant?._id === variant._id && styles.variantOptionSelected,
                            variant.stock <= 0 && styles.variantOptionDisabled
                          ]}
                          onPress={() => variant.stock > 0 && setSelectedVariant(variant)}
                          disabled={variant.stock <= 0}
                        >
                          <Text style={[
                            styles.variantOptionText,
                            selectedVariant?._id === variant._id && styles.variantOptionTextSelected,
                            variant.stock <= 0 && styles.variantOptionTextDisabled
                          ]}>
                            {variant.name}
                          </Text>
                          <Text style={[
                            styles.variantPrice,
                            selectedVariant?._id === variant._id && styles.variantPriceSelected
                          ]}>
                            ₹{variant.price}
                          </Text>
                          {variant.stock <= 0 && (
                            <Text style={styles.variantOutOfStock}>Out of Stock</Text>
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              )}

              <View style={styles.stockCard}>
                <View style={styles.stockIndicator}>
                  <View style={[
                    styles.stockDot,
                    { backgroundColor: getDisplayStock(product) > 0 ? COLORS.SUCCESS : COLORS.ERROR }
                  ]} />
                  <Text style={styles.stockText}>
                    {getDisplayStock(product) > 0 
                      ? `${getDisplayStock(product)} units available` 
                      : 'Out of Stock'
                    }
                  </Text>
                </View>
              </View>

              <View style={styles.quantityCard}>
                <Text style={styles.quantityLabel}>Quantity:</Text>
                <View style={styles.quantitySelector}>
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => setQuantity(prev => Math.max(1, prev - 1))}
                    disabled={quantity <= 1}
                  >
                    <Ionicons name="remove" size={16} color={COLORS.TEXT_PRIMARY} />
                  </TouchableOpacity>
                  <TextInput 
                    style={styles.quantityInput}
                    value={quantity.toString()}
                    onChangeText={(text) => {
                      const num = parseInt(text) || 1;
                      setQuantity(Math.min(Math.max(1, num), getDisplayStock(product)));
                    }}
                    keyboardType="numeric"
                    textAlign="center"
                  />
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => setQuantity(prev => Math.min(prev + 1, getDisplayStock(product)))}
                    disabled={quantity >= getDisplayStock(product)}
                  >
                    <Ionicons name="add" size={16} color={COLORS.TEXT_PRIMARY} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  style={[
                    styles.addToCartButton,
                    getDisplayStock(product) <= 0 && styles.disabledButton
                  ]}
                  onPress={() => handleAddToCart()}
                  disabled={getDisplayStock(product) <= 0}
                >
                  <Ionicons name="cart" size={20} color={COLORS.WHITE} />
                  <Text style={styles.addToCartText}>
                    {product.hasVariants ? 'Select & Add' : 'Add to Cart'}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[
                    styles.buyNowButton,
                    getDisplayStock(product) <= 0 && styles.disabledButton
                  ]}
                  onPress={() => handleBuyNow()}
                  disabled={getDisplayStock(product) <= 0}
                >
                  <Text style={styles.buyNowText}>
                    {product.hasVariants ? 'Select & Buy' : 'Buy Now'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Reviews Section */}
        <View style={styles.reviewsSection}>
          <Text style={styles.sectionTitle}>Customer Reviews</Text>
          
          {reviews.length > 0 ? (
            <View style={styles.reviewsList}>
              {reviews.map((review, index) => (
                <View key={index} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewerInfo}>
                      <View style={styles.reviewerAvatar}>
                        <Text style={styles.reviewerInitial}>
                          {review.user?.charAt(0) || 'A'}
                        </Text>
                      </View>
                      <View>
                        <Text style={styles.reviewerName}>{review.user || 'Anonymous'}</Text>
                        <Text style={styles.reviewDate}>
                          {new Date(review.createdAt || Date.now()).toLocaleDateString()}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.reviewRating}>
                      {renderStars(review.rating || 0)}
                    </View>
                  </View>
                  <Text style={styles.reviewComment}>{review.comment}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.noReviewsContainer}>
              <Ionicons name="star-outline" size={48} color={COLORS.GRAY} />
              <Text style={styles.noReviewsText}>
                No reviews yet. Be the first to review this product!
              </Text>
            </View>
          )}

          {/* Add Review Form */}
          <View style={styles.addReviewCard}>
            <Text style={styles.addReviewTitle}>Write a Review</Text>
            {isAuthenticated ? (
              <View>
                <View style={styles.ratingInput}>
                  <Text style={styles.ratingLabel}>Your Rating</Text>
                  {renderStars(
                    hoverRating || myRating,
                    true,
                    setMyRating,
                    setHoverRating
                  )}
                </View>

                <View style={styles.commentInput}>
                  <Text style={styles.commentLabel}>Your Review</Text>
                  <TextInput
                    style={styles.commentTextInput}
                    value={myComment}
                    onChangeText={setMyComment}
                    multiline
                    numberOfLines={4}
                    placeholder="Share your thoughts about this product... (minimum 10 characters)"
                    placeholderTextColor={COLORS.GRAY}
                  />
                  <Text style={styles.commentCounter}>
                    {myComment.trim().length}/10 characters minimum
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.submitReviewButton,
                    submitting && styles.disabledButton
                  ]}
                  onPress={submitReview}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color={COLORS.WHITE} />
                  ) : (
                    <Text style={styles.submitReviewText}>Submit Review</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.loginPrompt}>
                <Text style={styles.loginPromptText}>Please login to share your review</Text>
                <TouchableOpacity
                  style={styles.loginButton}
                  onPress={() => router.push('/auth')}
                >
                  <Text style={styles.loginButtonText}>Login to Review</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Image Modal */}
      <Modal
        visible={showImageModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowImageModal(false)}
      >
        <View style={styles.imageModalContainer}>
          <TouchableOpacity
            style={styles.imageModalOverlay}
            onPress={() => setShowImageModal(false)}
          />
          
          <View style={styles.imageModalContent}>
            <TouchableOpacity
              style={styles.closeImageButton}
              onPress={() => setShowImageModal(false)}
            >
              <Text style={styles.closeImageText}>×</Text>
            </TouchableOpacity>
            
            <View style={styles.modalImageContainer}>
              <Image 
                source={{ uri: images[selectedImageIndex] }}
                style={styles.modalImage}
                resizeMode="contain"
              />
              
              {/* Navigation buttons */}
              {images.length > 1 && (
                <>
                  <TouchableOpacity 
                    style={[styles.modalNavButton, styles.modalNavLeft]}
                    onPress={() => setSelectedImageIndex(prev => (prev - 1 + images.length) % images.length)}
                  >
                    <Ionicons name="chevron-back" size={24} color={COLORS.WHITE} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.modalNavButton, styles.modalNavRight]}
                    onPress={() => setSelectedImageIndex(prev => (prev + 1) % images.length)}
                  >
                    <Ionicons name="chevron-forward" size={24} color={COLORS.WHITE} />
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Variant Selection Popup */}
      <VariantPopup
        isVisible={showVariantPopup}
        product={product}
        onClose={() => {
          setShowVariantPopup(false);
          setPopupAction('cart');
        }}
        onAddToCart={handleVariantConfirm}
        onBuyNow={handleVariantBuyNow}
        actionType={popupAction}
      />
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
    marginTop: 12,
    fontSize: 16,
    color: COLORS.TEXT_SECONDARY,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginBottom: 24,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 8,
  },
  backButtonText: {
    color: COLORS.WHITE,
    fontSize: 16,
    fontWeight: '600',
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
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  scrollView: {
    flex: 1,
  },
  productCard: {
    backgroundColor: COLORS.WHITE,
    margin: 8,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  productGrid: {
    flexDirection: 'column',
    gap: 16,
  },
  imageSection: {
    gap: 12,
  },
  mainImageContainer: {
    height: 300,
    borderRadius: 12,
    backgroundColor: COLORS.BACKGROUND,
    overflow: 'hidden',
    position: 'relative',
  },
  mainImageTouchable: {
    flex: 1,
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  outOfStockBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: COLORS.ERROR,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  outOfStockText: {
    color: COLORS.WHITE,
    fontSize: 12,
    fontWeight: '600',
  },
  thumbnailContainer: {
    flexDirection: 'row',
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbnailSelected: {
    borderColor: COLORS.PRIMARY,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  productInfo: {
    gap: 16,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  productName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    flex: 1,
    paddingRight: 12,
  },
  wishlistButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.BACKGROUND,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  wishlistButtonActive: {
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  currentPrice: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.SUCCESS,
  },
  originalPrice: {
    fontSize: 20,
    color: COLORS.TEXT_SECONDARY,
    textDecorationLine: 'line-through',
  },
  ratingCard: {
    backgroundColor: COLORS.BACKGROUND,
    padding: 12,
    borderRadius: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  starsContainer: {
    flexDirection: 'row',
  },
  starButton: {
    marginRight: 2,
  },
  ratingText: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
  },
  categoryCard: {
    backgroundColor: COLORS.BACKGROUND,
    padding: 16,
    borderRadius: 12,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.TEXT_SECONDARY,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  productDescription: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    lineHeight: 20,
  },
  variantSection: {
    gap: 12,
  },
  variantTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  variantList: {
    flexDirection: 'row',
    gap: 8,
  },
  variantOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    backgroundColor: COLORS.WHITE,
    minWidth: 100,
    alignItems: 'center',
  },
  variantOptionSelected: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: COLORS.PRIMARY + '10',
  },
  variantOptionDisabled: {
    backgroundColor: COLORS.BACKGROUND,
    opacity: 0.6,
  },
  variantOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 4,
  },
  variantOptionTextSelected: {
    color: COLORS.PRIMARY,
  },
  variantOptionTextDisabled: {
    color: COLORS.TEXT_SECONDARY,
  },
  variantPrice: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
  },
  variantPriceSelected: {
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },
  variantOutOfStock: {
    fontSize: 10,
    color: COLORS.ERROR,
    marginTop: 2,
  },
  stockCard: {
    backgroundColor: COLORS.BACKGROUND,
    padding: 16,
    borderRadius: 12,
  },
  stockIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stockDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  stockText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.TEXT_PRIMARY,
  },
  quantityCard: {
    backgroundColor: COLORS.BACKGROUND,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quantityLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.TEXT_PRIMARY,
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.WHITE,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  quantityButton: {
    padding: 12,
  },
  quantityInput: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.TEXT_PRIMARY,
    minWidth: 60,
    borderWidth: 0,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 8,
  },
  addToCartButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.SUCCESS,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: COLORS.SUCCESS,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  addToCartText: {
    color: COLORS.WHITE,
    fontSize: 16,
    fontWeight: '600',
  },
  buyNowButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.PRIMARY,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: COLORS.PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buyNowText: {
    color: COLORS.WHITE,
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: COLORS.GRAY,
    opacity: 0.6,
    shadowOpacity: 0,
    elevation: 0,
  },
  reviewsSection: {
    backgroundColor: COLORS.WHITE,
    margin: 8,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 16,
  },
  reviewsList: {
    gap: 16,
    marginBottom: 16,
  },
  reviewCard: {
    backgroundColor: COLORS.BACKGROUND,
    padding: 16,
    borderRadius: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  reviewerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.SUCCESS + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  reviewerInitial: {
    color: COLORS.SUCCESS,
    fontSize: 16,
    fontWeight: '600',
  },
  reviewerName: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.TEXT_PRIMARY,
  },
  reviewDate: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
  },
  reviewRating: {
    alignItems: 'flex-end',
  },
  reviewComment: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    lineHeight: 20,
  },
  noReviewsContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    marginBottom: 16,
  },
  noReviewsText: {
    fontSize: 16,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
  },
  addReviewCard: {
    backgroundColor: COLORS.BACKGROUND,
    padding: 16,
    borderRadius: 12,
  },
  addReviewTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 16,
  },
  ratingInput: {
    marginBottom: 16,
  },
  ratingLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 8,
  },
  commentInput: {
    marginBottom: 16,
  },
  commentLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 8,
  },
  commentTextInput: {
    backgroundColor: COLORS.WHITE,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: COLORS.TEXT_PRIMARY,
    textAlignVertical: 'top',
    minHeight: 100,
  },
  commentCounter: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 4,
  },
  submitReviewButton: {
    backgroundColor: COLORS.SUCCESS,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitReviewText: {
    color: COLORS.WHITE,
    fontSize: 16,
    fontWeight: '600',
  },
  loginPrompt: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  loginPromptText: {
    fontSize: 16,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: 16,
  },
  loginButton: {
    backgroundColor: COLORS.SUCCESS,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  loginButtonText: {
    color: COLORS.WHITE,
    fontSize: 16,
    fontWeight: '600',
  },
  imageModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  imageModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  imageModalContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  closeImageButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  closeImageText: {
    color: COLORS.WHITE,
    fontSize: 24,
    fontWeight: 'bold',
  },
  modalImageContainer: {
    width: screenWidth * 0.9,
    height: screenWidth * 0.9,
    position: 'relative',
  },
  modalImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  modalNavButton: {
    position: 'absolute',
    top: '50%',
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalNavLeft: {
    left: -50,
  },
  modalNavRight: {
    right: -50,
  },
  debugSection: {
    backgroundColor: COLORS.WHITE,
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FF6B6B',
    borderStyle: 'dashed',
  },
  debugTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B6B',
    marginBottom: 12,
    textAlign: 'center',
  },
  debugButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  debugButtonText: {
    color: COLORS.WHITE,
    fontSize: 14,
    fontWeight: '600',
  },
});
