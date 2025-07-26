import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, APP_CONSTANTS } from '../constants';
import type { Product, ProductVariant } from '../services/apiService';

interface VariantPopupProps {
  isVisible: boolean;
  onClose: () => void;
  product: Product | null;
  onAddToCart: (productId: string, quantity: number, selectedVariant: ProductVariant) => Promise<void | boolean>;
  onBuyNow: (productId: string, quantity: number, selectedVariant: ProductVariant) => Promise<void | boolean>;
  actionType: 'cart' | 'buy';
}

const VariantPopup: React.FC<VariantPopupProps> = ({
  isVisible,
  onClose,
  product,
  onAddToCart,
  onBuyNow,
  actionType,
}) => {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);

  const availableVariants = product?.hasVariants && product.variants 
    ? product.variants.filter(variant => variant.stock > 0)
    : [];

  const getDefaultVariant = (): ProductVariant | null => {
    if (!availableVariants.length) return null;
    const defaultVariant = availableVariants.find(v => v.isDefault);
    if (defaultVariant) return defaultVariant;
    return availableVariants.reduce((cheapest, current) => 
      current.price < cheapest.price ? current : cheapest
    );
  };

  useEffect(() => {
    if (isVisible && availableVariants.length > 0) {
      const defaultVariant = getDefaultVariant();
      setSelectedVariant(defaultVariant);
      setQuantity(1);
    } else if (!isVisible) {
      setSelectedVariant(null);
      setQuantity(1);
      setLoading(false);
    }
  }, [isVisible, product]);

  const handleAction = async () => {
    if (!selectedVariant || !product) {
      Alert.alert('Error', 'Please select a variant.');
      return;
    }
    if (quantity > selectedVariant.stock) {
      Alert.alert('Error', `Only ${selectedVariant.stock} items are in stock.`);
      return;
    }

    setLoading(true);
    try {
      if (actionType === 'cart') {
        await onAddToCart(product._id, quantity, selectedVariant);
      } else {
        await onBuyNow(product._id, quantity, selectedVariant);
      }
      onClose();
    } catch (error) {
      console.error('Action failed:', error);
      Alert.alert('Error', 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuantityChange = (delta: number) => {
    if (!selectedVariant) return;
    const newQuantity = quantity + delta;
    if (newQuantity >= 1 && newQuantity <= selectedVariant.stock) {
      setQuantity(newQuantity);
    }
  };

  if (!product?.hasVariants || !availableVariants.length) {
    return null;
  }

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
        <SafeAreaView style={styles.modalContent}>
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Select Variant</Text>
              <Text style={styles.headerSubtitle}>{product.name}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={COLORS.TEXT_SECONDARY} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.contentContainer}>
              <View style={styles.imageContainer}>
                <Image 
                  source={{ uri: product.images?.[0] || APP_CONSTANTS.IMAGE_PLACEHOLDER }} 
                  style={styles.productImage}
                />
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Choose Size/Option</Text>
                {availableVariants.map((variant) => {
                  const isSelected = selectedVariant?._id === variant._id;
                  const hasDiscount = variant.originalPrice && variant.originalPrice > variant.price;
                  const discountPercent = hasDiscount && variant.originalPrice
                    ? Math.round(((variant.originalPrice - variant.price) / variant.originalPrice) * 100)
                    : 0;

                  return (
                    <TouchableOpacity
                      key={variant._id}
                      onPress={() => setSelectedVariant(variant)}
                      style={[styles.variantItem, isSelected && styles.variantItemSelected]}
                    >
                      <View style={[styles.selectionIndicator, isSelected && styles.selectionIndicatorSelected]}>
                        {isSelected && <Ionicons name="checkmark" size={12} color={COLORS.WHITE} />}
                      </View>
                      <View style={styles.variantInfo}>
                        <View style={styles.variantNameContainer}>
                          <Text style={[styles.variantName, isSelected && styles.variantNameSelected]}>
                            {variant.label || variant.name}
                          </Text>
                          {hasDiscount && (
                            <View style={styles.discountBadge}>
                              <Text style={styles.discountText}>{discountPercent}% OFF</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.variantStock}>
                          {variant.stock} in stock
                        </Text>
                      </View>
                      <View style={styles.priceContainer}>
                        <Text style={styles.variantPrice}>{APP_CONSTANTS.CURRENCY}{variant.price.toLocaleString()}</Text>
                        {hasDiscount && variant.originalPrice && (
                          <Text style={styles.variantOriginalPrice}>
                            {APP_CONSTANTS.CURRENCY}{variant.originalPrice.toLocaleString()}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {selectedVariant && (
                <>
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Quantity</Text>
                    <View style={styles.quantityRow}>
                      <Text style={styles.quantityLabel}>Select Quantity:</Text>
                      <View style={styles.quantitySelector}>
                        <TouchableOpacity
                          onPress={() => handleQuantityChange(-1)}
                          disabled={quantity <= 1}
                          style={styles.quantityButton}
                        >
                          <Ionicons name="remove" size={20} color={quantity <= 1 ? COLORS.GRAY : COLORS.PRIMARY} />
                        </TouchableOpacity>
                        <Text style={styles.quantityText}>{quantity}</Text>
                        <TouchableOpacity
                          onPress={() => handleQuantityChange(1)}
                          disabled={quantity >= selectedVariant.stock}
                          style={styles.quantityButton}
                        >
                          <Ionicons name="add" size={20} color={quantity >= selectedVariant.stock ? COLORS.GRAY : COLORS.PRIMARY} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  <View style={styles.totalContainer}>
                    <Text style={styles.totalLabel}>Total Price:</Text>
                    <View>
                      <Text style={styles.totalPrice}>
                        {APP_CONSTANTS.CURRENCY}{(selectedVariant.price * quantity).toLocaleString()}
                      </Text>
                      {selectedVariant.originalPrice && selectedVariant.originalPrice > selectedVariant.price && (
                        <Text style={styles.totalOriginalPrice}>
                          {APP_CONSTANTS.CURRENCY}{(selectedVariant.originalPrice * quantity).toLocaleString()}
                        </Text>
                      )}
                    </View>
                  </View>
                </>
              )}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelButtonFooter} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleAction}
              disabled={!selectedVariant || loading}
              style={[
                styles.actionButton,
                actionType === 'buy' && styles.buyNowButton,
                (!selectedVariant || loading) && styles.disabledButton,
              ]}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.WHITE} />
              ) : (
                <>
                  <Ionicons name={actionType === 'cart' ? 'cart-outline' : 'flash-outline'} size={20} color={COLORS.WHITE} />
                  <Text style={styles.actionButtonText}>
                    {actionType === 'cart' ? 'Add to Cart' : 'Buy Now'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.BACKGROUND,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 4,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: COLORS.GRAY_LIGHT,
  },
  contentContainer: {
    padding: 20,
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  productImage: {
    width: 120,
    height: 120,
    borderRadius: 20,
    backgroundColor: COLORS.WHITE,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 12,
  },
  variantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.BORDER,
    marginBottom: 10,
    backgroundColor: COLORS.WHITE,
  },
  variantItemSelected: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: `${COLORS.PRIMARY}10`,
  },
  selectionIndicator: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: COLORS.BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: COLORS.WHITE,
  },
  selectionIndicatorSelected: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: COLORS.PRIMARY,
  },
  variantInfo: {
    flex: 1,
  },
  variantNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  variantName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  variantNameSelected: {
    color: COLORS.PRIMARY,
  },
  discountBadge: {
    backgroundColor: COLORS.ERROR,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  discountText: {
    color: COLORS.WHITE,
    fontSize: 10,
    fontWeight: 'bold',
  },
  variantStock: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  variantPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
  },
  variantOriginalPrice: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
    textDecorationLine: 'line-through',
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.WHITE,
    borderRadius: 16,
    padding: 8,
  },
  quantityLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.TEXT_PRIMARY,
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.GRAY_LIGHT,
    borderRadius: 12,
  },
  quantityButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    minWidth: 40,
    textAlign: 'center',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    backgroundColor: `${COLORS.PRIMARY}1A`,
    borderWidth: 1,
    borderColor: `${COLORS.PRIMARY}33`,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  totalPrice: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
    textAlign: 'right',
  },
  totalOriginalPrice: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    textDecorationLine: 'line-through',
    textAlign: 'right',
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
    backgroundColor: COLORS.WHITE,
  },
  cancelButtonFooter: {
    flex: 0.8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.BORDER,
    marginRight: 10,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.TEXT_SECONDARY,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 16,
    backgroundColor: COLORS.PRIMARY,
  },
  buyNowButton: {
    backgroundColor: COLORS.WARNING,
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

export default VariantPopup;
