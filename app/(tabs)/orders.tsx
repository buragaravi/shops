import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS } from '../../constants';
import { useAuth } from '../../contexts/AuthContext';
import ApiService from '../../services/apiService';
import type { Order } from '../../services/apiService';

const { width } = Dimensions.get('window');

interface StatusOption {
  value: string;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

interface SortOption {
  value: string;
  label: string;
}

const OrdersScreen: React.FC = () => {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);

  const statusOptions: StatusOption[] = [
    { 
      value: 'all', 
      label: 'All Orders', 
      color: COLORS.TEXT_SECONDARY,
      bgColor: COLORS.GRAY_LIGHT,
      borderColor: COLORS.BORDER
    },
    { 
      value: 'pending', 
      label: 'Pending', 
      color: '#f39c12',
      bgColor: '#fef5e7',
      borderColor: '#f39c12'
    },
    { 
      value: 'shipped', 
      label: 'Shipped', 
      color: '#9b59b6',
      bgColor: '#f4ecf7',
      borderColor: '#9b59b6'
    },
    { 
      value: 'delivered', 
      label: 'Delivered', 
      color: COLORS.SUCCESS,
      bgColor: '#eafaf1',
      borderColor: COLORS.SUCCESS
    },
    { 
      value: 'cancelled', 
      label: 'Cancelled', 
      color: COLORS.ERROR,
      bgColor: '#fdedec',
      borderColor: COLORS.ERROR
    }
  ];

  const sortOptions: SortOption[] = [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'amount-high', label: 'Amount: High to Low' },
    { value: 'amount-low', label: 'Amount: Low to High' }
  ];

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/auth');
      return;
    }
    fetchOrders();
  }, [isAuthenticated]);

  useEffect(() => {
    filterAndSortOrders();
  }, [orders, statusFilter, sortBy]);

  const fetchOrders = async () => {
    try {
      setError(null);
      const response = await ApiService.getOrders();
      if (response.success && response.data) {
        setOrders(response.data.orders || []);
      } else {
        setError(response.error || 'Failed to fetch orders');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      setError('Error fetching orders. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders();
  }, []);

  const filterAndSortOrders = () => {
    let filtered = [...orders];

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => 
        order.status?.toLowerCase() === statusFilter.toLowerCase()
      );
    }

    // Sort orders
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.placedAt || a.createdAt).getTime() - new Date(b.placedAt || b.createdAt).getTime();
        case 'amount-high':
          return (b.totalAmount || b.total || 0) - (a.totalAmount || a.total || 0);
        case 'amount-low':
          return (a.totalAmount || a.total || 0) - (b.totalAmount || b.total || 0);
        case 'newest':
        default:
          return new Date(b.placedAt || b.createdAt).getTime() - new Date(a.placedAt || a.createdAt).getTime();
      }
    });

    setFilteredOrders(filtered);
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return <Ionicons name="time-outline" size={16} color="#f39c12" />;
      case 'shipped':
        return <Ionicons name="car-outline" size={16} color="#9b59b6" />;
      case 'delivered':
        return <Ionicons name="checkmark-circle-outline" size={16} color={COLORS.SUCCESS} />;
      case 'cancelled':
        return <Ionicons name="close-circle-outline" size={16} color={COLORS.ERROR} />;
      default:
        return <Ionicons name="help-circle-outline" size={16} color={COLORS.TEXT_SECONDARY} />;
    }
  };

  const getStatusStyle = (status: string) => {
    const option = statusOptions.find(opt => opt.value === status?.toLowerCase());
    return option || statusOptions[0];
  };

  const getStatusMessage = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return { title: 'Order Processing', message: 'Your order is being prepared' };
      case 'shipped':
        return { title: 'On the Way', message: 'Your order is being shipped' };
      case 'delivered':
        return { title: 'Delivered', message: 'Order has been delivered successfully' };
      case 'cancelled':
        return { title: 'Cancelled', message: 'This order has been cancelled' };
      default:
        return { title: 'Order Status', message: 'Check order details for more info' };
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateShort = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: '2-digit'
    });
  };

  const handleReturnOrder = (orderId: string) => {
    Alert.alert(
      'Return Order',
      'Do you want to return this order?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Return', 
          style: 'destructive',
          onPress: () => {
            // Navigate to return flow or show return modal
            console.log('Return order:', orderId);
          }
        }
      ]
    );
  };

  const renderOrderCard = ({ item: order, index }: { item: Order; index: number }) => {
    const statusStyle = getStatusStyle(order.status || '');
    const statusMessage = getStatusMessage(order.status || '');

    return (
      <Animated.View 
        style={[
          styles.orderCard,
          { 
            opacity: 1,
            transform: [{ translateY: 0 }]
          }
        ]}
      >
        <TouchableOpacity
          style={styles.orderCardContent}
          onPress={() => router.push(`/order/${order._id}`)}
          activeOpacity={0.7}
        >
          {/* Header */}
          <View style={styles.orderHeader}>
            <View style={styles.orderIconContainer}>
              <Ionicons name="bag-outline" size={24} color={COLORS.WHITE} />
            </View>
            <View style={styles.orderHeaderInfo}>
              <View style={styles.orderTitleRow}>
                <Text style={styles.orderTitle}>
                  Order #{order._id?.slice(-8) || 'N/A'}
                </Text>
                <View style={[styles.statusBadge, { 
                  backgroundColor: statusStyle.bgColor,
                  borderColor: statusStyle.borderColor
                }]}>
                  {getStatusIcon(order.status || '')}
                  <Text style={[styles.statusText, { color: statusStyle.color }]}>
                    {order.status || 'Unknown'}
                  </Text>
                </View>
              </View>
              <Text style={styles.orderSubtitle}>{statusMessage.title}</Text>
              <Text style={styles.orderMessage}>{statusMessage.message}</Text>
            </View>
          </View>

          {/* Order Info */}
          <View style={styles.orderInfo}>
            <View style={styles.orderInfoRow}>
              <View style={styles.infoItem}>
                <Ionicons name="calendar-outline" size={16} color={COLORS.TEXT_SECONDARY} />
                <Text style={styles.infoText}>
                  {formatDateShort(order.placedAt || order.createdAt)}
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="bag-outline" size={16} color={COLORS.TEXT_SECONDARY} />
                <Text style={styles.infoText}>
                  {order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? 's' : ''}
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="card-outline" size={16} color={COLORS.TEXT_SECONDARY} />
                <Text style={styles.infoText}>
                  {order.paymentStatus || 'Pending'}
                </Text>
              </View>
            </View>
          </View>

          {/* Items Preview */}
          {order.items && order.items.length > 0 && (
            <View style={styles.itemsPreview}>
              <View style={styles.itemsHeader}>
                <Ionicons name="cube-outline" size={16} color={COLORS.TEXT_SECONDARY} />
                <Text style={styles.itemsHeaderText}>Items:</Text>
              </View>
              <View style={styles.itemsContainer}>
                {order.items.slice(0, 2).map((item, itemIndex) => (
                  <View key={itemIndex} style={styles.itemChip}>
                    <Text style={styles.itemChipText}>
                      {item.name || 'Product'}
                      {item.variantName && ` (${item.variantName})`}
                      {' × '}
                      {item.qty || item.quantity || 1}
                    </Text>
                  </View>
                ))}
                {order.items.length > 2 && (
                  <View style={styles.itemChip}>
                    <Text style={styles.itemChipText}>
                      +{order.items.length - 2} more
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Price and Actions */}
          <View style={styles.orderFooter}>
            <View style={styles.priceContainer}>
              <Text style={styles.priceLabel}>Total Amount</Text>
              <Text style={styles.priceValue}>
                ₹{(order.totalAmount || order.total || 0).toLocaleString()}
              </Text>
            </View>
            <View style={styles.actionContainer}>
              {order.status?.toLowerCase() === 'delivered' && (
                <TouchableOpacity
                  style={styles.returnButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleReturnOrder(order._id);
                  }}
                >
                  <Ionicons name="return-up-back-outline" size={16} color={COLORS.ERROR} />
                  <Text style={styles.returnButtonText}>Return</Text>
                </TouchableOpacity>
              )}
              <View style={styles.viewDetailIcon}>
                <Ionicons name="chevron-forward" size={20} color={COLORS.TEXT_SECONDARY} />
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="bag-outline" size={80} color={COLORS.TEXT_LIGHT} />
      <Text style={styles.emptyTitle}>
        {statusFilter === 'all' ? 'No Orders Yet' : `No ${statusFilter} Orders`}
      </Text>
      <Text style={styles.emptyMessage}>
        {statusFilter === 'all' 
          ? "You haven't placed any orders yet. Start shopping to see your orders here!" 
          : `You don't have any ${statusFilter} orders at the moment.`
        }
      </Text>
      {statusFilter === 'all' ? (
        <TouchableOpacity
          style={styles.emptyActionButton}
          onPress={() => router.push('/products')}
        >
          <Text style={styles.emptyActionText}>Start Shopping</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.emptyActionButton, styles.emptyActionButtonSecondary]}
          onPress={() => setStatusFilter('all')}
        >
          <Text style={[styles.emptyActionText, styles.emptyActionTextSecondary]}>
            View All Orders
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderFilterChips = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      style={styles.filterScrollView}
      contentContainerStyle={styles.filterContainer}
    >
      {statusOptions.map((option) => (
        <TouchableOpacity
          key={option.value}
          style={[
            styles.filterChip,
            statusFilter === option.value && styles.filterChipActive,
            statusFilter === option.value && { 
              backgroundColor: option.color,
              borderColor: option.color
            }
          ]}
          onPress={() => setStatusFilter(option.value)}
        >
          <Text style={[
            styles.filterChipText,
            statusFilter === option.value && styles.filterChipTextActive
          ]}>
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Orders</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY} />
          <Text style={styles.loadingText}>Loading your orders...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Orders</Text>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={60} color={COLORS.ERROR} />
          <Text style={styles.errorTitle}>Error Loading Orders</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchOrders}>
            <Ionicons name="refresh-outline" size={20} color={COLORS.WHITE} />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Orders</Text>
        <Text style={styles.headerSubtitle}>Track and manage your orders</Text>
      </View>

      {/* Filters and Sort */}
      <View style={styles.controlsContainer}>
        <View style={styles.filterSection}>
          <View style={styles.filterHeader}>
            <Ionicons name="filter-outline" size={20} color={COLORS.TEXT_SECONDARY} />
            <Text style={styles.filterLabel}>Filter by Status:</Text>
          </View>
          {renderFilterChips()}
        </View>

        <View style={styles.sortSection}>
          <Text style={styles.sortLabel}>Sort by:</Text>
          <View style={styles.sortPicker}>
            <TouchableOpacity
              style={styles.sortButton}
              onPress={() => setShowFilters(!showFilters)}
            >
              <Text style={styles.sortButtonText}>
                {sortOptions.find(opt => opt.value === sortBy)?.label}
              </Text>
              <Ionicons 
                name={showFilters ? "chevron-up" : "chevron-down"} 
                size={16} 
                color={COLORS.TEXT_SECONDARY} 
              />
            </TouchableOpacity>
            
            {showFilters && (
              <View style={styles.sortDropdown}>
                {sortOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.sortOption,
                      sortBy === option.value && styles.sortOptionActive
                    ]}
                    onPress={() => {
                      setSortBy(option.value);
                      setShowFilters(false);
                    }}
                  >
                    <Text style={[
                      styles.sortOptionText,
                      sortBy === option.value && styles.sortOptionTextActive
                    ]}>
                      {option.label}
                    </Text>
                    {sortBy === option.value && (
                      <Ionicons name="checkmark" size={16} color={COLORS.PRIMARY} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Orders List */}
      <FlatList
        data={filteredOrders}
        renderItem={renderOrderCard}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.PRIMARY]}
            tintColor={COLORS.PRIMARY}
          />
        }
        ListEmptyComponent={renderEmptyState}
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
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    backgroundColor: COLORS.WHITE,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: COLORS.TEXT_SECONDARY,
  },
  controlsContainer: {
    backgroundColor: COLORS.WHITE,
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  filterSection: {
    marginBottom: 15,
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginLeft: 8,
  },
  filterScrollView: {
    marginTop: 5,
  },
  filterContainer: {
    paddingRight: 20,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.GRAY_LIGHT,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    marginRight: 10,
  },
  filterChipActive: {
    backgroundColor: COLORS.PRIMARY,
    borderColor: COLORS.PRIMARY,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.TEXT_SECONDARY,
  },
  filterChipTextActive: {
    color: COLORS.WHITE,
  },
  sortSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sortLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  sortPicker: {
    position: 'relative',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.GRAY_LIGHT,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  sortButtonText: {
    fontSize: 14,
    color: COLORS.TEXT_PRIMARY,
    marginRight: 8,
  },
  sortDropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    backgroundColor: COLORS.WHITE,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    minWidth: 180,
    zIndex: 1000,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  sortOptionActive: {
    backgroundColor: COLORS.PRIMARY + '10',
  },
  sortOptionText: {
    fontSize: 14,
    color: COLORS.TEXT_PRIMARY,
  },
  sortOptionTextActive: {
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },
  listContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  orderCard: {
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: COLORS.WHITE,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  orderCardContent: {
    padding: 16,
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  orderIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  orderHeaderInfo: {
    flex: 1,
  },
  orderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  orderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  orderSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 2,
  },
  orderMessage: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
  },
  orderInfo: {
    marginBottom: 16,
  },
  orderInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  infoText: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
    marginLeft: 4,
  },
  itemsPreview: {
    marginBottom: 16,
  },
  itemsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemsHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.TEXT_SECONDARY,
    marginLeft: 4,
  },
  itemsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  itemChip: {
    backgroundColor: COLORS.GRAY_LIGHT,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 4,
  },
  itemChipText: {
    fontSize: 12,
    color: COLORS.TEXT_PRIMARY,
  },
  orderFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
  },
  priceContainer: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: 2,
  },
  priceValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
  },
  actionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  returnButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.ERROR + '10',
    marginRight: 12,
  },
  returnButtonText: {
    fontSize: 12,
    color: COLORS.ERROR,
    fontWeight: '600',
    marginLeft: 4,
  },
  viewDetailIcon: {
    padding: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginTop: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 16,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  emptyActionButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyActionButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.PRIMARY,
  },
  emptyActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.WHITE,
  },
  emptyActionTextSecondary: {
    color: COLORS.PRIMARY,
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
});

export default OrdersScreen;
