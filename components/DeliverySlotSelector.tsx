import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, API_BASE_URL } from '../constants';
import TokenStorage from '../utils/tokenStorage';

interface DeliverySlotSelectorProps {
  onSlotSelect: (selectedDate: string, selectedTimeSlot: string) => void;
  loading?: boolean;
  initialDate?: string | null;
  initialTimeSlot?: string | null;
}

interface DateOption {
  value: string;
  label: string;
  fullDate: string;
}

const DeliverySlotSelector: React.FC<DeliverySlotSelectorProps> = ({
  onSlotSelect,
  loading = false,
  initialDate = null,
  initialTimeSlot = null,
}) => {
  const [selectedDate, setSelectedDate] = useState<string | null>(initialDate);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(initialTimeSlot);
  const [availableDates, setAvailableDates] = useState<DateOption[]>([]);
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [loadingDates, setLoadingDates] = useState(true);
  const [loadingTimeSlots, setLoadingTimeSlots] = useState(false);

  // Animation values for better UX
  const scaleValue = new Animated.Value(1);
  const fadeValue = new Animated.Value(0);
  const summaryOpacity = new Animated.Value(0);

  // Generate available dates (minimum 2 days from today) - exactly like web version
  useEffect(() => {
    const generateAvailableDates = () => {
      console.log('DeliverySlotSelector: Generating available dates...');
      const dates: DateOption[] = [];
      const today = new Date();
      
      // Start from 2 days from today - exactly like web version
      for (let i = 2; i <= 14; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        dates.push({
          value: date.toISOString().split('T')[0],
          label: date.toLocaleDateString('en-IN', { 
            weekday: 'long', 
            month: 'short', 
            day: 'numeric' 
          }),
          fullDate: date.toLocaleDateString('en-IN', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })
        });
      }
      
      console.log('DeliverySlotSelector: Generated dates:', dates.length);
      setAvailableDates(dates);
      setLoadingDates(false);
    };

    generateAvailableDates();
  }, []);

  // Fetch time slots when component mounts - exactly like web version
  useEffect(() => {
    const fetchTimeSlots = async () => {
      setLoadingTimeSlots(true);
      try {
        const token = await TokenStorage.getToken();
        const response = await fetch('https://indiraa1-backend.onrender.com/api/delivery-slots/time-slots', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          // Handle both array of strings and array of objects - exactly like web version
          const slots = data.timeSlots || [];
          const processedSlots = slots.map((slot: any) => {
            if (typeof slot === 'string') {
              return slot;
            } else if (slot && slot.value) {
              return slot.value; // Extract value from object
            } else {
              return slot.label || slot.toString();
            }
          });
          setTimeSlots(processedSlots);
        } else {
          // Fallback time slots if API fails - exactly like web version
          setTimeSlots([
            '9:00 AM - 12:00 PM',
            '12:00 PM - 3:00 PM', 
            '3:00 PM - 6:00 PM',
            '6:00 PM - 9:00 PM'
          ]);
        }
      } catch (error) {
        console.error('Error fetching time slots:', error);
        // Fallback time slots - exactly like web version
        setTimeSlots([
          '9:00 AM - 12:00 PM',
          '12:00 PM - 3:00 PM', 
          '3:00 PM - 6:00 PM',
          '6:00 PM - 9:00 PM'
        ]);
      } finally {
        setLoadingTimeSlots(false);
      }
    };

    fetchTimeSlots();
  }, []);

  // Animate summary when both selections are made
  useEffect(() => {
    if (selectedDate && selectedTimeSlot) {
      Animated.timing(summaryOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(summaryOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [selectedDate, selectedTimeSlot]);

  const handleSave = () => {
    if (selectedDate && selectedTimeSlot && onSlotSelect) {
      // Button press animation
      Animated.sequence([
        Animated.timing(scaleValue, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleValue, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
      
      onSlotSelect(selectedDate, selectedTimeSlot);
    }
  };

  const handleDateSelect = (dateValue: string) => {
    setSelectedDate(dateValue);
    // Small animation feedback
    Animated.sequence([
      Animated.timing(scaleValue, {
        toValue: 1.02,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleValue, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleTimeSlotSelect = (slot: string) => {
    setSelectedTimeSlot(slot);
    // Small animation feedback
    Animated.sequence([
      Animated.timing(scaleValue, {
        toValue: 1.02,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleValue, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const isFormValid = selectedDate && selectedTimeSlot;

  if (loadingDates) {
    console.log('DeliverySlotSelector: Loading dates...');
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading available dates...</Text>
      </View>
    );
  }

  console.log('DeliverySlotSelector: Rendering main content', {
    availableDatesLength: availableDates.length,
    timeSlotsLength: timeSlots.length,
    selectedDate,
    selectedTimeSlot,
    loadingTimeSlots
  });

  return (
    <View style={styles.container}>
      {/* Date Selection - exactly like web version */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="calendar-outline" size={16} color="#374151" />
          <Text style={styles.sectionTitle}>Select Delivery Date</Text>
        </View>
        <ScrollView style={styles.dateScrollContainer} showsVerticalScrollIndicator={false}>
          {availableDates.map((date, index) => (
            <TouchableOpacity
              key={`date-${index}-${date.value}`}
              style={[
                styles.dateOption,
                selectedDate === date.value ? styles.selectedDateOption : styles.unselectedDateOption
              ]}
              onPress={() => handleDateSelect(date.value)}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.dateLabel,
                selectedDate === date.value && styles.selectedDateLabel
              ]}>
                {date.label}
              </Text>
              <Text style={[
                styles.dateFullText,
                selectedDate === date.value && styles.selectedDateFullText
              ]}>
                {date.fullDate}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Time Slot Selection - exactly like web version */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="time-outline" size={16} color="#374151" />
          <Text style={styles.sectionTitle}>Select Time Slot</Text>
        </View>
        {loadingTimeSlots ? (
          <View style={styles.timeSlotLoadingContainer}>
            <ActivityIndicator size="small" color="#3b82f6" />
            <Text style={styles.loadingText}>Loading time slots...</Text>
          </View>
        ) : (
          <View style={styles.timeSlotsContainer}>
            {timeSlots.map((slot, index) => (
              <TouchableOpacity
                key={`timeslot-${index}-${slot}`}
                style={[
                  styles.timeSlotOption,
                  selectedTimeSlot === slot ? styles.selectedTimeSlotOption : styles.unselectedTimeSlotOption
                ]}
                onPress={() => handleTimeSlotSelect(slot)}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.timeSlotText,
                  selectedTimeSlot === slot && styles.selectedTimeSlotText
                ]}>
                  {slot}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Save Button - exactly like web version */}
      <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
        <TouchableOpacity
          style={[
            styles.saveButton,
            isFormValid && !loading ? styles.saveButtonActive : styles.saveButtonDisabled
          ]}
          onPress={handleSave}
          disabled={!isFormValid || loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <>
              <ActivityIndicator size="small" color="white" />
              <Text style={styles.saveButtonText}>Saving...</Text>
            </>
          ) : (
            <>
              <Ionicons name="checkmark" size={16} color="white" />
              <Text style={styles.saveButtonText}>Save Delivery Preferences</Text>
            </>
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* Selected Summary - exactly like web version */}
      {selectedDate && selectedTimeSlot && (
        <Animated.View 
          style={[styles.summaryContainer, { opacity: summaryOpacity }]}
        >
          <Text style={styles.summaryTitle}>Selected Preferences:</Text>
          <View style={styles.summaryContent}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryEmoji}>📅</Text>
              <Text style={styles.summaryText}>
                Date: {availableDates.find(d => d.value === selectedDate)?.fullDate}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryEmoji}>🕐</Text>
              <Text style={styles.summaryText}>Time: {selectedTimeSlot}</Text>
            </View>
          </View>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 0,
    minHeight: 400, // Ensure minimum height for modal context
    backgroundColor: '#f9fafb', // Temporary background to debug visibility
  },
  section: {
    marginBottom: 24,
    backgroundColor: 'white', // Temporary background to debug
    borderRadius: 8,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginLeft: 8,
  },
  dateScrollContainer: {
    maxHeight: 160,
  },
  dateOption: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 8,
    textAlign: 'left',
  },
  unselectedDateOption: {
    borderColor: '#e5e7eb',
    backgroundColor: 'white',
  },
  selectedDateOption: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  dateLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  selectedDateLabel: {
    color: '#1d4ed8',
  },
  dateFullText: {
    fontSize: 12,
    color: '#6b7280',
  },
  selectedDateFullText: {
    color: '#1d4ed8',
  },
  timeSlotsContainer: {
    flexDirection: 'column',
    gap: 8,
  },
  timeSlotOption: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    textAlign: 'left',
  },
  unselectedTimeSlotOption: {
    borderColor: '#e5e7eb',
    backgroundColor: 'white',
  },
  selectedTimeSlotOption: {
    borderColor: '#10b981',
    backgroundColor: '#ecfdf5',
  },
  timeSlotText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  selectedTimeSlotText: {
    color: '#059669',
  },
  saveButton: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 16,
  },
  saveButtonActive: {
    backgroundColor: '#3b82f6',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#e5e7eb',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: 'white',
  },
  summaryContainer: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e40af',
    marginBottom: 8,
  },
  summaryContent: {
    gap: 4,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  summaryEmoji: {
    fontSize: 14,
    marginRight: 8,
  },
  summaryText: {
    fontSize: 14,
    color: '#1d4ed8',
    flex: 1,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  timeSlotLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 8,
  },
});

export default DeliverySlotSelector;
