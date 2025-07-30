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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { COLORS } from '../../constants';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import type { ComboPack } from '../../services/apiService';

const { width: screenWidth } = Dimensions.get('window');

export default function ComboPackDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user, isAuthenticated } = useAuth();
  const { state, addComboToCart, addComboToWishlist, removeComboFromWishlist, isComboInWishlist } = useApp();
  
  // State
  const [comboPack, setComboPack] = useState<ComboPack | null>(null);
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
  const [allImages, setAllImages] = useState<any[]>([]);

  useEffect(() => {
    loadComboPackDetails();
  }, [id]);

  useEffect(() => {
    if (comboPack && comboPack._id) {
      console.log('🛍️ Checking wishlist state for combo pack:', comboPack._id);
      setWishlisted(isComboInWishlist(comboPack._id));
    }
  }, [comboPack, isComboInWishlist]);

  const loadComboPackDetails = async () => {
    try {
      setLoading(true);
      
      // For now, find combo pack from state
      const foundComboPack = state.comboPacks.find(combo => combo._id === id);
      console.log('🔄 Loading combo pack:', id, foundComboPack);
      if (foundComboPack) {
        setComboPack(foundComboPack);
        setReviews([]); // TODO: Add reviews to ComboPack interface
        
        // Collect all images for gallery
        const images: any[] = [];
        
        // Add main combo pack image if exists
        if (foundComboPack.mainImage) {
          images.push({
            url: foundComboPack.mainImage,
            alt: `${foundComboPack.name} - Main Image`,
            source: 'combo'
          });
        }
        
        // Add combo pack images
        if (foundComboPack.images) {
          foundComboPack.images.forEach((img, imgIndex) => {
            images.push({
              url: img,
              alt: `${foundComboPack.name} - Image ${imgIndex + 1}`,
              source: 'combo'
            });
          });
        }
        
        // Add product images
        foundComboPack.products?.forEach((productItem, productIndex) => {
          // Check if product data exists
          if (productItem?.productName) {
            // For now, use placeholder since we don't have product images in the combo structure
            images.push({
              url: 'https://via.placeholder.com/400x400',
              alt: `${productItem.productName} - Image`,
              source: 'product',
              productName: productItem.productName,
              variantName: productItem.variantName || 'Default'
            });
          } else {
            console.warn('⚠️ Product data missing in combo pack:', productItem);
          }
        });
        
        setAllImages(images);
        
        // Check wishlist status if authenticated
        if (isAuthenticated && comboPack) {
          const inWishlist = isComboInWishlist(comboPack._id);
          setWishlisted(inWishlist);
        }
      } else {
        setError('Combo pack not found');
      }
    } catch (error) {
      console.error('Error loading combo pack:', error);
      setError('Failed to load combo pack details');
    } finally {
      setLoading(false);
    }
  };

  const handleWishlistToggle = async () => {
    if (!isAuthenticated || !user) {
      Alert.alert('Login Required', 'Please login to add items to your wishlist.');
      router.push('/auth');
      return;
    }

    if (!comboPack) return;
    
    try {
      if (wishlisted) {
        await removeComboFromWishlist(comboPack._id);
        Alert.alert('Success', 'Removed from wishlist');
      } else {
        const success = await addComboToWishlist(comboPack._id);
        if (success) {
          Alert.alert('Success', 'Added to wishlist');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update wishlist');
      console.error('Wishlist error:', error);
    }
  };

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      Alert.alert('Login Required', 'Please login to add items to cart.');
      router.push('/auth');
      return;
    }

    if (!comboPack) return;

    // Check stock
    if (comboPack.stock <= 0) {
      Alert.alert('Out of Stock', 'This combo pack is currently out of stock.');
      return;
    }
    
    try {
      console.log('🛒 Adding combo pack to cart:', { comboPackId: comboPack._id, quantity });
      const success = await addComboToCart(comboPack._id, quantity);
      if (success) {
        Alert.alert('Success', `Added ${quantity} ${comboPack.name} to cart`);
      } else {
        Alert.alert('Error', 'Failed to add combo pack to cart - please try again');
      }
    } catch (error) {
      console.error('❌ Combo cart error:', error);
      Alert.alert('Error', 'Failed to add combo pack to cart - please check your connection');
    }
  };

  const handleBuyNow = async () => {
    if (!isAuthenticated) {
      Alert.alert('Login Required', 'Please login to make a purchase.');
      return;
    }

    if (!comboPack) return;

    if (comboPack.stock <= 0) {
      Alert.alert('Out of Stock', 'This combo pack is currently out of stock.');
      return;
    }

    // Add to cart first, then redirect to checkout
    await handleAddToCart();
    // TODO: Navigate to checkout
    // router.push('/checkout');
  };

  const submitReview = async () => {
    if (!isAuthenticated) {
      Alert.alert('Login Required', 'Please login to submit a review.');
      return;
    }

    if (myRating === 0 || !myComment.trim()) {
      Alert.alert('Invalid Review', 'Please provide both rating and comment.');
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

  const nextImage = () => {
    setSelectedImageIndex((prev) => (prev + 1) % allImages.length);
  };

  const prevImage = () => {
    setSelectedImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
  };

  const renderStars = (rating: number, interactive = false, onStarClick?: (star: number) => void) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => interactive && onStarClick && onStarClick(star)}
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

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.WHITE} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY} />
          <Text style={styles.loadingText}>Loading combo pack details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !comboPack) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.WHITE} />
        <View style={styles.errorContainer}>
          <Ionicons name="cube-outline" size={64} color={COLORS.GRAY} />
          <Text style={styles.errorTitle}>Combo Pack Not Found</Text>
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
        <Text style={styles.headerTitle}>Combo Pack Details</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Image Gallery */}
        <View style={styles.imageSection}>
          <View style={styles.mainImageContainer}>
            {allImages.length > 0 ? (
              <>
                <TouchableOpacity
                  onPress={() => setShowImageModal(true)}
                  style={styles.mainImageTouchable}
                >
                  <Image
                    source={{ uri: allImages[selectedImageIndex]?.url }}
                    style={styles.mainImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
                
                {/* Navigation Arrows */}
                {allImages.length > 1 && (
                  <>
                    <TouchableOpacity
                      style={[styles.imageNavButton, styles.imageNavLeft]}
                      onPress={prevImage}
                    >
                      <Ionicons name="chevron-back" size={20} color={COLORS.TEXT_PRIMARY} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.imageNavButton, styles.imageNavRight]}
                      onPress={nextImage}
                    >
                      <Ionicons name="chevron-forward" size={20} color={COLORS.TEXT_PRIMARY} />
                    </TouchableOpacity>
                  </>
                )}

                {/* Image Source Badge */}
                <View style={styles.imageBadge}>
                  <Text style={styles.imageBadgeText}>
                    {allImages[selectedImageIndex]?.source === 'combo' 
                      ? 'Combo Pack' 
                      : allImages[selectedImageIndex]?.productName
                    }
                  </Text>
                </View>
              </>
            ) : (
              <View style={styles.placeholderImage}>
                <Ionicons name="image-outline" size={64} color={COLORS.GRAY} />
                <Text style={styles.placeholderText}>No Image Available</Text>
              </View>
            )}
          </View>

          {/* Thumbnail Gallery */}
          {allImages.length > 1 && (
            <ScrollView 
              horizontal 
              style={styles.thumbnailContainer}
              showsHorizontalScrollIndicator={false}
            >
              {allImages.map((image, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => setSelectedImageIndex(index)}
                  style={[
                    styles.thumbnail,
                    selectedImageIndex === index && styles.thumbnailSelected
                  ]}
                >
                  <Image
                    source={{ uri: image.url }}
                    style={styles.thumbnailImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Product Info */}
        <View style={styles.productInfo}>
          {/* Badge */}
          {comboPack.badgeText && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{comboPack.badgeText}</Text>
            </View>
          )}
          
          {/* Title and Wishlist */}
          <View style={styles.productHeader}>
            <Text style={styles.productName}>{comboPack.name}</Text>
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
          
          {/* Description */}
          <Text style={styles.productDescription}>{comboPack.description}</Text>

          {/* Rating */}
          <View style={styles.ratingContainer}>
            {renderStars(comboPack.averageRating || 0)}
            <Text style={styles.ratingText}>
              ({comboPack.totalReviews || 0} reviews)
            </Text>
          </View>

          {/* Pricing */}
          <View style={styles.pricingCard}>
            <View style={styles.priceRow}>
              <Text style={styles.currentPrice}>
                ₹{comboPack.comboPrice.toLocaleString()}
              </Text>
              {comboPack.originalTotalPrice > comboPack.comboPrice && (
                <Text style={styles.originalPrice}>
                  ₹{comboPack.originalTotalPrice.toLocaleString()}
                </Text>
              )}
            </View>
            
            {comboPack.discountPercentage > 0 && (
              <View style={styles.discountRow}>
                <View style={styles.discountBadge}>
                  <Text style={styles.discountText}>
                    {comboPack.discountPercentage}% OFF
                  </Text>
                </View>
                <Text style={styles.savingsText}>
                  Save ₹{comboPack.discountAmount.toLocaleString()}
                </Text>
              </View>
            )}

            {/* Stock Status */}
            <View style={styles.stockContainer}>
              <Ionicons 
                name={comboPack.stock > 0 ? "checkmark-circle" : "close-circle"} 
                size={16} 
                color={comboPack.stock > 0 ? COLORS.SUCCESS : COLORS.ERROR} 
              />
              <Text style={[
                styles.stockText,
                { color: comboPack.stock > 0 ? COLORS.SUCCESS : COLORS.ERROR }
              ]}>
                {comboPack.stock > 0 
                  ? `${comboPack.stock} units available` 
                  : 'Out of stock'
                }
              </Text>
            </View>

            {/* Quantity Selector */}
            <View style={styles.quantityContainer}>
              <Text style={styles.quantityLabel}>Quantity:</Text>
              <View style={styles.quantitySelector}>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  <Ionicons name="remove" size={16} color={COLORS.TEXT_PRIMARY} />
                </TouchableOpacity>
                <Text style={styles.quantityText}>{quantity}</Text>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => setQuantity(Math.min(comboPack.stock, quantity + 1))}
                  disabled={quantity >= comboPack.stock}
                >
                  <Ionicons name="add" size={16} color={COLORS.TEXT_PRIMARY} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[
                  styles.addToCartButton,
                  comboPack.stock <= 0 && styles.disabledButton
                ]}
                onPress={handleAddToCart}
                disabled={comboPack.stock <= 0}
              >
                <Ionicons name="cart" size={20} color={COLORS.WHITE} />
                <Text style={styles.addToCartText}>Add to Cart</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.buyNowButton,
                  comboPack.stock <= 0 && styles.disabledButton
                ]}
                onPress={handleBuyNow}
                disabled={comboPack.stock <= 0}
              >
                <Text style={styles.buyNowText}>Buy Now</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Features */}
          <View style={styles.featuresCard}>
            <Text style={styles.featuresTitle}>Why Choose This Combo?</Text>
            <View style={styles.featuresList}>
              <View style={styles.featureItem}>
                <Ionicons name="pricetag" size={20} color={COLORS.SUCCESS} />
                <Text style={styles.featureText}>Best value combo deal</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="car" size={20} color={COLORS.PRIMARY} />
                <Text style={styles.featureText}>Free delivery on orders above ₹500</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="shield-checkmark" size={20} color={COLORS.WARNING} />
                <Text style={styles.featureText}>Quality guaranteed products</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Included Products Section */}
        <View style={styles.includedProductsSection}>
          <Text style={styles.sectionTitle}>What's Included in This Combo</Text>
          <View style={styles.productsGrid}>
            {comboPack.products?.map((productItem, index) => (
              <View key={index} style={styles.includedProductCard}>
                <View style={styles.productImagePlaceholder}>
                  <Ionicons name="cube-outline" size={32} color={COLORS.GRAY} />
                </View>
                
                <View style={styles.productDetails}>
                  <Text style={styles.productTitle}>{productItem.productName}</Text>
                  
                  <Text style={styles.variantText}>
                    {productItem.variantName && `Variant: ${productItem.variantName} | `}Quantity: {productItem.quantity}
                  </Text>
                  
                  <View style={styles.productFooter}>
                    <Text style={styles.productPrice}>
                      ₹{(productItem.originalPrice || 0).toLocaleString()}
                    </Text>
                    <View style={styles.quantityBadge}>
                      <Text style={styles.quantityBadgeText}>
                        Qty: {productItem.quantity}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Reviews Section */}
        <View style={styles.reviewsSection}>
          <Text style={styles.sectionTitle}>
            Customer Reviews ({comboPack.totalReviews || 0})
          </Text>

          {/* Add Review */}
          {isAuthenticated && (
            <View style={styles.addReviewCard}>
              <Text style={styles.addReviewTitle}>Write a Review</Text>
              
              <View style={styles.ratingInput}>
                <Text style={styles.ratingLabel}>Your Rating</Text>
                {renderStars(
                  hoverRating || myRating,
                  true,
                  setMyRating
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
                  placeholder="Share your experience with this combo pack..."
                  placeholderTextColor={COLORS.GRAY}
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.submitReviewButton,
                  (submitting || myRating === 0 || !myComment.trim()) && styles.disabledButton
                ]}
                onPress={submitReview}
                disabled={submitting || myRating === 0 || !myComment.trim()}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={COLORS.WHITE} />
                ) : (
                  <Text style={styles.submitReviewText}>Submit Review</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Reviews List */}
          <View style={styles.reviewsList}>
            {reviews.length > 0 ? (
              reviews.map((review, index) => (
                <View key={review._id || index} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewerInfo}>
                      <View style={styles.reviewerAvatar}>
                        <Text style={styles.reviewerInitial}>
                          {review.user?.charAt(0).toUpperCase() || 'U'}
                        </Text>
                      </View>
                      <View>
                        <Text style={styles.reviewerName}>
                          {review.user || 'Anonymous User'}
                        </Text>
                        {review.verified && (
                          <View style={styles.verifiedBadge}>
                            <Text style={styles.verifiedText}>Verified Purchase</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <Text style={styles.reviewDate}>
                      {new Date(review.date).toLocaleDateString()}
                    </Text>
                  </View>
                  
                  <View style={styles.reviewRating}>
                    {renderStars(review.rating)}
                  </View>
                  
                  <Text style={styles.reviewComment}>{review.comment}</Text>
                </View>
              ))
            ) : (
              <View style={styles.noReviewsContainer}>
                <Ionicons name="star-outline" size={48} color={COLORS.GRAY} />
                <Text style={styles.noReviewsText}>
                  No reviews yet. Be the first to review this combo pack!
                </Text>
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
              <Ionicons name="close" size={24} color={COLORS.WHITE} />
            </TouchableOpacity>
            
            {allImages.length > 0 && (
              <>
                <Image
                  source={{ uri: allImages[selectedImageIndex]?.url }}
                  style={styles.modalImage}
                  resizeMode="contain"
                />
                
                {/* Navigation */}
                {allImages.length > 1 && (
                  <>
                    <TouchableOpacity
                      style={[styles.modalNavButton, styles.modalNavLeft]}
                      onPress={prevImage}
                    >
                      <Ionicons name="chevron-back" size={24} color={COLORS.WHITE} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalNavButton, styles.modalNavRight]}
                      onPress={nextImage}
                    >
                      <Ionicons name="chevron-forward" size={24} color={COLORS.WHITE} />
                    </TouchableOpacity>
                  </>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>
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
  imageSection: {
    backgroundColor: COLORS.WHITE,
    paddingTop: 16,
  },
  mainImageContainer: {
    height: 300,
    marginHorizontal: 16,
    borderRadius: 12,
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
  imageNavButton: {
    position: 'absolute',
    top: '50%',
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageNavLeft: {
    left: 8,
  },
  imageNavRight: {
    right: 8,
  },
  imageBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  imageBadgeText: {
    color: COLORS.WHITE,
    fontSize: 12,
    fontWeight: '500',
  },
  placeholderImage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND,
  },
  placeholderText: {
    marginTop: 8,
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
  },
  thumbnailContainer: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
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
    backgroundColor: COLORS.WHITE,
    marginTop: 8,
    padding: 16,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 12,
  },
  badgeText: {
    color: COLORS.WHITE,
    fontSize: 12,
    fontWeight: '600',
  },
  productName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 8,
  },
  productDescription: {
    fontSize: 16,
    color: COLORS.TEXT_SECONDARY,
    lineHeight: 24,
    marginBottom: 16,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  starsContainer: {
    flexDirection: 'row',
    marginRight: 8,
  },
  starButton: {
    marginRight: 2,
  },
  ratingText: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
  },
  pricingCard: {
    backgroundColor: COLORS.BACKGROUND,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  currentPrice: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginRight: 12,
  },
  originalPrice: {
    fontSize: 20,
    color: COLORS.TEXT_SECONDARY,
    textDecorationLine: 'line-through',
  },
  discountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  discountBadge: {
    backgroundColor: COLORS.SUCCESS,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 8,
  },
  discountText: {
    color: COLORS.WHITE,
    fontSize: 12,
    fontWeight: '600',
  },
  savingsText: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
  },
  stockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  stockText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
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
  quantityText: {
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.TEXT_PRIMARY,
    minWidth: 40,
    textAlign: 'center',
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
  addToCartText: {
    color: COLORS.WHITE,
    fontSize: 16,
    fontWeight: '600',
  },
  buyNowButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.SUCCESS,
    paddingVertical: 14,
    borderRadius: 12,
  },
  buyNowText: {
    color: COLORS.WHITE,
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: COLORS.GRAY,
    opacity: 0.6,
  },
  featuresCard: {
    backgroundColor: COLORS.BACKGROUND,
    padding: 16,
    borderRadius: 12,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 12,
  },
  featuresList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    flex: 1,
  },
  includedProductsSection: {
    backgroundColor: COLORS.WHITE,
    marginTop: 8,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 16,
  },
  productsGrid: {
    gap: 12,
  },
  includedProductCard: {
    backgroundColor: COLORS.BACKGROUND,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 12,
  },
  productImagePlaceholder: {
    width: 80,
    height: 80,
    backgroundColor: COLORS.WHITE,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productDetails: {
    flex: 1,
  },
  productTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 4,
  },
  variantText: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: 8,
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
  },
  quantityBadge: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  quantityBadgeText: {
    color: COLORS.WHITE,
    fontSize: 12,
    fontWeight: '600',
  },
  reviewsSection: {
    backgroundColor: COLORS.WHITE,
    marginTop: 8,
    padding: 16,
  },
  addReviewCard: {
    backgroundColor: COLORS.BACKGROUND,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
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
  submitReviewButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitReviewText: {
    color: COLORS.WHITE,
    fontSize: 16,
    fontWeight: '600',
  },
  reviewsList: {
    gap: 16,
  },
  reviewCard: {
    backgroundColor: COLORS.BACKGROUND,
    padding: 16,
    borderRadius: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
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
    backgroundColor: COLORS.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  reviewerInitial: {
    color: COLORS.WHITE,
    fontSize: 16,
    fontWeight: '600',
  },
  reviewerName: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.TEXT_PRIMARY,
  },
  verifiedBadge: {
    backgroundColor: COLORS.SUCCESS,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
  },
  verifiedText: {
    color: COLORS.WHITE,
    fontSize: 10,
    fontWeight: '500',
  },
  reviewDate: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
  },
  reviewRating: {
    marginBottom: 8,
  },
  reviewComment: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    lineHeight: 20,
  },
  noReviewsContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noReviewsText: {
    fontSize: 16,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginTop: 16,
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
  modalImage: {
    width: screenWidth * 0.9,
    height: screenWidth * 0.9,
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
    left: 20,
  },
  modalNavRight: {
    right: 20,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
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
});
