import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface OrderSuccessModalProps {
  visible: boolean;
  onClose: () => void;
  orderDetails: {
    orderId: string;
    totalAmount: number;
    discountAmount?: number;
    deliveryAddress?: {
      name: string;
      address: string;
      city: string;
      state: string;
      pincode: string;
      phone: string;
    };
    estimatedDelivery?: string;
    paymentMethod?: string;
    items?: Array<{
      name: string;
      quantity: number;
      price: number;
    }>;
  };
}

const OrderSuccessModal: React.FC<OrderSuccessModalProps> = ({
  visible,
  onClose,
  orderDetails
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const checkmarkAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Reset animations
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.8);
      slideAnim.setValue(50);
      checkmarkAnim.setValue(0);

      // Start animations sequence
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Animate checkmark after modal is shown
        Animated.spring(checkmarkAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }).start();
      });
    }
  }, [visible]);

  const closeModal = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={closeModal}
    >
      <Animated.View 
        style={[
          styles.overlay,
          {
            opacity: fadeAnim,
          }
        ]}
      >
        <Animated.View 
          style={[
            styles.modalContainer,
            {
              transform: [
                { scale: scaleAnim },
                { translateY: slideAnim }
              ]
            }
          ]}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Success Icon */}
            <View style={styles.iconContainer}>
              <Animated.View 
                style={[
                  styles.checkmarkContainer,
                  {
                    transform: [{ scale: checkmarkAnim }]
                  }
                ]}
              >
                <Ionicons name="checkmark-circle" size={80} color={COLORS.SUCCESS} />
              </Animated.View>
            </View>

            {/* Success Message */}
            <Text style={styles.successTitle}>Order Placed Successfully!</Text>
            <Text style={styles.successSubtitle}>
              Thank you for your purchase. Your order has been confirmed.
            </Text>

            {/* Order Details */}
            <View style={styles.orderDetailsContainer}>
              <View style={styles.orderIdContainer}>
                <Text style={styles.orderIdLabel}>Order ID</Text>
                <Text style={styles.orderIdValue}>#{orderDetails.orderId}</Text>
              </View>

              {/* Amount Details */}
              <View style={styles.amountContainer}>
                <View style={styles.amountRow}>
                  <Text style={styles.amountLabel}>Total Amount</Text>
                  <Text style={styles.amountValue}>₹{orderDetails.totalAmount}</Text>
                </View>
                {orderDetails.discountAmount && orderDetails.discountAmount > 0 && (
                  <View style={styles.amountRow}>
                    <Text style={styles.discountLabel}>Coins Discount</Text>
                    <Text style={styles.discountValue}>-₹{orderDetails.discountAmount}</Text>
                  </View>
                )}
                <View style={styles.divider} />
                <View style={styles.amountRow}>
                  <Text style={styles.finalAmountLabel}>Final Amount</Text>
                  <Text style={styles.finalAmountValue}>
                    ₹{orderDetails.totalAmount - (orderDetails.discountAmount || 0)}
                  </Text>
                </View>
              </View>

              {/* Delivery Address */}
              {orderDetails.deliveryAddress && (
                <View style={styles.addressContainer}>
                  <Text style={styles.sectionTitle}>Delivery Address</Text>
                  <View style={styles.addressContent}>
                    <Text style={styles.addressName}>{orderDetails.deliveryAddress.name}</Text>
                    <Text style={styles.addressText}>
                      {orderDetails.deliveryAddress.address}, {orderDetails.deliveryAddress.city}
                    </Text>
                    <Text style={styles.addressText}>
                      {orderDetails.deliveryAddress.state} - {orderDetails.deliveryAddress.pincode}
                    </Text>
                    <Text style={styles.addressPhone}>📞 {orderDetails.deliveryAddress.phone}</Text>
                  </View>
                </View>
              )}

              {/* Estimated Delivery */}
              {orderDetails.estimatedDelivery && (
                <View style={styles.deliveryContainer}>
                  <Text style={styles.sectionTitle}>Estimated Delivery</Text>
                  <Text style={styles.deliveryDate}>{orderDetails.estimatedDelivery}</Text>
                </View>
              )}

              {/* Payment Method */}
              {orderDetails.paymentMethod && (
                <View style={styles.paymentContainer}>
                  <Text style={styles.sectionTitle}>Payment Method</Text>
                  <Text style={styles.paymentMethod}>{orderDetails.paymentMethod}</Text>
                </View>
              )}
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={styles.trackButton}
                onPress={() => {
                  closeModal();
                  // Navigate to order tracking
                }}
              >
                <Ionicons name="location-outline" size={20} color={COLORS.WHITE} />
                <Text style={styles.trackButtonText}>Track Order</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.continueButton}
                onPress={closeModal}
              >
                <Text style={styles.continueButtonText}>Continue Shopping</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: COLORS.WHITE,
    borderRadius: 20,
    padding: 24,
    margin: 20,
    maxHeight: SCREEN_HEIGHT * 0.85,
    maxWidth: SCREEN_WIDTH * 0.9,
    width: '100%',
    elevation: 10,
    shadowColor: COLORS.BLACK,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  checkmarkContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    textAlign: 'center',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 16,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  orderDetailsContainer: {
    backgroundColor: COLORS.BACKGROUND,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  orderIdContainer: {
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  orderIdLabel: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: 4,
  },
  orderIdValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
  },
  amountContainer: {
    marginBottom: 20,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  amountLabel: {
    fontSize: 16,
    color: COLORS.TEXT_PRIMARY,
  },
  amountValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  discountLabel: {
    fontSize: 16,
    color: COLORS.SUCCESS,
  },
  discountValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.SUCCESS,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.BORDER,
    marginVertical: 12,
  },
  finalAmountLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
  },
  finalAmountValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
  },
  addressContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 12,
  },
  addressContent: {
    backgroundColor: COLORS.WHITE,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  addressName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 6,
  },
  addressText: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: 4,
    lineHeight: 20,
  },
  addressPhone: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 8,
  },
  deliveryContainer: {
    marginBottom: 20,
  },
  deliveryDate: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.PRIMARY,
    backgroundColor: COLORS.WHITE,
    borderRadius: 8,
    padding: 12,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  paymentContainer: {
    marginBottom: 20,
  },
  paymentMethod: {
    fontSize: 16,
    color: COLORS.TEXT_PRIMARY,
    backgroundColor: COLORS.WHITE,
    borderRadius: 8,
    padding: 12,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  buttonContainer: {
    gap: 12,
  },
  trackButton: {
    backgroundColor: COLORS.PRIMARY,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    elevation: 2,
    shadowColor: COLORS.PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  trackButtonText: {
    color: COLORS.WHITE,
    fontSize: 16,
    fontWeight: '600',
  },
  continueButton: {
    backgroundColor: COLORS.WHITE,
    borderWidth: 2,
    borderColor: COLORS.PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  continueButtonText: {
    color: COLORS.PRIMARY,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default OrderSuccessModal;
