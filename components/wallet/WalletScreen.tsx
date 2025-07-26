import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, APP_CONSTANTS } from '../../constants';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';

export default function WalletScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { 
    state, 
    loadWalletBalance, 
    loadTransactions,
    setLoading 
  } = useApp();
  
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  useEffect(() => {
    if (state.isAuthenticated) {
      loadInitialData();
    }
  }, [state.isAuthenticated]);

  const loadInitialData = async () => {
    try {
      await Promise.all([
        loadWalletBalance(),
        loadTransactions(1, selectedFilter === 'all' ? undefined : selectedFilter),
      ]);
    } catch (error) {
      console.error('Error loading wallet data:', error);
      Alert.alert('Error', 'Failed to load wallet data');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadInitialData();
    } catch (error) {
      console.error('Error refreshing wallet:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleFilterChange = async (filter: string) => {
    setSelectedFilter(filter);
    setLoading('wallet', true);
    try {
      await loadTransactions(1, filter === 'all' ? undefined : filter);
    } catch (error) {
      console.error('Error filtering transactions:', error);
    } finally {
      setLoading('wallet', false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'credit':
      case 'refund':
      case 'cashback':
        return 'add-circle';
      case 'debit':
      case 'purchase':
        return 'remove-circle';
      case 'referral':
        return 'people';
      default:
        return 'swap-horizontal';
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'credit':
      case 'refund':
      case 'cashback':
      case 'referral':
        return COLORS.SUCCESS;
      case 'debit':
      case 'purchase':
        return COLORS.ERROR;
      default:
        return COLORS.TEXT_SECONDARY;
    }
  };

  const formatAmount = (amount: number, type: string) => {
    const prefix = type === 'credit' || type === 'refund' || type === 'cashback' || type === 'referral' ? '+' : '-';
    return `${prefix}${APP_CONSTANTS.CURRENCY}${Math.abs(amount).toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const filters = [
    { key: 'all', label: 'All' },
    { key: 'credit', label: 'Credits' },
    { key: 'debit', label: 'Debits' },
    { key: 'refund', label: 'Refunds' },
    { key: 'cashback', label: 'Cashback' },
    { key: 'referral', label: 'Referrals' },
  ];

  if (!state.isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.WHITE} />
        <View style={styles.authContainer}>
          <Ionicons name="wallet" size={64} color={COLORS.TEXT_SECONDARY} />
          <Text style={styles.authTitle}>Wallet Access Required</Text>
          <Text style={styles.authSubtitle}>
            Please login to view your wallet balance and transactions
          </Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.push('/auth/login')}
          >
            <Text style={styles.loginButtonText}>Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.WHITE} />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Wallet</Text>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => {/* Add money functionality */}}
        >
          <Ionicons name="add" size={24} color={COLORS.PRIMARY} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Wallet Balance Card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <Text style={styles.balanceLabel}>Available Balance</Text>
            <TouchableOpacity>
              <Ionicons name="eye" size={20} color={COLORS.WHITE} />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.balanceAmount}>
            {APP_CONSTANTS.CURRENCY}{(state.walletBalance?.balance || 0).toLocaleString()}
          </Text>
          
          {state.walletBalance?.coins && state.walletBalance.coins > 0 && (
            <View style={styles.coinsContainer}>
              <Ionicons name="diamond" size={16} color="#FFD700" />
              <Text style={styles.coinsText}>
                {state.walletBalance.coins} Coins
              </Text>
            </View>
          )}

          <View style={styles.balanceActions}>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="add" size={20} color={COLORS.PRIMARY} />
              <Text style={styles.actionButtonText}>Add Money</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="send" size={20} color={COLORS.PRIMARY} />
              <Text style={styles.actionButtonText}>Transfer</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {APP_CONSTANTS.CURRENCY}{(state.walletBalance?.totalSpent || 0).toLocaleString()}
            </Text>
            <Text style={styles.statLabel}>Total Spent</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {APP_CONSTANTS.CURRENCY}{(state.walletBalance?.totalEarned || 0).toLocaleString()}
            </Text>
            <Text style={styles.statLabel}>Total Earned</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {state.walletBalance?.totalTransactions || 0}
            </Text>
            <Text style={styles.statLabel}>Transactions</Text>
          </View>
        </View>

        {/* Transaction Filters */}
        <View style={styles.filtersContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersList}
          >
            {filters.map((filter) => (
              <TouchableOpacity
                key={filter.key}
                style={[
                  styles.filterChip,
                  selectedFilter === filter.key && styles.filterChipSelected,
                ]}
                onPress={() => handleFilterChange(filter.key)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedFilter === filter.key && styles.filterChipTextSelected,
                  ]}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Transactions */}
        <View style={styles.transactionsContainer}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          
          {state.loading.wallet ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.PRIMARY} />
              <Text style={styles.loadingText}>Loading transactions...</Text>
            </View>
          ) : state.transactions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt" size={48} color={COLORS.TEXT_SECONDARY} />
              <Text style={styles.emptyText}>No transactions found</Text>
              <Text style={styles.emptySubtext}>
                Your transaction history will appear here
              </Text>
            </View>
          ) : (
            <View style={styles.transactionsList}>
              {state.transactions.map((transaction, index) => (
                <TouchableOpacity
                  key={transaction._id || index}
                  style={styles.transactionItem}
                  onPress={() => {
                    // Show transaction details
                    Alert.alert(
                      'Transaction Details',
                      `${transaction.description}\n\nAmount: ${formatAmount(transaction.amount, transaction.type)}\nDate: ${formatDate(transaction.createdAt)}`
                    );
                  }}
                >
                  <View style={styles.transactionLeft}>
                    <View
                      style={[
                        styles.transactionIcon,
                        { backgroundColor: `${getTransactionColor(transaction.type)}20` },
                      ]}
                    >
                      <Ionicons
                        name={getTransactionIcon(transaction.type) as any}
                        size={20}
                        color={getTransactionColor(transaction.type)}
                      />
                    </View>
                    
                    <View style={styles.transactionDetails}>
                      <Text style={styles.transactionTitle}>
                        {transaction.description}
                      </Text>
                      <Text style={styles.transactionDate}>
                        {formatDate(transaction.createdAt)}
                      </Text>
                      {transaction.orderId && (
                        <Text style={styles.transactionOrderId}>
                          Order: #{transaction.orderId}
                        </Text>
                      )}
                    </View>
                  </View>
                  
                  <View style={styles.transactionRight}>
                    <Text
                      style={[
                        styles.transactionAmount,
                        { color: getTransactionColor(transaction.type) },
                      ]}
                    >
                      {formatAmount(transaction.amount, transaction.type)}
                    </Text>
                    <Text style={styles.transactionStatus}>
                      {transaction.status || 'Completed'}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  authTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginTop: 24,
    marginBottom: 8,
  },
  authSubtitle: {
    fontSize: 16,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginBottom: 32,
  },
  loginButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
  },
  loginButtonText: {
    color: COLORS.WHITE,
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.WHITE,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${COLORS.PRIMARY}20`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  balanceCard: {
    backgroundColor: COLORS.PRIMARY,
    margin: 20,
    padding: 24,
    borderRadius: 20,
    shadowColor: COLORS.BLACK,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  balanceLabel: {
    color: COLORS.WHITE,
    fontSize: 16,
    opacity: 0.9,
  },
  balanceAmount: {
    color: COLORS.WHITE,
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  coinsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  coinsText: {
    color: COLORS.WHITE,
    fontSize: 14,
    marginLeft: 6,
    fontWeight: '600',
  },
  balanceActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.WHITE,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  actionButtonText: {
    color: COLORS.PRIMARY,
    fontSize: 14,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  statItem: {
    flex: 1,
    backgroundColor: COLORS.WHITE,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
  },
  filtersContainer: {
    marginBottom: 20,
  },
  filtersList: {
    paddingHorizontal: 20,
    gap: 12,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    backgroundColor: COLORS.WHITE,
  },
  filterChipSelected: {
    backgroundColor: COLORS.PRIMARY,
    borderColor: COLORS.PRIMARY,
  },
  filterChipText: {
    fontSize: 14,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '500',
  },
  filterChipTextSelected: {
    color: COLORS.WHITE,
  },
  transactionsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 16,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 4,
  },
  transactionsList: {
    gap: 12,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.WHITE,
    padding: 16,
    borderRadius: 12,
    shadowColor: COLORS.BLACK,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  transactionLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
  },
  transactionOrderId: {
    fontSize: 11,
    color: COLORS.PRIMARY,
    marginTop: 2,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  transactionStatus: {
    fontSize: 11,
    color: COLORS.TEXT_SECONDARY,
  },
});
