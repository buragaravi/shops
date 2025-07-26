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
  FlatList,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { RootState, AppDispatch } from '../../store';
import { fetchComboPackById } from '../../store/slices/comboPackSlice';
import { COLORS, APP_CONSTANTS } from '../../constants';

const { width: screenWidth } = Dimensions.get('window');

const ComboDetailScreen: React.FC = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const dispatch = useDispatch<AppDispatch>();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const { currentComboPack, loading } = useSelector(
    (state: RootState) => state.comboPacks
  );

  useEffect(() => {
    if (id) {
      dispatch(fetchComboPackById(id));
    }
  }, [id, dispatch]);

  const handleAddToCart = () => {
    if (!currentComboPack) return;
    
    // Add combo pack to cart logic here
    Alert.alert('Added to Cart', `${currentComboPack.name} has been added to your cart.`);
  };

  const handleBuyNow = () => {
    if (!currentComboPack) return;
    
    handleAddToCart();
    // Navigate to cart or checkout
    router.push('/cart' as any);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading combo pack...</Text>
      </View>
    );
  }

  if (!currentComboPack) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Combo pack not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const discountPercentage = currentComboPack.originalPrice && currentComboPack.discountedPrice 
    ? Math.round(
        ((currentComboPack.originalPrice - currentComboPack.discountedPrice) / currentComboPack.originalPrice) * 100
      )
    : 0;

  const renderProduct = ({ item }: { item: any }) => (
    <View style={styles.productItem}>
      <Image
        source={{ 
          uri: item?.product?.images?.[0]?.url || item?.product?.image || APP_CONSTANTS.IMAGE_PLACEHOLDER 
        }}
        style={styles.productImage}
        resizeMode="cover"
      />
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>
          {item?.product?.name || item?.productName || 'Product Name'}
        </Text>
        <Text style={styles.productPrice}>
          {APP_CONSTANTS.CURRENCY}{item?.product?.price || item?.originalPrice || 0}
        </Text>
        <Text style={styles.productQuantity}>
          Qty: {item?.quantity || 1}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Combo Pack Details</Text>
        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="heart-outline" size={24} color={COLORS.TEXT_PRIMARY} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Image Gallery */}
        <View style={styles.imageContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(event) => {
              const index = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
              setSelectedImageIndex(index);
            }}
          >
            {currentComboPack.images && Array.isArray(currentComboPack.images) 
              ? currentComboPack.images.map((image: string, index: number) => (
                  <Image
                    key={index}
                    source={{ uri: image || APP_CONSTANTS.IMAGE_PLACEHOLDER }}
                    style={styles.comboImage}
                    resizeMode="cover"
                  />
                ))
              : (
                  <Image
                    source={{ 
                      uri: currentComboPack.mainImage || APP_CONSTANTS.IMAGE_PLACEHOLDER 
                    }}
                    style={styles.comboImage}
                    resizeMode="cover"
                  />
                )
            }
          </ScrollView>
          
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

          {/* Offer Badge */}
          {currentComboPack.offer && (
            <View style={styles.offerBadge}>
              <Text style={styles.offerText}>{currentComboPack.offer}</Text>
            </View>
          )}

          {/* Image Indicators */}
          {currentComboPack.images && Array.isArray(currentComboPack.images) && currentComboPack.images.length > 1 && (
            <View style={styles.imageIndicators}>
              {currentComboPack.images.map((_: string, index: number) => (
                <View
                  key={index}
                  style={[
                    styles.indicator,
                    index === selectedImageIndex && styles.activeIndicator,
                  ]}
                />
              ))}
            </View>
          )}
        </View>

        {/* Combo Pack Info */}
        <View style={styles.comboInfo}>
          <Text style={styles.comboName}>{currentComboPack.name || 'Combo Pack'}</Text>
          {currentComboPack.description && (
            <Text style={styles.comboDescription}>{currentComboPack.description}</Text>
          )}
          
          <View style={styles.priceContainer}>
            <Text style={styles.currentPrice}>
              {APP_CONSTANTS.CURRENCY}{currentComboPack.discountedPrice || currentComboPack.comboPrice || 0}
            </Text>
            {currentComboPack.originalPrice && (
              <Text style={styles.originalPrice}>
                {APP_CONSTANTS.CURRENCY}{currentComboPack.originalPrice}
              </Text>
            )}
          </View>

          {currentComboPack.originalPrice && currentComboPack.discountedPrice && 
           currentComboPack.originalPrice > currentComboPack.discountedPrice && (
            <Text style={styles.savingsText}>
              You save {APP_CONSTANTS.CURRENCY}{currentComboPack.originalPrice - currentComboPack.discountedPrice}!
            </Text>
          )}

          {/* Products in Combo */}
          <Text style={styles.sectionTitle}>Products in this combo:</Text>
          
          {currentComboPack.products && Array.isArray(currentComboPack.products) && (
            <FlatList
              data={currentComboPack.products}
              renderItem={renderProduct}
              keyExtractor={(item, index) => `product-${index}`}
              scrollEnabled={false}
              style={styles.productsList}
            />
          )}

          {/* Stock Info */}
          {currentComboPack.stock !== undefined && currentComboPack.stock <= 5 && currentComboPack.stock > 0 && (
            <Text style={styles.stockWarning}>
              Only {currentComboPack.stock} combo packs left!
            </Text>
          )}

          {currentComboPack.stock !== undefined && currentComboPack.stock === 0 && (
            <Text style={styles.outOfStock}>Out of Stock</Text>
          )}
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.addToCartButton]}
          onPress={handleAddToCart}
          disabled={currentComboPack.stock === 0}
        >
          <Ionicons name="bag-add" size={20} color={COLORS.WHITE} />
          <Text style={styles.actionButtonText}>Add to Cart</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.buyNowButton]}
          onPress={handleBuyNow}
          disabled={currentComboPack.stock === 0}
        >
          <Text style={styles.actionButtonText}>Buy Now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.WHITE,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: COLORS.WHITE,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
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
  },
  comboImage: {
    width: screenWidth,
    height: 300,
  },
  comboBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  comboBadgeText: {
    color: COLORS.WHITE,
    fontSize: 14,
    fontWeight: 'bold',
  },
  discountBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: COLORS.ERROR,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  discountText: {
    color: COLORS.WHITE,
    fontSize: 12,
    fontWeight: 'bold',
  },
  offerBadge: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    backgroundColor: COLORS.WARNING,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  offerText: {
    color: COLORS.WHITE,
    fontSize: 12,
    fontWeight: 'bold',
  },
  imageIndicators: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.WHITE,
    opacity: 0.5,
    marginHorizontal: 4,
  },
  activeIndicator: {
    opacity: 1,
  },
  comboInfo: {
    padding: 16,
  },
  comboName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 8,
  },
  comboDescription: {
    fontSize: 16,
    color: COLORS.TEXT_SECONDARY,
    lineHeight: 24,
    marginBottom: 16,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  currentPrice: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
    marginRight: 16,
  },
  originalPrice: {
    fontSize: 18,
    color: COLORS.GRAY,
    textDecorationLine: 'line-through',
  },
  savingsText: {
    fontSize: 16,
    color: COLORS.SUCCESS,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 12,
  },
  productsList: {
    marginBottom: 20,
  },
  productItem: {
    flexDirection: 'row',
    backgroundColor: COLORS.GRAY_LIGHT,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 6,
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 14,
    color: COLORS.PRIMARY,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  productQuantity: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
  },
  stockWarning: {
    fontSize: 14,
    color: COLORS.WARNING,
    fontWeight: '600',
    marginBottom: 8,
  },
  outOfStock: {
    fontSize: 14,
    color: COLORS.ERROR,
    fontWeight: '600',
    marginBottom: 8,
  },
  bottomActions: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: COLORS.WHITE,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  addToCartButton: {
    backgroundColor: COLORS.SECONDARY,
  },
  buyNowButton: {
    backgroundColor: COLORS.PRIMARY,
  },
  actionButtonText: {
    color: COLORS.WHITE,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.TEXT_SECONDARY,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND,
  },
  errorText: {
    fontSize: 18,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonText: {
    color: COLORS.WHITE,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ComboDetailScreen;
