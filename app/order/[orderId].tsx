import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Dimensions,
  StatusBar,
  Modal,
  Clipboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { COLORS, API_BASE_URL } from '../../constants';
import { useAuth } from '../../contexts/AuthContext';
import ApiService from '../../services/apiService';
import TokenStorage from '../../utils/tokenStorage';
import DeliverySlotSelector from '../../components/DeliverySlotSelector';
import DeliveryRatingModal from '../../components/DeliveryRatingModal';
import ReturnOrderModal from '../../components/ReturnOrderModal';
import type { Order } from '../../services/apiService';

const { width } = Dimensions.get('window');

interface StatusStep {
  key: string;
  label: string;
  icon: string;
  completed: boolean;
  active: boolean;
}

const OrderDetailScreen: React.FC = () => {
  const router = useRouter();
  const { orderId } = useLocalSearchParams();
  const { isAuthenticated } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeliverySlotModalOpen, setIsDeliverySlotModalOpen] = useState(false);
  const [deliverySlotLoading, setDeliverySlotLoading] = useState(false);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [orderReturns, setOrderReturns] = useState<any[]>([]);
  const [returnLoading, setReturnLoading] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/auth');
      return;
    }
    if (orderId) {
      fetchOrderDetail();
      fetchOrderReturns();
    }
  }, [isAuthenticated, orderId]);

  const fetchOrderDetail = async () => {
    try {
      setError(null);
      setLoading(true);
      const response = await ApiService.getOrderById(orderId as string);
      if (response.success && response.data) {
        // The API returns { order: Order } structure
        setOrder(response.data.order);
      } else {
        setError(response.error || 'Failed to fetch order details');
      }
    } catch (error) {
      console.error('Error fetching order detail:', error);
      setError('Error fetching order details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderReturns = async () => {
    setReturnLoading(true);
    try {
      const token = await TokenStorage.getToken();
      const response = await fetch(`${API_BASE_URL}/api/returns/my-returns`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Filter returns for this specific order
        const orderSpecificReturns = data.data?.returns?.filter(
          (returnItem: any) => returnItem.orderId._id === orderId
        ) || [];
        setOrderReturns(orderSpecificReturns);
      }
    } catch (error) {
      console.error('Error fetching order returns:', error);
    } finally {
      setReturnLoading(false);
    }
  };

  const handleDeliverySlotUpdate = async (selectedDate: string, selectedTimeSlot: string) => {
    setDeliverySlotLoading(true);
    
    console.log('Sending delivery slot update:', { date: selectedDate, timeSlot: selectedTimeSlot });
    
    try {
      const token = await TokenStorage.getToken();
      const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}/delivery-slot`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          date: selectedDate,
          timeSlot: selectedTimeSlot
        })
      });

      if (response.ok) {
        const data = await response.json();
        setOrder(prev => prev ? ({
          ...prev,
          deliverySlot: data.deliverySlot
        }) : null);
        setIsDeliverySlotModalOpen(false);
        Alert.alert('Success', 'Delivery preferences updated successfully!');
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('Backend error:', errorData);
        Alert.alert('Error', errorData.message || errorData.error || 'Failed to update delivery preferences');
      }
    } catch (error) {
      console.error('Error updating delivery slot:', error);
      Alert.alert('Error', 'Error updating delivery preferences');
    } finally {
      setDeliverySlotLoading(false);
    }
  };

  // Return status utilities
  const getReturnStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'requested':
        return COLORS.WARNING + '20';
      case 'admin_review':
        return COLORS.SECONDARY + '20';
      case 'approved':
        return '#9b59b6' + '20';
      case 'rejected':
        return COLORS.ERROR + '20';
      case 'picked_up':
        return '#6366f1' + '20';
      case 'quality_checked':
        return '#f97316' + '20';
      case 'refund_approved':
        return COLORS.SUCCESS + '20';
      case 'completed':
        return '#10b981' + '20';
      case 'cancelled':
        return COLORS.GRAY + '20';
      default:
        return COLORS.GRAY + '20';
    }
  };

  const getReturnStatusText = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'requested': return 'Return Requested';
      case 'admin_review': return 'Under Review';
      case 'approved': return 'Return Approved';
      case 'rejected': return 'Return Rejected';
      case 'picked_up': return 'Items Picked Up';
      case 'quality_checked': return 'Quality Checked';
      case 'refund_approved': return 'Refund Approved';
      case 'completed': return 'Refund Completed';
      case 'cancelled': return 'Return Cancelled';
      default: return status;
    }
  };

  const navigateToReturns = () => {
    router.push('/returns' as any);
  };

  const getStatusIcon = (status: string, isActive: boolean = false) => {
    const iconColor = isActive ? COLORS.PRIMARY : COLORS.TEXT_SECONDARY;
    switch (status?.toLowerCase()) {
      case 'pending':
        return <Ionicons name="time-outline" size={20} color={iconColor} />;
      case 'shipped':
        return <Ionicons name="car-outline" size={20} color={iconColor} />;
      case 'delivered':
        return <Ionicons name="checkmark-circle-outline" size={20} color={iconColor} />;
      case 'cancelled':
        return <Ionicons name="close-circle-outline" size={20} color={iconColor} />;
      default:
        return <Ionicons name="help-circle-outline" size={20} color={iconColor} />;
    }
  };

  const getStatusSteps = (currentStatus: string): StatusStep[] => {
    const steps = [
      { key: 'pending', label: 'Order Placed', icon: 'checkmark-circle', completed: true, active: false },
      { key: 'shipped', label: 'Shipped', icon: 'car', completed: false, active: false },
      { key: 'delivered', label: 'Delivered', icon: 'home', completed: false, active: false }
    ];

    const statusIndex = steps.findIndex(step => step.key === currentStatus?.toLowerCase());
    
    steps.forEach((step, index) => {
      if (index < statusIndex) {
        step.completed = true;
      } else if (index === statusIndex) {
        step.active = true;
        step.completed = true;
      }
    });

    return steps;
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return '#f39c12';
      case 'shipped':
        return '#9b59b6';
      case 'delivered':
        return COLORS.SUCCESS;
      case 'cancelled':
        return COLORS.ERROR;
      default:
        return COLORS.TEXT_SECONDARY;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleReturnOrder = () => {
    Alert.alert(
      'Return Order',
      'Do you want to return this order?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Return', 
          style: 'destructive',
          onPress: () => {
            // Navigate to return flow
            console.log('Return order:', orderId);
          }
        }
      ]
    );
  };

  const handleCancelOrder = () => {
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order?',
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Yes, Cancel', 
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await ApiService.cancelOrder(orderId as string, 'Customer requested cancellation');
              if (response.success) {
                Alert.alert('Success', 'Order cancelled successfully');
                fetchOrderDetail(); // Refresh order details
              } else {
                Alert.alert('Error', response.error || 'Failed to cancel order');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to cancel order');
            }
          }
        }
      ]
    );
  };

  const renderStatusTimeline = () => {
    if (!order) return null;
    
    const steps = getStatusSteps(order.status || '');
    
    return (
      <View style={styles.timelineContainer}>
        <Text style={styles.sectionTitle}>Order Status</Text>
        <View style={styles.timeline}>
          {steps.map((step, index) => (
            <View key={step.key} style={styles.timelineStep}>
              <View style={styles.timelineStepContent}>
                <View style={[
                  styles.timelineIcon,
                  step.completed ? styles.timelineIconCompleted : styles.timelineIconPending,
                  step.active && styles.timelineIconActive
                ]}>
                  <Ionicons 
                    name={step.completed ? 'checkmark' : step.icon as any} 
                    size={16} 
                    color={step.completed ? COLORS.WHITE : COLORS.TEXT_SECONDARY} 
                  />
                </View>
                <View style={styles.timelineText}>
                  <Text style={[
                    styles.timelineLabel,
                    step.active && styles.timelineLabelActive
                  ]}>
                    {step.label}
                  </Text>
                  {step.active && (
                    <Text style={styles.timelineTime}>
                      {formatDate(order.updatedAt || order.createdAt)}
                    </Text>
                  )}
                </View>
              </View>
              {index < steps.length - 1 && (
                <View style={[
                  styles.timelineConnector,
                  step.completed && styles.timelineConnectorCompleted
                ]} />
              )}
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderOrderItems = () => {
    if (!order?.items || order.items.length === 0) return null;

    return (
      <View style={styles.section}>
        <View style={styles.orderItemsHeader}>
          <Ionicons name="bag-outline" size={20} color={COLORS.PRIMARY} />
          <Text style={styles.sectionTitle}>Order Items ({order.items.length})</Text>
        </View>
        {order.items.map((item, index) => (
          <TouchableOpacity 
            key={index} 
            style={styles.orderItem}
            onPress={() => {
              if (item.id || item.productId) {
                router.push(`/products/${item.id || item.productId}` as any);
              }
            }}
          >
            <Image 
              source={{ uri: item.image || 'https://via.placeholder.com/80' }} 
              style={styles.itemImage}
            />
            <View style={styles.itemDetails}>
              <View style={styles.itemNameRow}>
                <Text style={styles.itemName}>{item.name || 'Product'}</Text>
                <Ionicons name="chevron-forward" size={16} color={COLORS.TEXT_SECONDARY} />
              </View>
              {item.variantName && (
                <Text style={styles.itemVariant}>Variant: {item.variantName}</Text>
              )}
              {item.type === 'combo' && (
                <Text style={styles.itemCombo}>Combo Pack</Text>
              )}
              <View style={styles.itemPriceRow}>
                <Text style={styles.itemQuantity}>Quantity: {item.qty || item.quantity || 1} × ₹{(item.price || 0)}</Text>
              </View>
              <Text style={styles.itemProductId}>
                Product ID: {typeof item.productId === 'string' ? item.productId : item.id || 'N/A'}
              </Text>
              <Text style={styles.itemClickHint}>
                Click to view product details
              </Text>
            </View>
            <View style={styles.itemTotalContainer}>
              <Text style={styles.itemTotal}>₹{((item.qty || item.quantity || 1) * (item.price || 0)).toFixed(2)}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderShippingInfo = () => {
    if (!order?.shipping) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Delivery Address</Text>
        <View style={styles.addressCard}>
          <View style={styles.addressHeader}>
            <Ionicons name="location-outline" size={20} color={COLORS.PRIMARY} />
            <Text style={styles.addressName}>{order.shipping.name}</Text>
          </View>
          <Text style={styles.addressText}>
            {order.shipping.address}
          </Text>
          <Text style={styles.addressText}>
            {order.shipping.city}, {order.shipping.state} - {order.shipping.pincode}
          </Text>
          <View style={styles.addressContact}>
            <Ionicons name="call-outline" size={16} color={COLORS.TEXT_SECONDARY} />
            <Text style={styles.addressPhone}>{order.shipping.phone}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderPaymentInfo = () => {
    if (!order) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment Information</Text>
        <View style={styles.paymentCard}>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Payment Method</Text>
            <Text style={styles.paymentValue}>{order.paymentMethod || 'N/A'}</Text>
          </View>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Payment Status</Text>
            <View style={[styles.paymentStatus, { 
              backgroundColor: order.paymentStatus === 'paid' ? COLORS.SUCCESS + '20' : '#f39c12' + '20'
            }]}>
              <Text style={[styles.paymentStatusText, { 
                color: order.paymentStatus === 'paid' ? COLORS.SUCCESS : '#f39c12'
              }]}>
                {order.paymentStatus || 'Pending'}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderOrderSummary = () => {
    if (!order) return null;

    const subtotal = order.subtotal || 0;
    const deliveryCharge = order.deliveryCharge || (subtotal > 500 ? 0 : 100);
    const couponDiscount = order.couponDiscount || 0;
    const coinDiscount = order.coinDiscount?.discountAmount || 0;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Order Summary</Text>
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>₹{subtotal.toLocaleString()}</Text>
          </View>
          
          {couponDiscount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, styles.discountLabel]}>Coupon Discount</Text>
              <Text style={[styles.summaryValue, styles.discountValue]}>-₹{couponDiscount.toLocaleString()}</Text>
            </View>
          )}
          
          {coinDiscount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, styles.discountLabel]}>Coin Discount</Text>
              <Text style={[styles.summaryValue, styles.discountValue]}>-₹{coinDiscount.toLocaleString()}</Text>
            </View>
          )}
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery Charge</Text>
            <Text style={styles.summaryValue}>
              {deliveryCharge === 0 ? 'Free' : `₹${deliveryCharge}`}
            </Text>
          </View>
          
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>₹{(order.totalAmount || order.total || 0).toLocaleString()}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderActionButtons = () => {
    if (!order) return null;

    const canCancel = ['pending', 'confirmed'].includes(order.status?.toLowerCase() || '');
    const canReturn = order.status?.toLowerCase() === 'delivered';
    const showRateDelivery = order.status?.toLowerCase() === 'delivered' && !(order as any).deliveryRating;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actions</Text>
        <View style={styles.actionButtonsContainer}>
          {/* Download Invoice - Always available */}
          <TouchableOpacity style={styles.downloadButton}>
            <Ionicons name="download-outline" size={20} color="#10b981" />
            <Text style={styles.downloadButtonText}>Download Invoice</Text>
          </TouchableOpacity>
          
          {canReturn && (
            <TouchableOpacity 
              style={styles.returnButton} 
              onPress={() => setReturnModalOpen(true)}
            >
              <Ionicons name="refresh-outline" size={20} color="#7c3aed" />
              <Text style={styles.returnButtonText}>Return Order</Text>
            </TouchableOpacity>
          )}
          
          {showRateDelivery && (
            <TouchableOpacity 
              style={styles.ratingButton} 
              onPress={() => setShowRatingModal(true)}
            >
              <Ionicons name="star-outline" size={20} color="#f59e0b" />
              <Text style={styles.ratingButtonText}>Rate & Review</Text>
            </TouchableOpacity>
          )}
          
          {canCancel && (
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancelOrder}>
              <Ionicons name="close-circle-outline" size={20} color="#ef4444" />
              <Text style={styles.cancelButtonText}>Cancel Order</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.TEXT_PRIMARY} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Details</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY} />
          <Text style={styles.loadingText}>Loading order details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !order) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.TEXT_PRIMARY} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Details</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={60} color={COLORS.ERROR} />
          <Text style={styles.errorTitle}>Error Loading Order</Text>
          <Text style={styles.errorMessage}>{error || 'Order not found'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchOrderDetail}>
            <Ionicons name="refresh-outline" size={20} color={COLORS.WHITE} />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Order Header */}
        <View style={styles.orderHeader}>
          <View style={styles.orderHeaderLeft}>
            <Text style={styles.orderNumber}>Order #{order._id?.slice(-8) || 'N/A'}</Text>
            <Text style={styles.orderDate}>
              Placed on {formatDate(order.placedAt || order.createdAt)}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status || '') + '20' }]}>
            {getStatusIcon(order.status || '', true)}
            <Text style={[styles.statusText, { color: getStatusColor(order.status || '') }]}>
              {order.status || 'Unknown'}
            </Text>
          </View>
        </View>

        {/* Status Timeline */}
        {renderStatusTimeline()}

        {/* Delivery Rating & Review Section */}
        {(order as any).deliveryRating && (
          <View style={styles.ratingSection}>
            <View style={styles.ratingCard}>
              <View style={styles.ratingHeader}>
                <Ionicons name="star" size={24} color="#f59e0b" />
                <Text style={styles.ratingTitle}>Delivery Rating & Review</Text>
              </View>
              <View style={styles.ratingContent}>
                <View style={styles.ratingRow}>
                  <Text style={styles.ratingLabel}>Rating:</Text>
                  <Text style={styles.ratingValue}>{(order as any).deliveryRating} / 5</Text>
                </View>
                {(order as any).deliveryReview && (
                  <View style={styles.reviewRow}>
                    <Text style={styles.ratingLabel}>Review:</Text>
                    <Text style={styles.reviewText}>{(order as any).deliveryReview}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Delivery Rating Modal for Delivered Orders without Review */}
        {order.status?.toLowerCase() === 'delivered' && !(order as any).deliveryRating && (
          <DeliveryRatingModal 
            orderId={order._id || ''} 
            onReviewSubmitted={(rating, review) => {
              setOrder(prev => prev ? ({ ...prev, deliveryRating: rating, deliveryReview: review } as any) : null);
            }} 
          />
        )}

        {/* OTP Display for Shipped Orders */}
        {order.status?.toLowerCase() === 'shipped' && (order as any).deliveryOtp?.code && (
          <View style={styles.otpSection}>
            <Text style={styles.sectionTitle}>Delivery OTP</Text>
            <View style={styles.otpCard}>
              <View style={styles.otpHeader}>
                <Ionicons name="shield-checkmark" size={24} color={COLORS.SUCCESS} />
                <Text style={styles.otpTitle}>Share this OTP with delivery agent</Text>
              </View>
              <View style={styles.otpContainer}>
                <Text style={styles.otpCode}>{(order as any).deliveryOtp.code}</Text>
                <TouchableOpacity
                  style={styles.copyButton}
                  onPress={() => {
                    Clipboard.setString((order as any).deliveryOtp.code);
                    Alert.alert('Copied', 'OTP copied to clipboard');
                  }}
                >
                  <Ionicons name="copy-outline" size={20} color={COLORS.PRIMARY} />
                </TouchableOpacity>
              </View>
              <Text style={styles.otpNote}>
                The delivery agent will ask for this OTP to confirm delivery. 
                Please keep it safe and share only with the authorized delivery person.
              </Text>
            </View>
          </View>
        )}

        {/* Return Information Section */}
        {orderReturns.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.returnSectionHeader}>
                <Ionicons name="return-up-back" size={20} color="#7c3aed" />
                <Text style={styles.returnSectionTitle}>Return Information</Text>
              </View>
              <TouchableOpacity onPress={navigateToReturns} style={styles.viewAllButton}>
                <Text style={styles.viewAllText}>View All</Text>
                <Ionicons name="chevron-forward" size={16} color={COLORS.PRIMARY} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.returnsList}>
              {orderReturns.map((returnRequest, index) => (
                <View key={returnRequest._id} style={styles.returnCard}>
                  <View style={styles.returnHeader}>
                    <View>
                      <Text style={styles.returnId}>Return #{returnRequest.returnRequestId}</Text>
                      <Text style={styles.returnDate}>
                        Requested: {new Date(returnRequest.requestedAt).toLocaleDateString('en-IN', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Text>
                    </View>
                    <View style={[styles.returnStatus, { backgroundColor: getReturnStatusColor(returnRequest.status) }]}>
                      <Text style={styles.returnStatusText}>{getReturnStatusText(returnRequest.status)}</Text>
                    </View>
                  </View>

                  <View style={styles.returnDetails}>
                    <View style={styles.returnDetailRow}>
                      <Text style={styles.returnDetailLabel}>Reason:</Text>
                      <Text style={styles.returnDetailValue}>
                        {returnRequest.returnReason.replace(/_/g, ' ')}
                      </Text>
                    </View>
                    <View style={styles.returnDetailRow}>
                      <Text style={styles.returnDetailLabel}>Items:</Text>
                      <Text style={styles.returnDetailValue}>
                        {returnRequest.items.length} item(s) returned
                      </Text>
                    </View>
                  </View>

                  {returnRequest.customerComments && (
                    <View style={styles.returnComments}>
                      <Text style={styles.returnDetailLabel}>Comments:</Text>
                      <Text style={styles.returnCommentText}>
                        {returnRequest.customerComments}
                      </Text>
                    </View>
                  )}

                  {/* Return Progress Info */}
                  <View style={styles.returnProgress}>
                    {returnRequest.status === 'completed' && returnRequest.refund?.processing?.coinsCredited && (
                      <View style={styles.returnProgressItem}>
                        <Ionicons name="checkmark-circle" size={12} color="#059669" />
                        <Text style={styles.returnProgressText}>
                          Refunded: {returnRequest.refund.processing.coinsCredited} coins
                        </Text>
                      </View>
                    )}
                    {returnRequest.status === 'rejected' && (
                      <View style={[styles.returnProgressItem, { backgroundColor: '#fef2f2' }]}>
                        <Ionicons name="close-circle" size={12} color="#dc2626" />
                        <Text style={[styles.returnProgressText, { color: '#dc2626' }]}>
                          Return was rejected
                        </Text>
                      </View>
                    )}
                    {['requested', 'admin_review', 'approved'].includes(returnRequest.status) && (
                      <View style={[styles.returnProgressItem, { backgroundColor: '#eff6ff' }]}>
                        <Ionicons name="time" size={12} color="#2563eb" />
                        <Text style={[styles.returnProgressText, { color: '#2563eb' }]}>
                          Processing in progress
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Action Button */}
                  <TouchableOpacity
                    onPress={navigateToReturns}
                    style={styles.returnViewButton}
                  >
                    <Ionicons name="eye-outline" size={16} color="#7c3aed" />
                    <Text style={styles.returnViewButtonText}>View Full Return Details</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {/* Quick Actions for Returns */}
            <TouchableOpacity
              onPress={navigateToReturns}
              style={styles.manageReturnsButton}
            >
              <Ionicons name="return-up-back" size={16} color="#7c3aed" />
              <Text style={styles.manageReturnsButtonText}>Manage All Returns</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Order Items */}
        {renderOrderItems()}

        {/* Shipping Info */}
        {renderShippingInfo()}

        {/* Payment Info */}
        {renderPaymentInfo()}

        {/* Order Summary */}
        {renderOrderSummary()}

        {/* Action Buttons */}
        {renderActionButtons()}

        {/* Bottom Padding */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Delivery Slot Modal */}
      <Modal
        visible={isDeliverySlotModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsDeliverySlotModalOpen(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.deliverySlotModal}>
            <View style={styles.deliverySlotHeader}>
              <Text style={styles.deliverySlotTitle}>Manage Delivery Preferences</Text>
              <TouchableOpacity 
                onPress={() => setIsDeliverySlotModalOpen(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={COLORS.TEXT_PRIMARY} />
              </TouchableOpacity>
            </View>
            <View style={styles.deliverySlotContent}>
              <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                <DeliverySlotSelector
                  onSlotSelect={handleDeliverySlotUpdate}
                  loading={deliverySlotLoading}
                  initialDate={(order as any)?.deliverySlot?.date}
                  initialTimeSlot={(order as any)?.deliverySlot?.timeSlot}
                />
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>

      {/* Rating Modal */}
      {showRatingModal && (
        <DeliveryRatingModal
          orderId={orderId as string}
          onReviewSubmitted={(rating, review) => {
            setShowRatingModal(false);
            // Update order to show review was submitted
            setOrder(prev => prev ? ({ ...prev, hasReview: true } as any) : null);
          }}
        />
      )}

      {/* Return Order Modal */}
      <ReturnOrderModal
        isOpen={returnModalOpen}
        onClose={() => setReturnModalOpen(false)}
        orderId={orderId as string}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: COLORS.WHITE,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
  },
  content: {
    flex: 1,
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.WHITE,
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginBottom: 8,
  },
  orderHeaderLeft: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  section: {
    backgroundColor: COLORS.WHITE,
    marginBottom: 8,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 16,
  },
  
  // Timeline Styles
  timelineContainer: {
    backgroundColor: COLORS.WHITE,
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginBottom: 8,
  },
  timeline: {
    marginTop: 10,
  },
  timelineStep: {
    marginBottom: 16,
  },
  timelineStepContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timelineIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  timelineIconPending: {
    backgroundColor: COLORS.GRAY_LIGHT,
    borderWidth: 2,
    borderColor: COLORS.BORDER,
  },
  timelineIconCompleted: {
    backgroundColor: COLORS.SUCCESS,
  },
  timelineIconActive: {
    backgroundColor: COLORS.PRIMARY,
  },
  timelineText: {
    flex: 1,
  },
  timelineLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  timelineLabelActive: {
    color: COLORS.PRIMARY,
  },
  timelineTime: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 2,
  },
  timelineConnector: {
    width: 2,
    height: 20,
    backgroundColor: COLORS.BORDER,
    marginLeft: 15,
    marginTop: 4,
  },
  timelineConnectorCompleted: {
    backgroundColor: COLORS.SUCCESS,
  },

  // Order Items Styles
  orderItemsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  orderItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
    backgroundColor: COLORS.GRAY_LIGHT,
    marginBottom: 8,
    borderRadius: 12,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  itemDetails: {
    flex: 1,
  },
  itemNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    flex: 1,
  },
  itemVariant: {
    fontSize: 12,
    color: COLORS.SUCCESS,
    fontWeight: '500',
    marginBottom: 2,
  },
  itemCombo: {
    fontSize: 12,
    color: COLORS.PRIMARY,
    fontWeight: '500',
    marginBottom: 4,
  },
  itemPriceRow: {
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 14,
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },
  itemQuantity: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
  },
  itemProductId: {
    fontSize: 10,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: 2,
  },
  itemClickHint: {
    fontSize: 10,
    color: COLORS.SUCCESS,
    fontWeight: '500',
  },
  itemTotalContainer: {
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
  },

  // Address Styles
  addressCard: {
    backgroundColor: COLORS.GRAY_LIGHT,
    padding: 16,
    borderRadius: 12,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  addressName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginLeft: 8,
  },
  addressText: {
    fontSize: 14,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 4,
    lineHeight: 20,
  },
  addressContact: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  addressPhone: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    marginLeft: 6,
  },

  // Payment Styles
  paymentCard: {
    backgroundColor: COLORS.GRAY_LIGHT,
    padding: 16,
    borderRadius: 12,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  paymentLabel: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
  },
  paymentValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  paymentStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  paymentStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Summary Styles
  summaryCard: {
    backgroundColor: COLORS.GRAY_LIGHT,
    padding: 16,
    borderRadius: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
  },
  summaryValue: {
    fontSize: 14,
    color: COLORS.TEXT_PRIMARY,
  },
  discountLabel: {
    color: COLORS.SUCCESS,
  },
  discountValue: {
    color: COLORS.SUCCESS,
    fontWeight: '600',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
    paddingTop: 12,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
  },

  // Action Buttons
  actionButtonsContainer: {
    backgroundColor: COLORS.WHITE,
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginBottom: 8,
    gap: 12,
  },
  deliverySlotButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.PRIMARY + '10',
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  deliverySlotButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.PRIMARY,
    marginLeft: 8,
  },
  ratingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.WARNING + '10',
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  ratingButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.WARNING,
    marginLeft: 8,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.ERROR + '10',
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.ERROR,
    marginLeft: 8,
  },
  returnButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.ERROR + '10',
    paddingVertical: 12,
    borderRadius: 12,
  },
  returnButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.ERROR,
    marginLeft: 8,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  downloadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.WHITE,
    marginLeft: 8,
  },

  // Loading and Error States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.WHITE,
    marginLeft: 8,
  },

  // OTP Styles
  otpSection: {
    backgroundColor: COLORS.WHITE,
    marginBottom: 8,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  otpCard: {
    backgroundColor: COLORS.SUCCESS + '10',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.SUCCESS + '30',
  },

  // Delivery Rating Styles
  ratingSection: {
    backgroundColor: COLORS.WHITE,
    marginBottom: 8,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  ratingCard: {
    backgroundColor: '#fef3c7', // yellow-100 equivalent
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fed7aa', // yellow-200 equivalent
  },
  ratingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  ratingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#92400e', // yellow-800 equivalent
    marginLeft: 8,
  },
  ratingContent: {
    gap: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e', // yellow-700 equivalent
    marginRight: 8,
  },
  ratingValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#92400e', // yellow-800 equivalent
  },
  reviewRow: {
    marginTop: 8,
  },
  reviewText: {
    fontSize: 14,
    color: '#374151', // gray-800 equivalent
    marginTop: 4,
  },

  otpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  otpTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.SUCCESS,
    marginLeft: 8,
  },
  otpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.WHITE,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: COLORS.SUCCESS,
    borderStyle: 'dashed',
  },
  otpCode: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.SUCCESS,
    letterSpacing: 4,
    marginRight: 12,
  },
  copyButton: {
    padding: 8,
    backgroundColor: COLORS.PRIMARY + '20',
    borderRadius: 8,
  },
  otpNote: {
    fontSize: 12,
    color: COLORS.SUCCESS,
    textAlign: 'center',
    lineHeight: 16,
  },

  // Return Styles
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  returnSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  returnSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginLeft: 8,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 14,
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },
  returnsList: {
    gap: 16,
  },
  returnCard: {
    backgroundColor: COLORS.GRAY_LIGHT,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  returnHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  returnId: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 4,
  },
  returnDate: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
  },
  returnStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  returnStatusText: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  returnDetails: {
    gap: 8,
    marginBottom: 12,
  },
  returnDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  returnDetailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.TEXT_SECONDARY,
  },
  returnDetailValue: {
    fontSize: 12,
    color: COLORS.TEXT_PRIMARY,
    textTransform: 'capitalize',
  },
  returnComments: {
    marginBottom: 12,
  },
  returnCommentText: {
    fontSize: 12,
    color: COLORS.TEXT_PRIMARY,
    backgroundColor: COLORS.WHITE,
    padding: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  returnProgress: {
    marginBottom: 12,
  },
  returnProgressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  returnProgressText: {
    fontSize: 10,
    color: '#059669',
    marginLeft: 4,
  },
  returnViewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
  },
  returnViewButtonText: {
    fontSize: 12,
    color: '#7c3aed',
    fontWeight: '500',
    marginLeft: 4,
  },
  manageReturnsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  manageReturnsButtonText: {
    fontSize: 14,
    color: '#7c3aed',
    fontWeight: '500',
    marginLeft: 8,
  },
  returnReason: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: 4,
  },

  // Delivery Slot Modal Styles
  deliverySlotModal: {
    backgroundColor: COLORS.WHITE,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    minHeight: '60%',
  },
  deliverySlotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  deliverySlotTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
  },
  deliverySlotContent: {
    flex: 1,
    padding: 20,
    minHeight: 400,
  },

  // Modal Styles
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  closeButton: {
    padding: 8,
  },
});

export default OrderDetailScreen;
