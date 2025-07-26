import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Link } from 'expo-router';
import { COLORS } from '../../constants';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import type { CartItem } from '../../services/apiService';

export default function CartScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { state, loadCart, updateCartItem, removeFromCart } = useApp();
  
  const [updatingItems, setUpdatingItems] = useState(new Set());

  useEffect(() => {
    if (isAuthenticated) {
      loadCart();
    }
  }, [isAuthenticated]);

  const handleQuantityChange = async (item: CartItem, newQuantity: number) => {
    const itemKey = item.variantId ? `${item.id}-${item.variantId}` : item.id;
    const variantId = item.variantId || item.selectedVariant?.id;
  
    if (updatingItems.has(itemKey) || newQuantity < 1) return;

    setUpdatingItems(prev => new Set(prev).add(itemKey));
    try {
      await updateCartItem(item.id, newQuantity, variantId);
    } catch (error) {
      console.error('Error updating quantity:', error);
      Alert.alert('Error', 'Failed to update quantity');
    } finally {
      setUpdatingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemKey);
        return newSet;
      });
    }
  };

  const handleRemoveItem = (item: CartItem) => {
    console.log('Removing item:', item);
    const itemKey = item.variantId ? `${item.id}-${item.variantId}` : item.id;
    if (updatingItems.has(itemKey)) return;

    Alert.alert(
      'Remove Item',
      'Are you sure you want to remove this item from your cart?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setUpdatingItems(prev => new Set(prev).add(itemKey));
            try {
              await removeFromCart(item.id, item.variantId);
            } catch (error) {
              console.error('Error removing item:', error);
              Alert.alert('Error', 'Failed to remove item');
            } finally {
              setUpdatingItems(prev => {
                const newSet = new Set(prev);
                newSet.delete(itemKey);
                return newSet;
              });
            }
          },
        },
      ]
    );
  };
  // console.log('Cart items:', state.cartItems);
  // console.log('Cart state:', state);
  const subtotal = state.cartItems.reduce((total, item) => total + (item.price * item.qty), 0);
  const deliveryCharge = subtotal > 500 || subtotal === 0 ? 0 : 100;
  const total = subtotal + deliveryCharge;

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="cart-outline" size={80} color={COLORS.GRAY} />
          <Text style={styles.emptyTitle}>Your Cart is Empty</Text>
          <Text style={styles.emptySubtitle}>Login to see your cart items or add new ones!</Text>
          <TouchableOpacity style={styles.shopNowButton} onPress={() => router.push('/auth')}>
            <Text style={styles.shopNowText}>Login Now</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (state.loading.cart) {
    return (
      <View style={[styles.container, styles.centerContainer]}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContentContainer}>
        <View style={styles.header}>
          <Link href="/(tabs)" asChild>
            <TouchableOpacity style={styles.continueShopping}>
              <Ionicons name="arrow-back" size={24} color={COLORS.TEXT_SECONDARY} />
              <Text style={styles.continueShoppingText}>Continue Shopping</Text>
            </TouchableOpacity>
          </Link>
          <View style={styles.headerTitleContainer}>
            <Ionicons name="cart-outline" size={32} color={COLORS.PRIMARY} />
            <Text style={styles.headerTitle}>Your Cart</Text>
          </View>
          <Text style={styles.headerSubtitle}>
            {state.cartItems.length > 0 ? `${state.cartItems.length} items in your cart` : 'Your shopping cart is empty'}
          </Text>
        </View>

        {state.errors.cart && (
          <View style={styles.errorContainer}>
            <Ionicons name="warning-outline" size={24} color={COLORS.ERROR} />
            <Text style={styles.errorText}>{state.errors.cart}</Text>
            <TouchableOpacity onPress={loadCart}>
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {state.cartItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <TouchableOpacity style={styles.shopNowButton} onPress={() => router.push('/(tabs)')}>
              <Text style={styles.shopNowText}>Shop Now</Text>
              <Ionicons name="arrow-forward" size={20} color={COLORS.WHITE} />
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.cartItemsContainer}>
              {state.cartItems.map((item) => {
                const itemKey = item.variantId ? `${item.id}-${item.variantId}` : item.id;
                const isUpdating = updatingItems.has(itemKey);
                const maxQuantity = item.stock ?? 99;
                const imageUri = item.images?.[0] || item.variant?.images?.[0] || 'https://via.placeholder.com/150';

                return (
                  <View key={item._id} style={styles.cartItem}>
                    <Link href={`/product/${item.id}`} asChild>
                      <TouchableOpacity style={styles.itemLeft}>
                        <Image source={{ uri: imageUri }} style={styles.productImage} />
                        <View style={styles.productInfo}>
                          <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
                          {item.variant?.name && <Text style={styles.variantName}>{item.variant.name}</Text>}
                          <Text style={styles.productPrice}>₹{item.price.toLocaleString()}</Text>
                        </View>
                      </TouchableOpacity>
                    </Link>

                    <View style={styles.itemRight}>
                      <Text style={styles.totalItemPrice}>₹{(item.price * item.qty).toLocaleString()}</Text>
                      <View style={styles.quantityControls}>
                        <TouchableOpacity
                          onPress={() => handleQuantityChange(item, item.qty - 1)}
                          disabled={isUpdating || item.qty <= 1}
                          style={styles.quantityButton}
                        >
                          {isUpdating ? <ActivityIndicator size="small" color={COLORS.PRIMARY} /> : <Ionicons name="remove" size={18} color={item.qty <= 1 ? COLORS.GRAY : COLORS.PRIMARY} />}
                        </TouchableOpacity>
                        <Text style={styles.quantityText}>{item.qty}</Text>
                        <TouchableOpacity
                          onPress={() => handleQuantityChange(item, item.qty + 1)}
                          disabled={isUpdating || item.qty >= maxQuantity}
                          style={styles.quantityButton}
                        >
                          {isUpdating ? <ActivityIndicator size="small" color={COLORS.PRIMARY} /> : <Ionicons name="add" size={18} color={item.qty >= maxQuantity ? COLORS.GRAY : COLORS.PRIMARY} />}
                        </TouchableOpacity>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleRemoveItem(item)}
                        disabled={isUpdating}
                        style={styles.removeButton}
                      >
                        {isUpdating ? <ActivityIndicator size="small" color={COLORS.ERROR} /> : <Ionicons name="trash-outline" size={20} color={COLORS.ERROR} />}
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>

            <View style={styles.summaryContainer}>
              <Text style={styles.summaryTitle}>Order Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>₹{subtotal.toLocaleString()}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Delivery</Text>
                <Text style={styles.summaryValue}>{deliveryCharge === 0 ? <Text style={styles.freeDelivery}>Free</Text> : `₹${deliveryCharge}`}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>₹{total.toLocaleString()}</Text>
              </View>
              <TouchableOpacity style={styles.checkoutButton} onPress={() => router.push('/checkout')}>
                <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
                <Ionicons name="arrow-forward" size={20} color={COLORS.WHITE} />
              </TouchableOpacity>
              {deliveryCharge > 0 && <Text style={styles.deliveryInfo}>Free delivery on orders above ₹500</Text>}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8faf8',
  },
  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 24,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  continueShopping: {
    position: 'absolute',
    top: 10,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  continueShoppingText: {
    marginLeft: 8,
    fontSize: 16,
    color: COLORS.TEXT_SECONDARY,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 40,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
  },
  headerSubtitle: {
    marginTop: 8,
    fontSize: 16,
    color: COLORS.TEXT_SECONDARY,
  },
  errorContainer: {
    backgroundColor: '#ffcccb',
    padding: 16,
    marginHorizontal: 20,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  errorText: {
    flex: 1,
    color: COLORS.ERROR,
  },
  retryText: {
    color: COLORS.ERROR,
    fontWeight: 'bold',
  },
  cartItemsContainer: {
    paddingHorizontal: 16,
  },
  cartItem: {
    backgroundColor: COLORS.WHITE,
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    // iOS Shadow
    shadowColor: '#e8eae8',
    shadowOffset: { width: 8, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    // Android Shadow
    elevation: 4,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 2,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: '#f8faf8',
  },
  productInfo: {
    marginLeft: 12,
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  variantName: {
    fontSize: 12,
    color: COLORS.PRIMARY,
    marginTop: 2,
  },
  productPrice: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 4,
  },
  itemRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  totalItemPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
    marginBottom: 8,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8faf8',
    borderRadius: 12,
    padding: 4,
  },
  quantityButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    minWidth: 30,
    textAlign: 'center',
  },
  removeButton: {
    marginTop: 8,
    padding: 4,
  },
  summaryContainer: {
    backgroundColor: COLORS.WHITE,
    marginHorizontal: 16,
    borderRadius: 24,
    padding: 24,
    marginTop: 16,
    // iOS Shadow
    shadowColor: '#e8eae8',
    shadowOffset: { width: 8, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    // Android Shadow
    elevation: 4,
  },
  summaryTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 16,
    color: COLORS.TEXT_SECONDARY,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.TEXT_PRIMARY,
  },
  freeDelivery: {
    color: COLORS.SUCCESS,
    fontWeight: 'bold',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 12,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
  },
  checkoutButton: {
    marginTop: 16,
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  checkoutButtonText: {
    color: COLORS.WHITE,
    fontSize: 18,
    fontWeight: 'bold',
  },
  deliveryInfo: {
    textAlign: 'center',
    marginTop: 16,
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    marginTop: 60,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 8,
    textAlign: 'center',
  },
  shopNowButton: {
    marginTop: 24,
    paddingHorizontal: 32,
    paddingVertical: 14,
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  shopNowText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.WHITE,
  },
});
