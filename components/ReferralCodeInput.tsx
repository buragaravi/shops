import React, { useState, useEffect } from 'react';
import { View, TextInput, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '../constants';

interface ReferralCodeInputProps {
  onCodeChange: (code: string, isValid: boolean) => void;
  initialCode?: string;
}

const ReferralCodeInput: React.FC<ReferralCodeInputProps> = ({ 
  onCodeChange, 
  initialCode = '' 
}) => {
  const [code, setCode] = useState(initialCode);
  const [isValidating, setIsValidating] = useState(false);
  const [validationStatus, setValidationStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [validationMessage, setValidationMessage] = useState('');

  // Debounced validation
  useEffect(() => {
    if (!code.trim()) {
      setValidationStatus('idle');
      setValidationMessage('');
      onCodeChange('', false);
      return;
    }

    const timeoutId = setTimeout(() => {
      validateReferralCode(code.trim());
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(timeoutId);
  }, [code]);

  const validateReferralCode = async (referralCode: string) => {
    if (!referralCode) return;

    setIsValidating(true);
    setValidationStatus('idle');

    try {
      const response = await fetch(`${API_BASE_URL}/api/referral/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ referralCode }),
      });

      const data = await response.json();
      console.log('Referral validation response:', data);
      
      if (response.ok && data.success) {
        setValidationStatus('valid');
        setValidationMessage(`Valid code! Referred by ${data.referrer?.name || 'another user'}`);
        onCodeChange(referralCode, true);
      } else {
        setValidationStatus('invalid');
        setValidationMessage(data.message || 'Invalid referral code');
        onCodeChange(referralCode, false);
      }
    } catch (error) {
      console.error('Referral validation error:', error);
      setValidationStatus('invalid');
      setValidationMessage('Unable to validate referral code');
      onCodeChange(referralCode, false);
    } finally {
      setIsValidating(false);
    }
  };

  const handleCodeChange = (text: string) => {
    setCode(text.toUpperCase()); // Convert to uppercase like in frontend
  };

  const getStatusIcon = () => {
    if (isValidating) {
      return <ActivityIndicator size="small" color="#6b7280" />;
    }
    
    switch (validationStatus) {
      case 'valid':
        return <Ionicons name="checkmark-circle" size={20} color="#10b981" />;
      case 'invalid':
        return <Ionicons name="close-circle" size={20} color="#ef4444" />;
      default:
        return <Ionicons name="gift-outline" size={20} color="#6b7280" />;
    }
  };

  const getStatusColor = () => {
    switch (validationStatus) {
      case 'valid':
        return '#10b981'; // Green border for valid
      case 'invalid':
        return '#ef4444'; // Red border for invalid
      default:
        return '#e5e7eb'; // Default gray border
    }
  };

  const getBorderWidth = () => {
    return validationStatus === 'valid' ? 2 : 1; // Thicker border for valid
  };

  return (
    <View style={styles.container}>
      <View style={[
        styles.inputContainer, 
        { 
          borderColor: getStatusColor(),
          borderWidth: getBorderWidth(),
          backgroundColor: validationStatus === 'valid' ? '#f0fdf4' : '#f9fafb' // Light green bg for valid
        }
      ]}>
        <View style={styles.iconContainer}>
          {getStatusIcon()}
        </View>
        <TextInput
          style={styles.textInput}
          placeholder="Referral Code (Optional)"
          value={code}
          onChangeText={handleCodeChange}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={20}
        />
      </View>
      
      {validationMessage && (
        <Text style={[
          styles.validationMessage, 
          { 
            color: getStatusColor(),
            fontWeight: validationStatus === 'valid' ? '600' : '500' // Bold for valid message
          }
        ]}>
          {validationMessage}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 16,
    height: 56,
  },
  iconContainer: {
    marginRight: 12,
    width: 20,
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
  },
  validationMessage: {
    marginTop: 8,
    marginLeft: 16,
    fontSize: 14,
    fontWeight: '500',
  },
});

export default ReferralCodeInput;
