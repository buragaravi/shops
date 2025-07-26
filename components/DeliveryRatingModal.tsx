import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, API_BASE_URL } from '../constants';
import TokenStorage from '../utils/tokenStorage';
import ApiService from '../services/apiService';

interface DeliveryRatingModalProps {
  orderId: string;
  onReviewSubmitted?: (rating: number, review: string) => void;
}

const DeliveryRatingModal: React.FC<DeliveryRatingModalProps> = ({ 
  orderId, 
  onReviewSubmitted 
}) => {
  const [show, setShow] = useState(true);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    if (rating < 1 || rating > 5) {
      setError('Please select a rating between 1 and 5.');
      return;
    }
    
    setSubmitting(true);
    try {
      const token = await TokenStorage.getToken();
      const response = await fetch(`${API_BASE_URL}/api/products/orders/${orderId}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ rating, review })
      });
      
      const data = await response.json();
      if (response.ok) {
        setShow(false);
        if (onReviewSubmitted) onReviewSubmitted(rating, review);
        Alert.alert('Success', 'Thank you for your review!');
      } else {
        setError(data.message || 'Failed to submit review.');
      }
    } catch (err) {
      setError('Error submitting review.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!show) return null;

  return (
    <Modal
      visible={show}
      transparent
      animationType="fade"
      onRequestClose={() => setShow(false)}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShow(false)}
          >
            <Ionicons name="close" size={24} color={COLORS.TEXT_SECONDARY} />
          </TouchableOpacity>
          
          <View style={styles.header}>
            <Ionicons name="star" size={24} color={COLORS.WARNING} />
            <Text style={styles.title}>Rate Your Delivery</Text>
          </View>

          <View style={styles.content}>
            {/* Rating */}
            <View style={styles.ratingSection}>
              <Text style={styles.label}>Rating</Text>
              <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map(num => (
                  <TouchableOpacity
                    key={num}
                    style={[
                      styles.starButton,
                      rating >= num ? styles.starButtonActive : styles.starButtonInactive
                    ]}
                    onPress={() => setRating(num)}
                    disabled={submitting}
                  >
                    <Ionicons 
                      name="star" 
                      size={20} 
                      color={rating >= num ? COLORS.WHITE : COLORS.WARNING} 
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Review */}
            <View style={styles.reviewSection}>
              <Text style={styles.label}>Review (optional)</Text>
              <TextInput
                style={styles.reviewInput}
                value={review}
                onChangeText={setReview}
                placeholder="Share your delivery experience..."
                placeholderTextColor={COLORS.TEXT_SECONDARY}
                multiline
                numberOfLines={3}
                editable={!submitting}
              />
            </View>

            {/* Error */}
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={COLORS.WHITE} />
              ) : (
                <Ionicons name="checkmark" size={20} color={COLORS.WHITE} />
              )}
              <Text style={styles.submitButtonText}>
                {submitting ? 'Submitting...' : 'Submit Review'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: COLORS.WHITE,
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 8,
    backgroundColor: COLORS.GRAY_LIGHT,
    borderRadius: 20,
    zIndex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingRight: 40, // Space for close button
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.WARNING,
    marginLeft: 8,
  },
  content: {
    gap: 20,
  },
  ratingSection: {
    gap: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  starButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  starButtonActive: {
    backgroundColor: COLORS.WARNING,
    borderColor: COLORS.WARNING,
  },
  starButtonInactive: {
    backgroundColor: COLORS.GRAY_LIGHT,
    borderColor: COLORS.BORDER,
  },
  reviewSection: {
    gap: 12,
  },
  reviewInput: {
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: COLORS.TEXT_PRIMARY,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  errorContainer: {
    backgroundColor: COLORS.ERROR + '10',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.ERROR + '30',
  },
  errorText: {
    color: COLORS.ERROR,
    fontSize: 14,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.WARNING,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.GRAY_LIGHT,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.WHITE,
  },
});

export default DeliveryRatingModal;
