import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, APP_CONSTANTS } from '../constants';
import { useApp } from '../contexts/AppContext';
import type { Transaction } from '../services/apiService';

interface WalletComponentProps {
  showHeader?: boolean;
}

const WalletComponent: React.FC<WalletComponentProps> = ({ showHeader = true }) => {
  const { state, loadWalletBalance, loadTransactions } = useApp();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'balance' | 'transactions'>('balance');

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      await Promise.all([
        loadWalletBalance(),
        loadTransactions(1, 'all'),
      ]);
    } catch (error) {
      console.error('Error loading wallet data:', error);
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

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'credit':
      case 'referral_bonus':
      case 'cashback':
        return 'add-circle';
      case 'debit':
      case 'purchase':
      case 'withdrawal':
        return 'remove-circle';
      default:
        return 'swap-horizontal';
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'credit':
      case 'referral_bonus':
      case 'cashback':
        return COLORS.SUCCESS;
      case 'debit':
      case 'purchase':
      case 'withdrawal':
        return COLORS.ERROR;
      default:
        return COLORS.TEXT_SECONDARY;
    }
  };

  const formatAmount = (amount: number, type: string) => {
    const prefix = type === 'credit' || type === 'referral_bonus' || type === 'cashback' ? '+' : '-';
    return `${prefix}${APP_CONSTANTS.CURRENCY}${Math.abs(amount).toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderTransactionItem = (transaction: Transaction) => (
    <View key={transaction._id} style={styles.transactionItem}>
      <View style={styles.transactionLeft}>
        <View style={[
          styles.transactionIcon,
          { backgroundColor: `${getTransactionColor(transaction.type)}20` }
        ]}>
          <Ionicons
            name={getTransactionIcon(transaction.type) as any}
            size={20}
            color={getTransactionColor(transaction.type)}
          />
        </View>
        <View style={styles.transactionDetails}>
          <Text style={styles.transactionTitle}>{transaction.description}</Text>
          <Text style={styles.transactionDate}>
            {formatDate(transaction.createdAt)}
          </Text>
          {transaction.orderId && (
            <Text style={styles.transactionOrderId}>
              Order #{transaction.orderId}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.transactionRight}>
        <Text style={[
          styles.transactionAmount,
          { color: getTransactionColor(transaction.type) }
        ]}>
          {formatAmount(transaction.amount, transaction.type)}
        </Text>
        <Text style={styles.transactionStatus}>{transaction.status}</Text>
      </View>
    </View>
  );

  if (state.loading.wallet) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
        <Text style={styles.loadingText}>Loading wallet...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {showHeader && (
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Wallet</Text>
        </View>
      )}

      {/* Wallet Balance Card */}
      <View style={styles.balanceCard}>
        <View style={styles.balanceHeader}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
            <Ionicons name="refresh" size={20} color={COLORS.PRIMARY} />
          </TouchableOpacity>
        </View>
        
        <Text style={styles.balanceAmount}>
          {APP_CONSTANTS.CURRENCY}{state.walletBalance?.balance?.toLocaleString() || '0'}
        </Text>
        
        <View style={styles.balanceDetails}>
          <View style={styles.balanceDetailItem}>
            <Text style={styles.balanceDetailLabel}>Coins</Text>
            <Text style={styles.balanceDetailValue}>
              {state.walletBalance?.coins?.toLocaleString() || '0'}
            </Text>
          </View>
          <View style={styles.balanceDetailItem}>
            <Text style={styles.balanceDetailLabel}>Referral Points</Text>
            <Text style={styles.balanceDetailValue}>
              {state.walletBalance?.referralPoints?.toLocaleString() || '0'}
            </Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => Alert.alert('Add Money', 'This feature will be implemented')}
          >
            <Ionicons name="add" size={20} color={COLORS.WHITE} />
            <Text style={styles.actionButtonText}>Add Money</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={() => Alert.alert('Send Money', 'This feature will be implemented')}
          >
            <Ionicons name="send" size={20} color={COLORS.PRIMARY} />
            <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>Send</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'balance' && styles.activeTab]}
          onPress={() => setActiveTab('balance')}
        >
          <Text style={[styles.tabText, activeTab === 'balance' && styles.activeTabText]}>
            Balance Details
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'transactions' && styles.activeTab]}
          onPress={() => setActiveTab('transactions')}
        >
          <Text style={[styles.tabText, activeTab === 'transactions' && styles.activeTabText]}>
            Transactions
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content based on active tab */}
      {activeTab === 'balance' ? (
        <View style={styles.balanceDetailsContainer}>
          <View style={styles.balanceBreakdown}>
            <Text style={styles.sectionTitle}>Balance Breakdown</Text>
            
            <View style={styles.breakdownItem}>
              <View style={styles.breakdownLeft}>
                <Ionicons name="wallet" size={24} color={COLORS.PRIMARY} />
                <Text style={styles.breakdownLabel}>Main Balance</Text>
              </View>
              <Text style={styles.breakdownAmount}>
                {APP_CONSTANTS.CURRENCY}{state.walletBalance?.balance?.toLocaleString() || '0'}
              </Text>
            </View>

            <View style={styles.breakdownItem}>
              <View style={styles.breakdownLeft}>
                <Ionicons name="diamond" size={24} color="#FFD700" />
                <Text style={styles.breakdownLabel}>Coins</Text>
              </View>
              <Text style={styles.breakdownAmount}>
                {state.walletBalance?.coins?.toLocaleString() || '0'}
              </Text>
            </View>

            <View style={styles.breakdownItem}>
              <View style={styles.breakdownLeft}>
                <Ionicons name="gift" size={24} color="#FF6B6B" />
                <Text style={styles.breakdownLabel}>Referral Points</Text>
              </View>
              <Text style={styles.breakdownAmount}>
                {state.walletBalance?.referralPoints?.toLocaleString() || '0'}
              </Text>
            </View>
          </View>

          {/* Coins Conversion */}
          <View style={styles.conversionCard}>
            <Text style={styles.conversionTitle}>Convert Coins to Cash</Text>
            <Text style={styles.conversionRate}>
              1 Coin = {APP_CONSTANTS.CURRENCY}1
            </Text>
            <TouchableOpacity 
              style={styles.convertButton}
              onPress={() => Alert.alert('Convert Coins', 'This feature will be implemented')}
            >
              <Text style={styles.convertButtonText}>Convert Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.transactionsContainer}>
          <View style={styles.transactionsHeader}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            <Text style={styles.transactionCount}>
              {state.transactions.length} transaction{state.transactions.length !== 1 ? 's' : ''}
            </Text>
          </View>

          {state.transactions.length > 0 ? (
            <View style={styles.transactionsList}>
              {state.transactions.map(renderTransactionItem)}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt" size={64} color={COLORS.TEXT_SECONDARY} />
              <Text style={styles.emptyText}>No transactions yet</Text>
              <Text style={styles.emptySubtext}>
                Your transaction history will appear here
              </Text>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.TEXT_SECONDARY,
  },
  header: {
    padding: 20,
    backgroundColor: COLORS.WHITE,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
  },
  balanceCard: {
    backgroundColor: COLORS.WHITE,
    margin: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: COLORS.BLACK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  balanceLabel: {
    fontSize: 16,
    color: COLORS.TEXT_SECONDARY,
  },
  refreshButton: {
    padding: 4,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
    marginBottom: 20,
  },
  balanceDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  balanceDetailItem: {
    alignItems: 'center',
  },
  balanceDetailLabel: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: 4,
  },
  balanceDetailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.PRIMARY,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.PRIMARY,
  },
  actionButtonText: {
    color: COLORS.WHITE,
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: COLORS.PRIMARY,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.WHITE,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: COLORS.PRIMARY,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.TEXT_SECONDARY,
  },
  activeTabText: {
    color: COLORS.WHITE,
  },
  balanceDetailsContainer: {
    paddingHorizontal: 16,
  },
  balanceBreakdown: {
    backgroundColor: COLORS.WHITE,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 16,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  breakdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  breakdownLabel: {
    fontSize: 16,
    color: COLORS.TEXT_PRIMARY,
  },
  breakdownAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  conversionCard: {
    backgroundColor: COLORS.WHITE,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  conversionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 8,
  },
  conversionRate: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: 16,
  },
  convertButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  convertButtonText: {
    color: COLORS.WHITE,
    fontSize: 14,
    fontWeight: '600',
  },
  transactionsContainer: {
    paddingHorizontal: 16,
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  transactionCount: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
  },
  transactionsList: {
    backgroundColor: COLORS.WHITE,
    borderRadius: 16,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
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
    marginBottom: 2,
  },
  transactionOrderId: {
    fontSize: 11,
    color: COLORS.TEXT_SECONDARY,
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
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
    textTransform: 'capitalize',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    backgroundColor: COLORS.WHITE,
    borderRadius: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 8,
    textAlign: 'center',
  },
});

export default WalletComponent;
