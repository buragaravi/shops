import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, API_BASE_URL } from '../constants';
import * as ImagePicker from 'expo-image-picker';
import TokenStorage from '../utils/tokenStorage';
import type { Order } from '../services/apiService';

interface ReturnOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
}

interface ReturnItem {
  orderItemId: string; // This is what backend expects
  productId: string; // Keep for display
  variantId?: string;
  quantity: number;
  name: string;
  variantName?: string;
  price: number;
  _id: string; // Keep for local operations
  images?: string[];
  qty: number;
  type?: string;
}

interface ReturnEligibility {
  isEligible: boolean;
  reason?: string;
}

const ReturnOrderModal: React.FC<ReturnOrderModalProps> = ({ 
  isOpen, 
  onClose, 
  orderId 
}) => {
  const [loading, setLoading] = useState(false);
  const [orderLoading, setOrderLoading] = useState(true);
  const [order, setOrder] = useState<Order | null>(null);
  const [eligibility, setEligibility] = useState<ReturnEligibility | null>(null);
  const [selectedItems, setSelectedItems] = useState<ReturnItem[]>([]);
  const [returnReason, setReturnReason] = useState('');
  const [customerComments, setCustomerComments] = useState('');
  const [evidenceImages, setEvidenceImages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const returnReasons = [
    { value: 'defective', label: 'Defective/Damaged product' },
    { value: 'wrong_item', label: 'Wrong item received' },
    { value: 'size_issue', label: 'Size/fit issues' },
    { value: 'quality_issue', label: 'Quality not as expected' },
    { value: 'not_as_described', label: 'Not as described' },
    { value: 'changed_mind', label: 'Changed mind' },
    { value: 'damaged_in_transit', label: 'Damaged during delivery' }
  ];

  // Fetch order details and check eligibility
  useEffect(() => {
    if (isOpen && orderId) {
      fetchOrderDetails();
    }
  }, [isOpen, orderId]);

  const fetchOrderDetails = async () => {
    setOrderLoading(true);
    setError(null);
    try {
      const token = await TokenStorage.getToken();
      const response = await fetch(`https://indiraa1-backend.onrender.com/api/products/orders/user/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setOrder(data.order);
        // Initialize all items as selected by default with correct structure for backend
        if (data.order?.items) {
          setSelectedItems(data.order.items.map((item: any, index: number) => {
            const itemId = item.id || `item_${index}`;
            return {
              orderItemId: itemId, // This is what backend expects
              productId: item.id || '', // Keep for display
              variantId: typeof item.variantId === 'string' ? item.variantId : '',
              quantity: item.qty || item.quantity || 1,
              name: item.name || 'Product',
              variantName: item.variantName || '',
              price: item.price || 0,
              _id: itemId, // Keep for local operations
              images: item.image ? [item.image] : [],
              qty: item.qty || item.quantity || 1,
              type: item.type || ''
            };
          }));
        }
        await checkReturnEligibility();
      } else {
        setError('Failed to fetch order details');
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
      setError('Error fetching order details');
    } finally {
      setOrderLoading(false);
    }
  };

  const checkReturnEligibility = async () => {
    try {
      const token = await TokenStorage.getToken();
      const response = await fetch(`https://indiraa1-backend.onrender.com/api/returns/orders/${orderId}/eligibility`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Eligibility response:', data); // Debug log
        setEligibility(data.data);
      } else {
        console.error('Eligibility check failed:', response.status);
        // If eligibility check fails, assume it's eligible but show warning
        setEligibility({
          isEligible: true,
          reason: 'Unable to verify eligibility, proceeding with caution'
        });
      }
    } catch (error) {
      console.error('Error checking return eligibility:', error);
      // If eligibility check fails, assume it's eligible but show warning
      setEligibility({
        isEligible: true,
        reason: 'Unable to verify eligibility, proceeding with caution'
      });
    }
  };

  const handleItemSelection = (item: ReturnItem, isSelected: boolean) => {
    if (isSelected) {
      setSelectedItems(prev => [...prev, item]);
    } else {
      setSelectedItems(prev => prev.filter(selected => 
        selected.orderItemId !== item.orderItemId
      ));
    }
  };

  const handleImageUpload = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera roll permissions to upload images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets) {
        const newImages = result.assets.map(asset => asset.uri);
        setEvidenceImages(prev => [...prev, ...newImages].slice(0, 5)); // Max 5 images
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick images');
    }
  };

  const removeImage = (index: number) => {
    setEvidenceImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmitReturn = async () => {
    if (selectedItems.length === 0) {
      Alert.alert('Error', 'Please select at least one item to return');
      return;
    }
    
    if (!returnReason) {
      Alert.alert('Error', 'Please select a return reason');
      return;
    }
    
    if (evidenceImages.length === 0) {
      Alert.alert('Error', 'Please upload at least one evidence image');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = await TokenStorage.getToken();
      const formData = new FormData();
      
      formData.append('orderId', orderId);
      formData.append('items', JSON.stringify(selectedItems));
      formData.append('returnReason', returnReason);
      formData.append('customerComments', customerComments);
      
      // Append images - exactly like web version
      evidenceImages.forEach((imageUri, index) => {
        formData.append('evidenceImages', {
          uri: imageUri,
          type: 'image/jpeg',
          name: `evidence_${index}.jpg`,
        } as any);
      });

      const response = await fetch(`https://indiraa1-backend.onrender.com/api/returns/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
          // Note: Don't set Content-Type for FormData, let the browser set it
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          onClose();
          // Note: In React Native, we might need to refresh the order list differently
        }, 2000);
      } else {
        setError(data.message || 'Failed to create return request');
      }
    } catch (error) {
      console.error('Error creating return request:', error);
      setError('Error creating return request');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedItems([]);
    setReturnReason('');
    setCustomerComments('');
    setEvidenceImages([]);
    setError(null);
    setSuccess(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="return-up-back" size={24} color={COLORS.WHITE} />
              <Text style={styles.headerTitle}>Return Order</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={COLORS.WHITE} />
            </TouchableOpacity>
          </View>

          {order && (
            <View style={styles.orderInfo}>
              <Text style={styles.orderInfoText}>
                Order #{order._id?.slice(-8)} - ₹{(order.totalAmount || order.total || 0).toLocaleString()}
              </Text>
              {eligibility && !eligibility.isEligible && (
                <Text style={styles.ineligibleText}>
                  {eligibility.reason || 'Return not available for this order'}
                </Text>
              )}
            </View>
          )}

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {orderLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.PRIMARY} />
                <Text style={styles.loadingText}>Loading order details...</Text>
              </View>
            ) : success ? (
              <View style={styles.successContainer}>
                <View style={styles.successIcon}>
                  <Ionicons name="checkmark" size={32} color={COLORS.SUCCESS} />
                </View>
                <Text style={styles.successTitle}>Return Request Submitted!</Text>
                <Text style={styles.successText}>
                  Your return request has been successfully submitted. You will receive updates via email and SMS.
                </Text>
                <View style={styles.successNote}>
                  <Text style={styles.successNoteText}>
                    <Text style={styles.successNoteBold}>Next Steps:</Text> Our team will review your request within 24-48 hours. 
                    You can track the status in your orders section.
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.formContainer}>
                {error && (
                  <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={20} color={COLORS.ERROR} />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                {eligibility && !eligibility.isEligible && (
                  <View style={styles.warningContainer}>
                    <Ionicons name="warning" size={20} color={COLORS.WARNING} />
                    <Text style={styles.warningTitle}>Return Not Eligible</Text>
                    <Text style={styles.warningText}>{eligibility.reason}</Text>
                  </View>
                )}

                {order && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Order Information</Text>
                    <View style={styles.orderDetails}>
                      <View style={styles.orderDetailRow}>
                        <Text style={styles.orderDetailLabel}>Order Date:</Text>
                        <Text style={styles.orderDetailValue}>
                          {new Date(order.placedAt || order.createdAt).toLocaleDateString('en-IN')}
                        </Text>
                      </View>
                      <View style={styles.orderDetailRow}>
                        <Text style={styles.orderDetailLabel}>Status:</Text>
                        <Text style={styles.orderDetailValue}>{order.status}</Text>
                      </View>
                      <View style={styles.orderDetailRow}>
                        <Text style={styles.orderDetailLabel}>Total Amount:</Text>
                        <Text style={styles.orderDetailValue}>
                          ₹{(order.totalAmount || order.total || 0).toLocaleString()}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {order?.items && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Select Items to Return</Text>
                    {!eligibility?.isEligible && (
                      <View style={styles.noteContainer}>
                        <Text style={styles.noteText}>
                          <Text style={styles.noteBold}>Note:</Text> This order may not meet standard return eligibility criteria. 
                          Proceeding will submit a special case request that requires manual review.
                        </Text>
                      </View>
                    )}
                    {order.items.map((item, index) => {
                      const itemId = item.id || `item_${index}`;
                      const isSelected = selectedItems.some(selected => 
                        selected.orderItemId === itemId
                      );
                      return (
                        <TouchableOpacity
                          key={index}
                          style={[styles.itemCard, isSelected && styles.itemCardSelected]}
                          onPress={() => handleItemSelection({
                            orderItemId: itemId, // Use item.id or fallback
                            productId: item.id || '', // Keep for display  
                            variantId: typeof item.variantId === 'string' ? item.variantId : '',
                            quantity: item.qty || item.quantity || 1,
                            name: item.name || 'Product',
                            variantName: item.variantName || '',
                            price: item.price || 0,
                            _id: itemId, // Keep for local operations
                            images: item.image ? [item.image] : [],
                            qty: item.qty || item.quantity || 1,
                            type: item.type || ''
                          }, !isSelected)}
                        >
                          <Image 
                            source={{ uri: item.image || 'https://via.placeholder.com/60' }} 
                            style={styles.itemImage}
                          />
                          <View style={styles.itemDetails}>
                            <Text style={styles.itemName}>{item.name || 'Product'}</Text>
                            {item.variantName && (
                              <Text style={styles.itemVariant}>Variant: {item.variantName}</Text>
                            )}
                            <View style={styles.itemQuantityPrice}>
                              <Text style={styles.itemQuantity}>Qty: {item.qty || item.quantity || 1}</Text>
                              <Text style={styles.itemPrice}>Price: ₹{(item.price || 0).toLocaleString()}</Text>
                            </View>
                          </View>
                          <View style={styles.checkbox}>
                            {isSelected && (
                              <Ionicons name="checkmark" size={16} color={COLORS.WHITE} />
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Return Reason *</Text>
                  <ScrollView style={styles.reasonsContainer} showsVerticalScrollIndicator={false}>
                    {returnReasons.map((reason) => (
                      <TouchableOpacity
                        key={reason.value}
                        style={[
                          styles.reasonOption,
                          returnReason === reason.value && styles.reasonOptionSelected
                        ]}
                        onPress={() => setReturnReason(reason.value)}
                      >
                        <Text style={[
                          styles.reasonText,
                          returnReason === reason.value && styles.reasonTextSelected
                        ]}>
                          {reason.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Additional Comments (Optional)</Text>
                  <TextInput
                    style={styles.commentsInput}
                    value={customerComments}
                    onChangeText={setCustomerComments}
                    placeholder="Please provide any additional details about the return..."
                    placeholderTextColor={COLORS.TEXT_SECONDARY}
                    multiline
                    numberOfLines={3}
                  />
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Evidence Images *</Text>
                  <TouchableOpacity style={styles.uploadContainer} onPress={handleImageUpload}>
                    <Ionicons name="cloud-upload" size={32} color={COLORS.TEXT_SECONDARY} />
                    <Text style={styles.uploadText}>Click to upload images (Max 5 files)</Text>
                  </TouchableOpacity>

                  {evidenceImages.length > 0 && (
                    <View style={styles.imagesGrid}>
                      {evidenceImages.map((imageUri, index) => (
                        <View key={index} style={styles.imageContainer}>
                          <Image source={{ uri: imageUri }} style={styles.evidenceImage} />
                          <TouchableOpacity
                            style={styles.removeImageButton}
                            onPress={() => removeImage(index)}
                          >
                            <Ionicons name="close" size={16} color={COLORS.WHITE} />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    (loading || selectedItems.length === 0 || !returnReason || evidenceImages.length === 0) && styles.submitButtonDisabled
                  ]}
                  onPress={handleSubmitReturn}
                  disabled={loading || selectedItems.length === 0 || !returnReason || evidenceImages.length === 0}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color={COLORS.WHITE} />
                  ) : (
                    <Ionicons name="return-up-back" size={20} color={COLORS.WHITE} />
                  )}
                  <Text style={styles.submitButtonText}>
                    {loading ? 'Processing...' : (eligibility?.isEligible ? 'Submit Return' : 'Submit Special Case')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: COLORS.WHITE,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.ERROR,
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.WHITE,
    marginLeft: 8,
  },
  closeButton: {
    padding: 8,
  },
  orderInfo: {
    backgroundColor: COLORS.ERROR,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  orderInfoText: {
    color: COLORS.WHITE,
    fontSize: 14,
    opacity: 0.9,
  },
  ineligibleText: {
    color: COLORS.WHITE,
    fontSize: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 16,
  },
  successContainer: {
    padding: 40,
    alignItems: 'center',
  },
  successIcon: {
    width: 64,
    height: 64,
    backgroundColor: COLORS.SUCCESS + '20',
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 8,
    textAlign: 'center',
  },
  successText: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginBottom: 16,
  },
  successNote: {
    backgroundColor: COLORS.SUCCESS + '10',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.SUCCESS + '30',
  },
  successNoteText: {
    fontSize: 12,
    color: COLORS.SUCCESS,
  },
  successNoteBold: {
    fontWeight: 'bold',
  },
  formContainer: {
    padding: 20,
    gap: 20,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.ERROR + '10',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.ERROR + '30',
    gap: 8,
  },
  errorText: {
    color: COLORS.ERROR,
    fontSize: 14,
    flex: 1,
  },
  warningContainer: {
    backgroundColor: COLORS.WARNING + '10',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.WARNING + '30',
    gap: 8,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.WARNING,
  },
  warningText: {
    fontSize: 14,
    color: COLORS.WARNING,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  orderDetails: {
    backgroundColor: COLORS.GRAY_LIGHT,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  orderDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  orderDetailLabel: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
  },
  orderDetailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  noteContainer: {
    backgroundColor: COLORS.WARNING + '10',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.WARNING + '30',
  },
  noteText: {
    fontSize: 12,
    color: COLORS.WARNING,
  },
  noteBold: {
    fontWeight: 'bold',
  },
  itemCard: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: COLORS.WHITE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    marginBottom: 8,
    alignItems: 'center',
  },
  itemCardSelected: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: COLORS.PRIMARY + '10',
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  itemDetails: {
    flex: 1,
    gap: 2,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  itemVariant: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.PRIMARY,
  },
  itemQuantity: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
  },
  itemQuantityPrice: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.PRIMARY,
    backgroundColor: COLORS.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reasonsContainer: {
    maxHeight: 160,
  },
  reasonOption: {
    padding: 12,
    backgroundColor: COLORS.WHITE,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    marginBottom: 8,
  },
  reasonOptionSelected: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: COLORS.PRIMARY + '10',
  },
  reasonText: {
    fontSize: 14,
    color: COLORS.TEXT_PRIMARY,
  },
  reasonTextSelected: {
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },
  commentsInput: {
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: COLORS.TEXT_PRIMARY,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  uploadContainer: {
    borderWidth: 2,
    borderColor: COLORS.BORDER,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    gap: 8,
  },
  uploadText: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
  },
  imagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  imageContainer: {
    position: 'relative',
  },
  evidenceImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    backgroundColor: COLORS.ERROR,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.ERROR,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 20,
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.GRAY_LIGHT,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.WHITE,
  },
});

export default ReturnOrderModal;
