import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants';
import ApiService from '../services/apiService';
import TokenStorage from '../utils/tokenStorage';

interface CoinSuggestion {
  coins: number;
  discount: number;
  description: string;
  type: 'optimal' | 'alternative';
}

interface CoinCalculationResult {
  discountAmount: number;
  suggestions: {
    optimal?: CoinSuggestion;
    alternative?: CoinSuggestion;
  };
  limits: {
    maxCoins: number;
    maxDiscountPercentage: number;
  };
}

interface CoinDiscountData {
  coinsUsed: number;
  discountAmount: number;
  type: 'coins';
}

interface CoinRedemptionWidgetProps {
  orderValue: number;
  onDiscountApply: (discountData: CoinDiscountData | null) => void;
  appliedCoinDiscount?: CoinDiscountData | null;
}

export default function CoinRedemptionWidget({
  orderValue,
  onDiscountApply,
  appliedCoinDiscount = null
}: CoinRedemptionWidgetProps) {
  const [availableCoins, setAvailableCoins] = useState(0);
  const [coinsToUse, setCoinsToUse] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [suggestions, setSuggestions] = useState<CoinCalculationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [balanceLoading, setBalanceLoading] = useState(true);

  // Animation values
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(-20))[0];

  useEffect(() => {
    fetchCoinBalance();
    // Animate widget entrance
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    if (orderValue > 0 && availableCoins > 0) {
      getSuggestions();
    }
  }, [orderValue, availableCoins]);

  useEffect(() => {
    if (coinsToUse > 0 && orderValue > 0) {
      calculateDiscount();
    } else {
      setDiscountAmount(0);
    }
  }, [coinsToUse, orderValue]);

  const fetchCoinBalance = async () => {
    try {
      setBalanceLoading(true);
      const response = await ApiService.getWalletBalance();
      if (response.success && response.data) {
        setAvailableCoins(response.data.wallet.balance || 0);
      }
    } catch (error) {
      console.error('Error fetching coin balance:', error);
    } finally {
      setBalanceLoading(false);
    }
  };

  const getSuggestions = async () => {
    try {
      const response = await fetch('https://indiraa1-backend.onrender.com/api/wallet/calculate-discount', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await TokenStorage.getToken()}`
        },
        body: JSON.stringify({ orderValue })
      });

      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.data);
      }
    } catch (error) {
      console.error('Error getting suggestions:', error);
    }
  };

  const calculateDiscount = async () => {
    if (calculating || coinsToUse <= 0) return;
    
    setCalculating(true);
    try {
      const response = await fetch('https://indiraa1-backend.onrender.com/api/wallet/calculate-discount', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await TokenStorage.getToken()}`
        },
        body: JSON.stringify({ orderValue, coinsToUse })
      });

      if (response.ok) {
        const data = await response.json();
        setDiscountAmount(data.data.discountAmount || 0);
      } else {
        const error = await response.json();
        Alert.alert('Error', error.message || 'Invalid coin amount');
        setDiscountAmount(0);
      }
    } catch (error) {
      console.error('Error calculating discount:', error);
      Alert.alert('Error', 'Error calculating discount');
      setDiscountAmount(0);
    } finally {
      setCalculating(false);
    }
  };

  const applyDiscount = () => {
    if (discountAmount > 0 && onDiscountApply) {
      setLoading(true);
      const discountData: CoinDiscountData = {
        coinsUsed: coinsToUse,
        discountAmount: discountAmount,
        type: 'coins'
      };
      
      console.log('[COIN REDEMPTION WIDGET] Applying discount:', discountData);
      onDiscountApply(discountData);
      
      setTimeout(() => setLoading(false), 500);
      Alert.alert(
        'Success',
        `₹${discountAmount} discount applied using ${coinsToUse} coins!`
      );
    }
  };

  const removeDiscount = () => {
    Alert.alert(
      'Remove Coin Discount',
      'Are you sure you want to remove the coin discount?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setCoinsToUse(0);
            setDiscountAmount(0);
            if (onDiscountApply) {
              onDiscountApply(null);
            }
            Alert.alert('Success', 'Coin discount removed');
          }
        }
      ]
    );
  };

  const applySuggestion = (suggestionCoins: number) => {
    setCoinsToUse(suggestionCoins);
  };

  const maxCoinsAllowed = useMemo(() => {
    return Math.min(availableCoins, suggestions?.limits?.maxCoins || availableCoins);
  }, [availableCoins, suggestions]);

  if (balanceLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={COLORS.PRIMARY} />
        <Text style={styles.loadingText}>Loading coin balance...</Text>
      </View>
    );
  }

  if (availableCoins === 0) {
    return (
      <View style={styles.noCoinsContainer}>
        <Ionicons name="wallet-outline" size={32} color={COLORS.GRAY} />
        <Text style={styles.noCoinsTitle}>No coins available</Text>
        <Text style={styles.noCoinsSubtitle}>Complete orders to earn Indira Coins!</Text>
      </View>
    );
  }

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <View style={styles.header}>
        <Ionicons name="wallet" size={20} color={COLORS.PRIMARY} />
        <Text style={styles.headerTitle}>Use Indira Coins</Text>
      </View>

      {/* Available Balance */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Available Balance:</Text>
        <View style={styles.balanceValue}>
          <Ionicons name="wallet" size={16} color={COLORS.SUCCESS} />
          <Text style={styles.balanceText}>{availableCoins} coins</Text>
        </View>
      </View>

      {/* Suggestions */}
      {suggestions && !appliedCoinDiscount && (
        <View style={styles.suggestionsContainer}>
          <Text style={styles.suggestionsTitle}>Quick Suggestions:</Text>
          
          {suggestions.suggestions.optimal && (
            <TouchableOpacity
              style={[styles.suggestionCard, styles.optimalSuggestion]}
              onPress={() => applySuggestion(suggestions.suggestions.optimal!.coins)}
            >
              <View style={styles.suggestionContent}>
                <Text style={styles.suggestionTitle}>
                  Use {suggestions.suggestions.optimal.coins} coins
                </Text>
                <Text style={styles.suggestionDescription}>
                  {suggestions.suggestions.optimal.description}
                </Text>
              </View>
              <Text style={styles.suggestionDiscount}>
                ₹{suggestions.suggestions.optimal.discount} off
              </Text>
            </TouchableOpacity>
          )}
          
          {suggestions.suggestions.alternative && (
            <TouchableOpacity
              style={[styles.suggestionCard, styles.alternativeSuggestion]}
              onPress={() => applySuggestion(suggestions.suggestions.alternative!.coins)}
            >
              <View style={styles.suggestionContent}>
                <Text style={styles.suggestionTitle}>
                  Use {suggestions.suggestions.alternative.coins} coins
                </Text>
                <Text style={styles.suggestionDescription}>
                  {suggestions.suggestions.alternative.description}
                </Text>
              </View>
              <Text style={styles.suggestionDiscount}>
                ₹{suggestions.suggestions.alternative.discount} off
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Applied Discount Display */}
      {appliedCoinDiscount ? (
        <View style={styles.appliedDiscountCard}>
          <View style={styles.appliedDiscountContent}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.SUCCESS} />
            <View style={styles.appliedDiscountText}>
              <Text style={styles.appliedDiscountTitle}>
                {appliedCoinDiscount.coinsUsed} coins applied
              </Text>
              <Text style={styles.appliedDiscountSubtitle}>
                You saved ₹{appliedCoinDiscount.discountAmount}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={removeDiscount} style={styles.removeButton}>
            <Ionicons name="close" size={16} color={COLORS.ERROR} />
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Coin Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Coins to use (5 coins = ₹1 discount)</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.coinInput}
                value={coinsToUse.toString()}
                onChangeText={(text) => {
                  const value = parseInt(text) || 0;
                  setCoinsToUse(Math.max(0, Math.min(maxCoinsAllowed, value)));
                }}
                keyboardType="numeric"
                placeholder="Enter coins to use"
                maxLength={6}
              />
              {calculating && (
                <ActivityIndicator size="small" color={COLORS.PRIMARY} style={styles.calculatingIndicator} />
              )}
            </View>
          </View>

          {/* Discount Preview */}
          {coinsToUse > 0 && (
            <View style={styles.previewCard}>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Discount Amount:</Text>
                <View style={styles.previewValue}>
                  <Ionicons name="cash" size={14} color={COLORS.SUCCESS} />
                  <Text style={styles.previewText}>₹{discountAmount}</Text>
                </View>
              </View>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Remaining Coins:</Text>
                <Text style={styles.previewText}>{availableCoins - coinsToUse} coins</Text>
              </View>
            </View>
          )}

          {/* Apply Button */}
          {coinsToUse > 0 && discountAmount > 0 && (
            <TouchableOpacity
              style={[styles.applyButton, loading && styles.applyButtonDisabled]}
              onPress={applyDiscount}
              disabled={loading || calculating}
            >
              {loading ? (
                <ActivityIndicator size="small" color={COLORS.WHITE} />
              ) : (
                <>
                  <Ionicons name="wallet" size={16} color={COLORS.WHITE} />
                  <Text style={styles.applyButtonText}>
                    Apply {coinsToUse} Coins (₹{discountAmount} off)
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </>
      )}

      {/* Info */}
      <View style={styles.infoCard}>
        <Ionicons name="information-circle" size={16} color={COLORS.PRIMARY} />
        <View style={styles.infoContent}>
          <Text style={styles.infoText}>• 5 coins = ₹1 discount</Text>
          <Text style={styles.infoText}>• Maximum 10% discount on order value</Text>
          <Text style={styles.infoText}>• Coins will be deducted after order confirmation</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.WHITE,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    shadowColor: COLORS.BLACK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: COLORS.WHITE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  loadingText: {
    marginLeft: 8,
    color: COLORS.TEXT_SECONDARY,
    fontSize: 14,
  },
  noCoinsContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: COLORS.GRAY_LIGHT,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  noCoinsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT_SECONDARY,
    marginTop: 8,
  },
  noCoinsSubtitle: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 4,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginLeft: 8,
  },
  balanceCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.WHITE,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    marginBottom: 16,
  },
  balanceLabel: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
  },
  balanceValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  balanceText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.SUCCESS,
    marginLeft: 4,
  },
  suggestionsContainer: {
    marginBottom: 16,
  },
  suggestionsTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 8,
  },
  suggestionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
  },
  optimalSuggestion: {
    backgroundColor: `${COLORS.SUCCESS}10`,
    borderColor: COLORS.SUCCESS,
  },
  alternativeSuggestion: {
    backgroundColor: COLORS.WHITE,
    borderColor: COLORS.BORDER,
  },
  suggestionContent: {
    flex: 1,
  },
  suggestionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.TEXT_PRIMARY,
  },
  suggestionDescription: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 2,
  },
  suggestionDiscount: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.SUCCESS,
  },
  appliedDiscountCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: `${COLORS.SUCCESS}15`,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.SUCCESS,
    marginBottom: 16,
  },
  appliedDiscountContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  appliedDiscountText: {
    marginLeft: 8,
    flex: 1,
  },
  appliedDiscountTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.SUCCESS,
  },
  appliedDiscountSubtitle: {
    fontSize: 12,
    color: COLORS.SUCCESS,
    marginTop: 2,
  },
  removeButton: {
    padding: 4,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 8,
  },
  inputWrapper: {
    position: 'relative',
  },
  coinInput: {
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: COLORS.WHITE,
  },
  calculatingIndicator: {
    position: 'absolute',
    right: 12,
    top: 12,
  },
  previewCard: {
    backgroundColor: COLORS.WHITE,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.SUCCESS,
    marginBottom: 16,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  previewLabel: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
  },
  previewValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.SUCCESS,
    marginLeft: 4,
  },
  applyButton: {
    backgroundColor: COLORS.PRIMARY,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    marginBottom: 16,
  },
  applyButtonDisabled: {
    opacity: 0.6,
  },
  applyButtonText: {
    color: COLORS.WHITE,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: `${COLORS.PRIMARY}10`,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: `${COLORS.PRIMARY}30`,
  },
  infoContent: {
    marginLeft: 8,
    flex: 1,
  },
  infoText: {
    fontSize: 12,
    color: COLORS.PRIMARY,
    marginBottom: 2,
  },
});
