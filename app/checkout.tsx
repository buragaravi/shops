import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS } from '../constants';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import ApiService from '../services/apiService';
import CoinRedemptionWidget from '../components/CoinRedemptionWidget';
import OrderSuccessModal from '../components/OrderSuccessModal';
import type { CartItem, Address, Order } from '../services/apiService';

// A simple progress indicator component
const CheckoutStepper = ({ currentStep }: { currentStep: number }) => {
  const steps = ['Cart', 'Address', 'Payment', 'Summary'];
  return (
    <View style={styles.stepperContainer}>
      {steps.map((step, index) => (
        <React.Fragment key={index}>
          <View style={styles.step}>
            <View
              style={[
                styles.stepCircle,
                index + 1 === currentStep && styles.stepCircleActive,
                index + 1 < currentStep && styles.stepCircleCompleted,
              ]}
            >
              {index + 1 < currentStep ? (
                <Ionicons name="checkmark" size={16} color={COLORS.WHITE} />
              ) : (
                <Text
                  style={[
                    styles.stepNumber,
                    index + 1 === currentStep && styles.stepNumberActive,
                  ]}
                >
                  {index + 1}
                </Text>
              )}
            </View>
            <Text
              style={[
                styles.stepLabel,
                index + 1 === currentStep && styles.stepLabelActive,
              ]}
            >
              {step}
            </Text>
          </View>
          {index < steps.length - 1 && <View style={styles.stepConnector} />}
        </React.Fragment>
      ))}
    </View>
  );
};

export default function CheckoutScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { state, loadCart, updateCartItem, removeFromCart, placeOrder, clearCart } = useApp();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [updatingItems, setUpdatingItems] = useState(new Set());
  
  // Address state
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressLoading, setAddressLoading] = useState(false);
  const [newAddress, setNewAddress] = useState({
    name: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    isDefault: false,
  });

  // Payment state
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [orderProcessing, setOrderProcessing] = useState(false);
  const [orderResult, setOrderResult] = useState<Order | null>(null);

  // Coupon and Discount state
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [coinDiscount, setCoinDiscount] = useState<any>(null);
  const [discount, setDiscount] = useState(0);
  const [userCoins, setUserCoins] = useState(0);
  const [coinsToRedeem, setCoinsToRedeem] = useState('');
  const [coinLoading, setCoinLoading] = useState(false);

  // Success Modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/auth');
      return;
    }
    fetchCheckoutData();
  }, [isAuthenticated]);

  const fetchCheckoutData = async () => {
    setLoading(true);
    try {
      await loadCart();
      const addressRes = await ApiService.getAddresses();
      if (addressRes.success && addressRes.data) {
        setAddresses(addressRes.data.addresses);
        const defaultAddress = addressRes.data.addresses.find(a => a.isDefault);
        if (defaultAddress) {
          setSelectedAddress(defaultAddress);
        }
      }
      
      // Fetch user wallet balance for coin redemption
      try {
        const walletRes = await ApiService.getWalletBalance();
        if (walletRes.success && walletRes.data) {
          setUserCoins(walletRes.data.wallet.balance || 0);
        }
      } catch (error) {
        console.log('Could not fetch wallet balance:', error);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load checkout data.');
    } finally {
      setLoading(false);
    }
  };

  const subtotal = useMemo(() => state.cartItems.reduce((total, item) => total + (item.price * item.qty), 0), [state.cartItems]);
  const deliveryCharge = subtotal > 500 || subtotal === 0 ? 0 : 100;
  
  // Calculate discount from coupon
  const couponDiscount = useMemo(() => {
    if (!appliedCoupon) return 0;
    
    if (appliedCoupon.type === 'percent') {
      return (subtotal * appliedCoupon.amount) / 100;
    } else {
      return appliedCoupon.amount;
    }
  }, [appliedCoupon, subtotal]);
  
  // Calculate coin discount amount
  const coinDiscountAmount = coinDiscount ? coinDiscount.discountAmount : 0;
  
  // Calculate total
  const total = subtotal - couponDiscount - coinDiscountAmount + deliveryCharge;

  const handleQuantityChange = async (item: CartItem, newQuantity: number) => {
    const itemKey = item.variantId ? `${item.id}-${item.variantId}` : item.id;
    if (updatingItems.has(itemKey) || newQuantity < 1) return;
    
    setUpdatingItems(prev => new Set(prev).add(itemKey));
    try {
      await updateCartItem(item.id, newQuantity, item.variantId);
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

  const handleAddAddress = async () => {
    setAddressLoading(true);
    try {
      const response = await ApiService.addAddress(newAddress);
      if (response.success && response.data) {
        setAddresses(response.data.addresses);
        setSelectedAddress(response.data.newAddress);
        setShowAddressForm(false);
        setNewAddress({ name: '', phone: '', address: '', city: '', state: '', pincode: '', isDefault: false });
      } else {
        Alert.alert('Error', response.error || 'Failed to add address.');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred.');
    } finally {
      setAddressLoading(false);
    }
  };

  // Coupon functions
  const applyCoupon = async () => {
    if (!couponCode.trim()) {
      Alert.alert('Error', 'Please enter a coupon code');
      return;
    }
    
    if (subtotal <= 0) {
      Alert.alert('Error', 'Add items to cart before applying coupon');
      return;
    }
    
    setCouponLoading(true);
    try {
      const response = await ApiService.validateCoupon(couponCode.trim().toUpperCase(), subtotal);
      if (response.success && response.data) {
        setAppliedCoupon(response.data.coupon);
        setCouponCode('');
        Alert.alert('Success', `Coupon applied successfully! You saved ₹${response.data.discount || 0}`);
      } else {
        Alert.alert('Error', response.error || 'Invalid coupon code');
      }
    } catch (error) {
      console.error('Coupon application error:', error);
      Alert.alert('Error', 'Failed to apply coupon. Please check your connection and try again.');
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    Alert.alert(
      'Remove Coupon',
      'Are you sure you want to remove this coupon?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setAppliedCoupon(null);
            setCouponCode('');
          }
        }
      ]
    );
  };

  // Coin redemption functions
  const applyCoinDiscount = async () => {
    const coinsToUse = parseInt(coinsToRedeem);
    if (!coinsToUse || coinsToUse <= 0) {
      Alert.alert('Error', 'Please enter valid number of coins');
      return;
    }
    
    if (coinsToUse > userCoins) {
      Alert.alert('Error', `You don't have enough coins. Available: ${userCoins}`);
      return;
    }

    if (subtotal <= 0) {
      Alert.alert('Error', 'Add items to cart before redeeming coins');
      return;
    }

    setCoinLoading(true);
    try {
      const response = await ApiService.redeemCoins(coinsToUse);
      if (response.success && response.data) {
        setCoinDiscount({
          coinsUsed: coinsToUse,
          discountAmount: response.data.discount
        });
        setCoinsToRedeem('');
        Alert.alert(
          'Success', 
          `₹${response.data.discount} discount applied using ${coinsToUse} coins!`
        );
      } else {
        Alert.alert('Error', response.error || 'Failed to apply coin discount');
      }
    } catch (error) {
      console.error('Coin redemption error:', error);
      Alert.alert('Error', 'Failed to apply coin discount. Please check your connection and try again.');
    } finally {
      setCoinLoading(false);
    }
  };

  const removeCoinDiscount = () => {
    Alert.alert(
      'Remove Coin Discount',
      'Are you sure you want to remove coin discount?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setCoinDiscount(null);
            setCoinsToRedeem('');
          }
        }
      ]
    );
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      Alert.alert('Address Required', 'Please select a delivery address.');
      return;
    }
    if (state.cartItems.length === 0) {
      Alert.alert('Empty Cart', 'Your cart is empty.');
      return;
    }

    // Validation for payment method
    if (paymentMethod === 'online') {
      Alert.alert('Payment Method', 'Online payment is currently under development. Please select Cash on Delivery.');
      setPaymentMethod('cod');
      return;
    }

    setOrderProcessing(true);
    
    try {
      const orderData = {
        items: state.cartItems.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          qty: item.qty || 1,
          image: (item as any).type === 'combo' 
            ? ((item as any).mainImage || (item as any).products?.[0]?.images?.[0]?.url || item.images?.[0] || '/placeholder.png')
            : (item.images?.[0] || '/placeholder.png'),
          // Item type information
          type: (item as any).type || 'product', // 'product' or 'combo'
          itemType: (item as any).type || 'product', // For Order model compatibility
          // Variant information (for products)
          hasVariant: !!item.selectedVariant,
          variantId: item.selectedVariant?.id || null,
          variantName: item.selectedVariant?.label || item.selectedVariant?.name || null,
          variantPrice: item.selectedVariant?.price || null,
          // Combo pack information
          ...((item as any).type === 'combo' && {
            originalTotalPrice: (item as any).originalTotalPrice,
            discountAmount: (item as any).discountAmount,
            discountPercentage: (item as any).discountPercentage,
            comboProducts: (item as any).products || []
          }),
          isDirect: (item as any).isDirect || false
        })),
        totalAmount: total,
        shipping: {
          name: selectedAddress.name,
          address: selectedAddress.address,
          phone: selectedAddress.phone,
          city: selectedAddress.city,
          state: selectedAddress.state,
          pincode: selectedAddress.pincode
        },
        paymentMethod: paymentMethod.toUpperCase(), // COD or UPI
        paymentStatus: paymentMethod === 'cod' ? 'pending' : 'paid',
        coupon: appliedCoupon?._id || null, // Send coupon ID if applied
        coinDiscount: coinDiscount, // Include coin discount data
        subtotal: subtotal, // Include subtotal for backend calculations
        upiTransactionId: paymentMethod === 'upi' ? null : null // No UTR for mobile app yet
      };

      console.log('[CHECKOUT] Order Data being sent:', orderData);
      console.log('[CHECKOUT] Coin discount data:', coinDiscount);

      console.log('Order Data:', orderData); // Debug log

      console.log('Order payload:', JSON.stringify(orderData, null, 2));

      const result = await placeOrder(orderData);
      if (result) {
        setOrderResult(result);
        await clearCart();
        
        // Reset coupon and coin discount states
        setAppliedCoupon(null);
        setCoinDiscount(null);
        setCouponCode('');
        setCoinsToRedeem('');
        
        // Show success modal instead of step 4
        setShowSuccessModal(true);
      } else {
        Alert.alert('Order Failed', state.errors.orders || 'Could not place your order. Please try again.');
      }
    } catch (error) {
      console.error("Order placement error:", error);
      Alert.alert(
        'Order Error', 
        'An unexpected error occurred while placing your order. Please check your connection and try again.'
      );
    } finally {
      setOrderProcessing(false);
    }
  };

  const nextStep = () => setCurrentStep(prev => prev + 1);
  const prevStep = () => setCurrentStep(prev => prev - 1);

  const renderStepContent = () => {
    switch (currentStep) {
      case 1: return renderReviewStep();
      case 2: return renderAddressStep();
      case 3: return renderPaymentStep();
      case 4: return renderConfirmationStep();
      default: return null;
    }
  };

  const renderReviewStep = () => (
    <ScrollView>
      {state.cartItems.map(item => {
        const itemKey = item.variantId ? `${item.id}-${item.variantId}` : item.id;
        const isUpdating = updatingItems.has(itemKey);
        return (
        <View key={item._id} style={styles.cartItem}>
          <Image source={{ uri: item.images?.[0] || 'https://via.placeholder.com/100' }} style={styles.productImage} />
          <View style={styles.productInfo}>
            <Text style={styles.productName}>{item.name}</Text>
            {item.variant?.name && <Text style={styles.variantName}>{item.variant.name}</Text>}
            {(item as any).type === 'combo' && (
              <Text style={styles.comboText}>Combo Pack</Text>
            )}
            <Text style={styles.productPrice}>₹{item.price.toLocaleString()}</Text>
            {(item as any).type === 'combo' && (item as any).originalTotalPrice && (
              <Text style={styles.originalPrice}>
                Original: ₹{(item as any).originalTotalPrice.toLocaleString()}
              </Text>
            )}
          </View>
          <View style={styles.quantityControls}>
            <TouchableOpacity onPress={() => handleQuantityChange(item, item.qty - 1)} disabled={isUpdating}>
              <Ionicons name="remove-circle-outline" size={24} color={COLORS.PRIMARY} />
            </TouchableOpacity>
            <Text style={styles.quantityText}>{item.qty}</Text>
            <TouchableOpacity onPress={() => handleQuantityChange(item, item.qty + 1)} disabled={isUpdating}>
              <Ionicons name="add-circle-outline" size={24} color={COLORS.PRIMARY} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => handleRemoveItem(item)} disabled={isUpdating}>
            <Ionicons name="trash-outline" size={24} color={COLORS.ERROR} />
          </TouchableOpacity>
        </View>
      )})}
      <View style={styles.summaryContainer}>
        <Text style={styles.summaryTitle}>Order Summary</Text>
        <View style={styles.summaryRow}>
          <Text>Subtotal</Text>
          <Text>₹{subtotal.toLocaleString()}</Text>
        </View>
        {couponDiscount > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.discountText}>Coupon Discount</Text>
            <Text style={styles.discountText}>-₹{couponDiscount.toLocaleString()}</Text>
          </View>
        )}
        {coinDiscountAmount > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.discountText}>Coin Discount</Text>
            <Text style={styles.discountText}>-₹{coinDiscountAmount.toLocaleString()}</Text>
          </View>
        )}
        <View style={styles.summaryRow}>
          <Text>Delivery</Text>
          <Text>{deliveryCharge === 0 ? 'Free' : `₹${deliveryCharge}`}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>₹{total.toLocaleString()}</Text>
        </View>
      </View>

      {/* Coupon Section */}
      <View style={styles.couponContainer}>
        <Text style={styles.sectionTitle}>Apply Coupon</Text>
        {appliedCoupon ? (
          <View style={styles.appliedCouponContainer}>
            <View style={styles.appliedCouponInfo}>
              <Ionicons name="pricetag" size={16} color={COLORS.SUCCESS} />
              <Text style={styles.appliedCouponText}>{appliedCoupon.code}</Text>
              <Text style={styles.appliedCouponDiscount}>
                -₹{couponDiscount.toLocaleString()}
              </Text>
            </View>
            <TouchableOpacity onPress={removeCoupon}>
              <Ionicons name="close-circle" size={24} color={COLORS.ERROR} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.couponInputContainer}>
            <TextInput
              style={styles.couponInput}
              placeholder="Enter coupon code"
              value={couponCode}
              onChangeText={setCouponCode}
              autoCapitalize="characters"
            />
            <TouchableOpacity 
              style={[styles.applyCouponButton, couponLoading && styles.disabledButton]} 
              onPress={applyCoupon}
              disabled={couponLoading}
            >
              {couponLoading ? (
                <ActivityIndicator size="small" color={COLORS.WHITE} />
              ) : (
                <Text style={styles.applyCouponText}>Apply</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Enhanced Coin Redemption Section */}
      {userCoins > 0 && (
        <CoinRedemptionWidget
          orderValue={subtotal}
          onDiscountApply={(discountData) => {
            if (discountData) {
              setCoinDiscount({
                coinsUsed: discountData.coinsUsed,
                discountAmount: discountData.discountAmount
              });
              setCoinsToRedeem(discountData.coinsUsed.toString());
            } else {
              setCoinDiscount(null);
              setCoinsToRedeem('');
            }
          }}
          appliedCoinDiscount={coinDiscount ? {
            coinsUsed: coinDiscount.coinsUsed,
            discountAmount: coinDiscount.discountAmount,
            type: 'coins' as const
          } : null}
        />
      )}
    </ScrollView>
  );

  const renderAddressStep = () => (
    <ScrollView>
      <Text style={styles.sectionTitle}>Select Delivery Address</Text>
      {addresses.map((addr: Address, index: number) => (
        <TouchableOpacity 
          key={addr._id || `address-${index}`}
          style={[styles.addressItem, selectedAddress?._id === addr._id && styles.addressItemSelected]} 
          onPress={() => setSelectedAddress(addr)}
        >
          <Ionicons name={selectedAddress?._id === addr._id ? "radio-button-on" : "radio-button-off"} size={24} color={COLORS.PRIMARY} />
          <View style={{ marginLeft: 10, flex: 1 }}>
            <Text style={styles.addressName}>{addr.name}</Text>
            <Text>{addr.address}, {addr.city}, {addr.state} - {addr.pincode}</Text>
            <Text>Phone: {addr.phone}</Text>
          </View>
        </TouchableOpacity>
      ))}
      <TouchableOpacity style={styles.addButton} onPress={() => setShowAddressForm(!showAddressForm)}>
        <Text style={styles.addButtonText}>{showAddressForm ? 'Cancel' : 'Add New Address'}</Text>
      </TouchableOpacity>
      {showAddressForm && (
        <View style={styles.addressForm}>
          <TextInput placeholder="Full Name" value={newAddress.name} onChangeText={t => setNewAddress(p => ({...p, name: t}))} style={styles.input} />
          <TextInput placeholder="Phone Number" value={newAddress.phone} onChangeText={t => setNewAddress(p => ({...p, phone: t}))} style={styles.input} keyboardType="phone-pad" />
          <TextInput placeholder="Address" value={newAddress.address} onChangeText={t => setNewAddress(p => ({...p, address: t}))} style={styles.input} />
          <TextInput placeholder="City" value={newAddress.city} onChangeText={t => setNewAddress(p => ({...p, city: t}))} style={styles.input} />
          <TextInput placeholder="State" value={newAddress.state} onChangeText={t => setNewAddress(p => ({...p, state: t}))} style={styles.input} />
          <TextInput placeholder="Pincode" value={newAddress.pincode} onChangeText={t => setNewAddress(p => ({...p, pincode: t}))} style={styles.input} keyboardType="number-pad" />
          <TouchableOpacity style={styles.saveButton} onPress={handleAddAddress} disabled={addressLoading}>
            {addressLoading ? <ActivityIndicator color={COLORS.WHITE} /> : <Text style={styles.saveButtonText}>Save Address</Text>}
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );

  const renderPaymentStep = () => (
    <View>
      <Text style={styles.sectionTitle}>Choose Payment Method</Text>
      <TouchableOpacity style={styles.paymentOption} onPress={() => setPaymentMethod('cod')}>
        <Ionicons name={paymentMethod === 'cod' ? "radio-button-on" : "radio-button-off"} size={24} color={COLORS.PRIMARY} />
        <Text style={styles.paymentLabel}>Cash on Delivery (COD)</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.paymentOption} onPress={() => setPaymentMethod('online')}>
        <Ionicons name={paymentMethod === 'online' ? "radio-button-on" : "radio-button-off"} size={24} color={COLORS.PRIMARY} />
        <Text style={styles.paymentLabel}>Online Payment (UPI / Cards)</Text>
      </TouchableOpacity>
      {paymentMethod === 'online' && (
        <View style={styles.onlinePaymentInfo}>
          <Text>Online payment is currently under development. Please select Cash on Delivery.</Text>
        </View>
      )}
    </View>
  );

  const renderConfirmationStep = () => (
    <ScrollView style={styles.confirmationContainer}>
      <View style={styles.confirmationContent}>
        <Ionicons name="checkmark-circle" size={80} color="green" />
        <Text style={styles.confirmationTitle}>Order Placed Successfully!</Text>
        <Text style={styles.confirmationText}>Your order ID is #{orderResult?._id.slice(-6)}.</Text>
        
        {/* Order Summary in Confirmation */}
        <View style={styles.confirmationSummary}>
          <Text style={styles.confirmationSummaryTitle}>Order Summary</Text>
          <View style={styles.summaryRow}>
            <Text>Subtotal</Text>
            <Text>₹{subtotal.toLocaleString()}</Text>
          </View>
          {couponDiscount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.discountText}>Coupon Discount ({appliedCoupon?.code})</Text>
              <Text style={styles.discountText}>-₹{couponDiscount.toLocaleString()}</Text>
            </View>
          )}
          {coinDiscountAmount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.discountText}>Coin Discount ({coinDiscount?.coinsUsed} coins)</Text>
              <Text style={styles.discountText}>-₹{coinDiscountAmount.toLocaleString()}</Text>
            </View>
          )}
          <View style={styles.summaryRow}>
            <Text>Delivery</Text>
            <Text>{deliveryCharge === 0 ? 'Free' : `₹${deliveryCharge}`}</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total Paid</Text>
            <Text style={styles.totalValue}>₹{total.toLocaleString()}</Text>
          </View>
        </View>

        <Text style={styles.confirmationText}>Thank you for shopping with us.</Text>
        <Text style={styles.confirmationText}>You will receive order updates via SMS and email.</Text>
        
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.primaryButtonText}>Continue Shopping</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.secondaryButton} 
          onPress={() => router.push('/orders')}
        >
          <Text style={styles.secondaryButtonText}>View Orders</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => currentStep === 1 ? router.back() : prevStep()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={{ width: 24 }} />
      </View>
      
      <CheckoutStepper currentStep={currentStep} />

      <View style={styles.content}>
        {renderStepContent()}
      </View>

      {currentStep < 4 && (
        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.primaryButton, (currentStep === 2 && !selectedAddress) && styles.disabledButton]} 
            onPress={currentStep === 3 ? handlePlaceOrder : nextStep}
            disabled={(currentStep === 2 && !selectedAddress) || orderProcessing}
          >
            {orderProcessing ? (
              <ActivityIndicator color={COLORS.WHITE} />
            ) : (
              <Text style={styles.primaryButtonText}>
                {currentStep === 1 && 'Proceed to Address'}
                {currentStep === 2 && 'Proceed to Payment'}
                {currentStep === 3 && 'Place Order'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Success Modal */}
      <OrderSuccessModal
        visible={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          router.replace('/(tabs)');
        }}
        orderDetails={{
          orderId: orderResult?._id?.slice(-6) || '',
          totalAmount: total,
          discountAmount: coinDiscountAmount + couponDiscount,
          deliveryAddress: selectedAddress || undefined,
          estimatedDelivery: '3-5 business days',
          paymentMethod: paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment',
          items: state.cartItems.map(item => ({
            name: item.name || 'Unknown',
            quantity: item.qty,
            price: item.price || 0
          }))
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.BACKGROUND },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, backgroundColor: COLORS.WHITE, borderBottomWidth: 1, borderBottomColor: COLORS.BORDER },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.TEXT_PRIMARY },
  stepperContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', padding: 15, backgroundColor: COLORS.WHITE },
  step: { alignItems: 'center' },
  stepCircle: { width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.GRAY_LIGHT, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.BORDER },
  stepCircleActive: { backgroundColor: COLORS.PRIMARY, borderColor: COLORS.PRIMARY },
  stepCircleCompleted: { backgroundColor: 'green', borderColor: 'green' },
  stepNumber: { color: COLORS.TEXT_SECONDARY },
  stepNumberActive: { color: COLORS.WHITE },
  stepLabel: { marginTop: 5, fontSize: 12, color: COLORS.TEXT_SECONDARY },
  stepLabelActive: { color: COLORS.PRIMARY, fontWeight: 'bold' },
  stepConnector: { flex: 1, height: 2, backgroundColor: COLORS.BORDER, marginHorizontal: 5 },
  content: { flex: 1, padding: 15 },
  footer: { padding: 15, backgroundColor: COLORS.WHITE, borderTopWidth: 1, borderTopColor: COLORS.BORDER },
  primaryButton: { backgroundColor: COLORS.PRIMARY, padding: 15, borderRadius: 10, alignItems: 'center' },
  primaryButtonText: { color: COLORS.WHITE, fontSize: 16, fontWeight: 'bold' },
  disabledButton: { backgroundColor: COLORS.GRAY },
  cartItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.WHITE, padding: 10, borderRadius: 10, marginBottom: 10 },
  productImage: { width: 60, height: 60, borderRadius: 5 },
  productInfo: { flex: 1, marginLeft: 10 },
  productName: { fontSize: 16, fontWeight: 'bold' },
  variantName: { fontSize: 12, color: COLORS.TEXT_SECONDARY },
  comboText: { fontSize: 12, color: COLORS.PRIMARY, fontWeight: '500' },
  productPrice: { fontSize: 14, color: COLORS.PRIMARY, marginTop: 5 },
  originalPrice: { fontSize: 12, color: COLORS.TEXT_SECONDARY, textDecorationLine: 'line-through' },
  quantityControls: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 10 },
  quantityText: { marginHorizontal: 10, fontSize: 16 },
  summaryContainer: { backgroundColor: COLORS.WHITE, padding: 15, borderRadius: 10, marginTop: 10 },
  summaryTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  totalLabel: { fontWeight: 'bold', fontSize: 16 },
  totalValue: { fontWeight: 'bold', fontSize: 16, color: COLORS.PRIMARY },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  addressItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.WHITE, padding: 15, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: COLORS.BORDER },
  addressItemSelected: { borderColor: COLORS.PRIMARY, borderWidth: 2 },
  addressName: { fontWeight: 'bold' },
  addButton: { padding: 15, alignItems: 'center' },
  addButtonText: { color: COLORS.PRIMARY, fontWeight: 'bold' },
  addressForm: { backgroundColor: COLORS.WHITE, padding: 15, borderRadius: 10, marginTop: 10 },
  input: { borderWidth: 1, borderColor: COLORS.BORDER, padding: 10, borderRadius: 5, marginBottom: 10 },
  saveButton: { backgroundColor: COLORS.PRIMARY, padding: 15, borderRadius: 10, alignItems: 'center' },
  saveButtonText: { color: COLORS.WHITE, fontWeight: 'bold' },
  paymentOption: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.WHITE, padding: 15, borderRadius: 10, marginBottom: 10 },
  paymentLabel: { marginLeft: 10, fontSize: 16 },
  onlinePaymentInfo: { padding: 15, backgroundColor: '#fffbe6', borderRadius: 10, marginTop: 10 },
  confirmationContainer: { flex: 1, padding: 20 },
  confirmationContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  confirmationTitle: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginTop: 20, marginBottom: 10 },
  confirmationText: { fontSize: 16, color: COLORS.TEXT_SECONDARY, textAlign: 'center', marginBottom: 5 },
  confirmationSummary: { backgroundColor: COLORS.WHITE, padding: 15, borderRadius: 10, marginVertical: 20, width: '100%' },
  confirmationSummaryTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  totalRow: { borderTopWidth: 1, borderTopColor: COLORS.BORDER, paddingTop: 5, marginTop: 5 },
  secondaryButton: { backgroundColor: 'transparent', borderWidth: 1, borderColor: COLORS.PRIMARY, padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  secondaryButtonText: { color: COLORS.PRIMARY, fontSize: 16, fontWeight: 'bold' },
  
  // Coupon and Discount styles
  discountText: { color: COLORS.SUCCESS, fontWeight: '500' },
  couponContainer: { backgroundColor: COLORS.WHITE, padding: 15, borderRadius: 10, marginTop: 10 },
  appliedCouponContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.SUCCESS + '10', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: COLORS.SUCCESS },
  appliedCouponInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  appliedCouponText: { marginLeft: 8, fontSize: 14, fontWeight: '500', color: COLORS.SUCCESS },
  appliedCouponDiscount: { marginLeft: 'auto', fontSize: 14, fontWeight: 'bold', color: COLORS.SUCCESS },
  couponInputContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  couponInput: { flex: 1, borderWidth: 1, borderColor: COLORS.BORDER, padding: 10, borderRadius: 5 },
  applyCouponButton: { backgroundColor: COLORS.PRIMARY, paddingHorizontal: 15, paddingVertical: 10, borderRadius: 5 },
  applyCouponText: { color: COLORS.WHITE, fontWeight: 'bold' },
  coinContainer: { backgroundColor: COLORS.WHITE, padding: 15, borderRadius: 10, marginTop: 10 },
  coinBalanceText: { fontSize: 12, color: COLORS.TEXT_SECONDARY, marginBottom: 10 },
});
