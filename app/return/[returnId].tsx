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
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { COLORS, API_BASE_URL } from '../../constants';
import { useAuth } from '../../contexts/AuthContext';
import TokenStorage from '../../utils/tokenStorage';

const { width } = Dimensions.get('window');

interface ReturnDetails {
  _id: string;
  returnRequestId: string;
  orderId: {
    _id: string;
    orderNumber?: string;
  };
  userId: string;
  items: Array<{
    productId: string;
    productName: string;
    variantName?: string;
    quantity: number;
    originalPrice: number;
    returnReason?: string;
  }>;
  returnReason: string;
  customerComments?: string;
  status: string;
  requestedAt: string;
  updatedAt: string;
  evidenceImages?: string[];
  refund?: {
    adminDecision?: {
      finalCoins: number;
      deductions?: Array<{
        type: string;
        amount: number;
        reason?: string;
      }>;
    };
    processing?: {
      coinsCredited: number;
      processedAt: string;
    };
  };
  warehouseManagement?: {
    statusUpdates?: Array<{
      fromStatus: string;
      toStatus: string;
      updatedAt: string;
      notes?: string;
      updatedBy?: string;
    }>;
  };
}

const ReturnDetailScreen: React.FC = () => {
  const router = useRouter();
  const { returnId } = useLocalSearchParams();
  const { isAuthenticated } = useAuth();
  const [returnDetails, setReturnDetails] = useState<ReturnDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState('');
  const [showImageModal, setShowImageModal] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/auth');
      return;
    }
    if (returnId) {
      fetchReturnDetails();
    }
  }, [isAuthenticated, returnId]);

  const fetchReturnDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await TokenStorage.getToken();
      
      if (!token) {
        setError('Please log in to view your return details');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/returns/${returnId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          setError('Please log in to view your return details');
        } else if (response.status === 403) {
          setError('You can only view your own returns');
        } else if (response.status === 404) {
          setError('Return request not found');
        } else {
          setError('Failed to fetch return details');
        }
        return;
      }

      const data = await response.json();
      setReturnDetails(data.data?.return || data.data || null);
    } catch (error) {
      console.error('Error fetching return details:', error);
      setError('Failed to fetch return details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const statusColors: { [key: string]: string } = {
      requested: COLORS.WARNING,
      admin_review: '#3b82f6',
      approved: '#10b981',
      rejected: COLORS.ERROR,
      warehouse_assigned: '#8b5cf6',
      pickup_scheduled: '#6366f1',
      picked_up: '#f97316',
      in_warehouse: '#14b8a6',
      quality_checked: '#06b6d4',
      refund_approved: '#22c55e',
      refund_processed: '#10b981',
      completed: '#10b981',
      cancelled: COLORS.TEXT_SECONDARY
    };
    return statusColors[status] || COLORS.TEXT_SECONDARY;
  };

  const getStatusIcon = (status: string) => {
    const statusIcons: { [key: string]: string } = {
      requested: 'time-outline',
      admin_review: 'eye-outline',
      approved: 'checkmark-circle-outline',
      rejected: 'close-circle-outline',
      warehouse_assigned: 'business-outline',
      pickup_scheduled: 'car-outline',
      picked_up: 'car-outline',
      in_warehouse: 'business-outline',
      quality_checked: 'checkmark-circle-outline',
      refund_approved: 'card-outline',
      refund_processed: 'checkmark-circle-outline',
      completed: 'checkmark-circle-outline',
      cancelled: 'close-circle-outline'
    };
    return statusIcons[status] || 'help-circle-outline';
  };

  const getStatusDescription = (status: string) => {
    const descriptions: { [key: string]: string } = {
      requested: 'Your return request has been submitted and is awaiting review.',
      admin_review: 'Our team is currently reviewing your return request.',
      approved: 'Your return has been approved! We will schedule a pickup soon.',
      rejected: 'Your return request has been rejected. Please contact support for more details.',
      warehouse_assigned: 'Your return has been assigned to our warehouse team.',
      pickup_scheduled: 'Pickup has been scheduled. Please be available at the scheduled time.',
      picked_up: 'Your items have been picked up and are on their way to our warehouse.',
      in_warehouse: 'Your items have been received at our warehouse and will undergo quality check.',
      quality_checked: 'Quality assessment completed. Final refund decision is being processed.',
      refund_approved: 'Your refund has been approved and will be processed shortly.',
      refund_processed: 'Refund completed! Coins have been credited to your wallet.',
      completed: 'Your return process is complete. Thank you for choosing us!',
      cancelled: 'This return request has been cancelled.'
    };
    return descriptions[status] || 'Status update in progress.';
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

  const openImageModal = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setShowImageModal(true);
  };

  const handleContactSupport = (type: 'phone' | 'email') => {
    if (type === 'phone') {
      Linking.openURL('tel:+911234567890');
    } else {
      Linking.openURL('mailto:support@indiraa.com');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY} />
          <Text style={styles.loadingText}>Loading return details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !returnDetails) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.TEXT_PRIMARY} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Return Details</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={60} color={COLORS.ERROR} />
          <Text style={styles.errorTitle}>Error Loading Return</Text>
          <Text style={styles.errorMessage}>{error || 'Return not found'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchReturnDetails}>
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
        <TouchableOpacity onPress={() => {
          // Navigate back to order detail if we have order ID, otherwise go to returns list
          if (returnDetails?.orderId?._id) {
            router.push(`/order/${returnDetails.orderId._id}` as any);
          } else {
            router.back();
          }
        }} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Return Details</Text>
        <TouchableOpacity 
          onPress={() => router.push('/returns' as any)}
          style={styles.headerButton}
        >
          <Ionicons name="list-outline" size={20} color={COLORS.TEXT_SECONDARY} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Return Header */}
        <View style={styles.returnHeader}>
          <View style={styles.returnHeaderContent}>
            <Text style={styles.returnNumber}>
              Return #{returnDetails.returnRequestId || 'N/A'}
            </Text>
            <Text style={styles.returnDate}>
              Requested on {formatDate(returnDetails.requestedAt)}
            </Text>
            
            <View style={styles.statusContainer}>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(returnDetails.status) + '20' }]}>
                <Ionicons 
                  name={getStatusIcon(returnDetails.status) as any} 
                  size={16} 
                  color={getStatusColor(returnDetails.status)} 
                />
                <Text style={[styles.statusText, { color: getStatusColor(returnDetails.status) }]}>
                  {returnDetails.status.replace('_', ' ').toUpperCase()}
                </Text>
              </View>
            </View>

            <View style={styles.statusDescription}>
              <Text style={styles.statusDescriptionText}>
                {getStatusDescription(returnDetails.status)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.mainContent}>
          {/* Order Information */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="receipt-outline" size={20} color={COLORS.PRIMARY} />
              <Text style={styles.sectionTitle}>Order Information</Text>
            </View>
            <TouchableOpacity 
              style={styles.orderCard}
              onPress={() => {
                if (returnDetails?.orderId?._id) {
                  router.push(`/order/${returnDetails.orderId._id}` as any);
                }
              }}
            >
              <View style={styles.orderInfo}>
                <Text style={styles.orderLabel}>Original Order</Text>
                <Text style={styles.orderValue}>
                  Order #{returnDetails.orderId?.orderNumber || returnDetails.orderId?._id?.slice(-8) || 'N/A'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.TEXT_SECONDARY} />
            </TouchableOpacity>
          </View>

          {/* Return Items */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="cube-outline" size={20} color={COLORS.PRIMARY} />
              <Text style={styles.sectionTitle}>Return Items</Text>
            </View>
            <View style={styles.itemsList}>
              {returnDetails.items?.map((item, index) => (
                <View key={index} style={styles.itemCard}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.productName}</Text>
                    {item.variantName && (
                      <Text style={styles.itemVariant}>Variant: {item.variantName}</Text>
                    )}
                    <View style={styles.itemDetails}>
                      <Text style={styles.itemDetail}>Qty: {item.quantity}</Text>
                      <Text style={styles.itemDetail}>Price: ₹{item.originalPrice}</Text>
                      <Text style={styles.itemDetail}>
                        Total: ₹{(item.originalPrice * item.quantity).toFixed(2)}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Return Reason & Comments */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Return Reason & Comments</Text>
            <View style={styles.reasonCard}>
              <View style={styles.reasonItem}>
                <Text style={styles.reasonLabel}>Reason</Text>
                <Text style={styles.reasonValue}>
                  {returnDetails.returnReason?.replace('_', ' ')}
                </Text>
              </View>
              {returnDetails.customerComments && (
                <View style={styles.reasonItem}>
                  <Text style={styles.reasonLabel}>Your Comments</Text>
                  <Text style={styles.commentsText}>
                    {returnDetails.customerComments}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Evidence Images */}
          {returnDetails.evidenceImages && returnDetails.evidenceImages.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="image-outline" size={20} color={COLORS.PRIMARY} />
                <Text style={styles.sectionTitle}>Evidence Images</Text>
              </View>
              <View style={styles.imagesGrid}>
                {returnDetails.evidenceImages.map((image, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.imageItem}
                    onPress={() => openImageModal(image)}
                    activeOpacity={0.8}
                  >
                    <Image
                      source={{ uri: image }}
                      style={styles.evidenceImage}
                      resizeMode="cover"
                    />
                    <View style={styles.imageOverlay}>
                      <Ionicons name="eye-outline" size={20} color={COLORS.WHITE} />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Refund Information */}
          {returnDetails.refund && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="card-outline" size={20} color={COLORS.SUCCESS} />
                <Text style={styles.sectionTitle}>Refund Status</Text>
              </View>
              <View style={styles.refundCard}>
                {returnDetails.refund.processing?.coinsCredited && (
                  <View style={styles.refundItem}>
                    <Text style={styles.refundLabel}>Coins Credited</Text>
                    <Text style={styles.refundValue}>
                      {returnDetails.refund.processing.coinsCredited} coins
                    </Text>
                    <Text style={styles.refundEquivalent}>
                      ≈ ₹{(returnDetails.refund.processing.coinsCredited / 5).toFixed(2)}
                    </Text>
                  </View>
                )}
                {returnDetails.refund.adminDecision?.finalCoins && !returnDetails.refund.processing?.coinsCredited && (
                  <View style={styles.refundItem}>
                    <Text style={styles.refundLabel}>Approved Refund</Text>
                    <Text style={styles.refundValue}>
                      {returnDetails.refund.adminDecision.finalCoins} coins
                    </Text>
                    <Text style={styles.refundEquivalent}>
                      ≈ ₹{(returnDetails.refund.adminDecision.finalCoins / 5).toFixed(2)}
                    </Text>
                    <Text style={styles.processingText}>Processing...</Text>
                  </View>
                )}
                {returnDetails.refund.adminDecision?.deductions && returnDetails.refund.adminDecision.deductions.length > 0 && (
                  <View style={styles.deductionsContainer}>
                    <Text style={styles.deductionsTitle}>Deductions</Text>
                    {returnDetails.refund.adminDecision.deductions.map((deduction, index) => (
                      <View key={index} style={styles.deductionItem}>
                        <Text style={styles.deductionType}>
                          {deduction.type.replace('_', ' ')}
                        </Text>
                        <Text style={styles.deductionAmount}>₹{deduction.amount}</Text>
                      </View>
                    ))}
                  </View>
                )}
                {returnDetails.refund.processing?.processedAt && (
                  <View style={styles.processedItem}>
                    <Text style={styles.processedLabel}>Processed At</Text>
                    <Text style={styles.processedValue}>
                      {formatDate(returnDetails.refund.processing.processedAt)}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Status Timeline */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="time-outline" size={20} color={COLORS.PRIMARY} />
              <Text style={styles.sectionTitle}>Status Timeline</Text>
            </View>
            <View style={styles.timeline}>
              {returnDetails.warehouseManagement?.statusUpdates?.map((update, index) => (
                <View key={index} style={styles.timelineItem}>
                  <View style={[styles.timelineIcon, { backgroundColor: getStatusColor(update.toStatus) + '20' }]}>
                    <Ionicons 
                      name={getStatusIcon(update.toStatus) as any} 
                      size={16} 
                      color={getStatusColor(update.toStatus)} 
                    />
                  </View>
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineStatus}>
                      {update.toStatus.replace('_', ' ').toUpperCase()}
                    </Text>
                    <Text style={styles.timelineDate}>
                      {formatDate(update.updatedAt)}
                    </Text>
                    {update.notes && (
                      <Text style={styles.timelineNotes}>{update.notes}</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Contact Support */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Need Help?</Text>
            <View style={styles.supportCard}>
              <TouchableOpacity 
                style={styles.supportItem}
                onPress={() => handleContactSupport('phone')}
              >
                <Ionicons name="call-outline" size={20} color={COLORS.PRIMARY} />
                <Text style={styles.supportText}>+91 1234567890</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.supportItem}
                onPress={() => handleContactSupport('email')}
              >
                <Ionicons name="mail-outline" size={20} color={COLORS.PRIMARY} />
                <Text style={styles.supportText}>support@indiraa.com</Text>
              </TouchableOpacity>
              <Text style={styles.supportDescription}>
                Have questions about your return? Our support team is here to help!
              </Text>
            </View>
          </View>
        </View>

        {/* Bottom Padding */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Image Modal */}
      {showImageModal && (
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
              <Image
                source={{ uri: selectedImage }}
                style={styles.modalImage}
                resizeMode="contain"
              />
            </View>
          </View>
        </Modal>
      )}
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
  headerButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
  },
  content: {
    flex: 1,
  },
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
  returnHeader: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 20,
    paddingVertical: 30,
    marginBottom: 8,
  },
  returnHeaderContent: {
    alignItems: 'center',
  },
  returnNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.WHITE,
    marginBottom: 8,
  },
  returnDate: {
    fontSize: 16,
    color: COLORS.WHITE + 'CC',
    marginBottom: 20,
  },
  statusContainer: {
    marginBottom: 16,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.WHITE + '20',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  statusDescription: {
    backgroundColor: COLORS.WHITE + '20',
    padding: 16,
    borderRadius: 12,
  },
  statusDescriptionText: {
    color: COLORS.WHITE,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  mainContent: {
    paddingHorizontal: 20,
  },
  section: {
    backgroundColor: COLORS.WHITE,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginLeft: 8,
  },
  itemsList: {
    gap: 12,
  },
  itemCard: {
    backgroundColor: COLORS.BACKGROUND,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  itemInfo: {
    gap: 8,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  itemVariant: {
    fontSize: 14,
    color: COLORS.SUCCESS,
    fontWeight: '500',
  },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  itemDetail: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
  },
  reasonCard: {
    backgroundColor: COLORS.BACKGROUND,
    padding: 16,
    borderRadius: 12,
    gap: 16,
  },
  reasonItem: {
    gap: 8,
  },
  reasonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.TEXT_SECONDARY,
  },
  reasonValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    textTransform: 'capitalize',
  },
  commentsText: {
    fontSize: 14,
    color: COLORS.TEXT_PRIMARY,
    lineHeight: 20,
  },
  imagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  imageItem: {
    width: (width - 84) / 3, // 3 images per row with padding and gaps
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  evidenceImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  refundCard: {
    backgroundColor: COLORS.BACKGROUND,
    padding: 16,
    borderRadius: 12,
    gap: 16,
  },
  refundItem: {
    gap: 4,
  },
  refundLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.SUCCESS,
  },
  refundValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
  },
  refundEquivalent: {
    fontSize: 12,
    color: COLORS.SUCCESS,
  },
  processingText: {
    fontSize: 12,
    color: COLORS.WARNING,
    marginTop: 4,
  },
  deductionsContainer: {
    backgroundColor: COLORS.WHITE,
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  deductionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.WARNING,
    marginBottom: 8,
  },
  deductionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deductionType: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
    textTransform: 'capitalize',
  },
  deductionAmount: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  processedItem: {
    gap: 4,
  },
  processedLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.PRIMARY,
  },
  processedValue: {
    fontSize: 14,
    color: COLORS.TEXT_PRIMARY,
  },
  timeline: {
    gap: 16,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  timelineIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineContent: {
    flex: 1,
    gap: 4,
  },
  timelineStatus: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    textTransform: 'capitalize',
  },
  timelineDate: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
  },
  timelineNotes: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
    fontStyle: 'italic',
  },
  supportCard: {
    backgroundColor: COLORS.BACKGROUND,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  supportItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  supportText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.PRIMARY,
  },
  supportDescription: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    lineHeight: 20,
    marginTop: 8,
  },
  orderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.BACKGROUND,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  orderInfo: {
    flex: 1,
    gap: 4,
  },
  orderLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.TEXT_SECONDARY,
  },
  orderValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.PRIMARY,
  },
  imageModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  imageModalContent: {
    position: 'relative',
    width: width * 0.9,
    height: width * 0.9,
  },
  closeImageButton: {
    position: 'absolute',
    top: -40,
    right: 0,
    zIndex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    padding: 8,
  },
  modalImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
});

export default ReturnDetailScreen;
