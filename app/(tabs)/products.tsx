import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  StatusBar,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Dimensions,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { COLORS } from '../../constants';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import EnhancedProductCard from '../../components/product/EnhancedProductCard';
import VariantPopup from '../../components/VariantPopup';
import SearchBar from '../../components/SearchBar';
import { SearchService } from '../../services/searchService';
import type { Product, ProductVariant, ComboPack } from '../../services/apiService';

const { width: screenWidth } = Dimensions.get('window');

interface FilterOption {
  id: string;
  label: string;
  value: any;
  count?: number;
}

interface SortOption {
  id: string;
  label: string;
  value: string;
}

export default function ProductsTabScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user, isAuthenticated, logout } = useAuth();
  
  // URL params
  const initialCategory = params.category as string;
  const initialSearch = params.search as string;

  const { 
    state, 
    loadProducts, 
    loadCategories,
    addToCart,
    searchProducts,
    loadComboPacks,
    loadFeaturedComboPacks,
    loadWishlist,
    loadComboPackWishlist
  } = useApp();
  
  // State
  const [searchQuery, setSearchQuery] = useState(initialSearch || '');
  const [refreshing, setRefreshing] = useState(false);
  const [filteredItems, setFilteredItems] = useState<(Product | ComboPack)[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory || 'All');
  const [selectedPriceRange, setSelectedPriceRange] = useState<string>('');
  const [selectedRating, setSelectedRating] = useState<number>(0);
  const [selectedSort, setSelectedSort] = useState<string>('featured');
  
  // Search-related states
  const [searchExpanded, setSearchExpanded] = useState(!!initialSearch); // Expand if there's initial search
  const [shouldHideHeader, setShouldHideHeader] = useState(!!initialSearch); // Hide header if there's initial search
  
  // Memoize the combined products array to prevent infinite re-renders
  const allProducts = useMemo(() => {
    return [...state.products, ...state.comboPacks];
  }, [state.products, state.comboPacks]);
  
  // Filter modal states
  const [showFilters, setShowFilters] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  
  // Layout state
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Variant popup state
  const [showVariantPopup, setShowVariantPopup] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [variantAction, setVariantAction] = useState<'cart' | 'buy'>('cart');

  useEffect(() => {
    loadInitialData();
  }, []);

  // Handle URL parameter changes (e.g., from home page search)
  useEffect(() => {
    if (initialSearch && initialSearch !== searchQuery) {
      setSearchQuery(initialSearch);
      setSearchExpanded(true);
      setShouldHideHeader(true);
      console.log('🔍 Applied initial search from URL:', initialSearch);
    }
    if (initialCategory && initialCategory !== selectedCategory) {
      setSelectedCategory(initialCategory);
      console.log('📂 Applied initial category from URL:', initialCategory);
    }
  }, [initialSearch, initialCategory]);

  useEffect(() => {
    filterAndSortProducts();
  }, [state.products, state.comboPacks, selectedCategory, searchQuery, selectedPriceRange, selectedRating, selectedSort]);

  // Reload wishlist when authentication state changes
  useEffect(() => {
    const loadWishlistData = async () => {
      if (isAuthenticated && user) {
        console.log('🛍️ Authentication state changed - loading wishlist data...');
        try {
          await Promise.all([
            loadWishlist(),
            loadComboPackWishlist(),
          ]);
        } catch (error) {
          console.error('Error loading wishlist data:', error);
        }
      }
    };

    loadWishlistData();
  }, [isAuthenticated, user]);

  const loadInitialData = async () => {
    try {
      console.log('📱 Loading products screen data...');
      // Load products, categories, and combo packs
      await Promise.all([
        loadProducts(),
        loadCategories(), // This will extract categories from products
        loadComboPacks(),
        loadFeaturedComboPacks(),
      ]);

      // Load wishlist data if user is authenticated
      if (isAuthenticated && user) {
        console.log('🛍️ Loading wishlist data for authenticated user...');
        await Promise.all([
          loadWishlist(),
          loadComboPackWishlist(),
        ]);
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
      Alert.alert('Error', 'Failed to load data. Please try again.');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadInitialData();
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const filterAndSortProducts = () => {
    console.log('🔍 Filtering products - current state:', {
      products: state.products.length,
      comboPacks: state.comboPacks.length,
      selectedCategory,
      searchQuery
    });
    
    let combinedItems: (Product | ComboPack)[] = [];

    // If "Combo Packs" category is selected, show only combo packs
    if (selectedCategory === 'Combo Packs') {
      combinedItems = [...state.comboPacks];
      console.log('📦 Showing only combo packs:', combinedItems.length);
    } else {
      // Add combo packs first, then products
      combinedItems = [...state.comboPacks];
      
      let filteredProducts = [...state.products];
      
      // Filter products by category
      if (selectedCategory !== 'All') {
        filteredProducts = filteredProducts.filter(product => product.category === selectedCategory);
      }

      // Add filtered products after combo packs
      combinedItems = [...combinedItems, ...filteredProducts];
      console.log('🔄 Combined items:', {
        comboPacks: state.comboPacks.length,
        filteredProducts: filteredProducts.length,
        total: combinedItems.length
      });
    }

    // Filter by search query using SearchService
    if (searchQuery.trim()) {
      const searchResult = SearchService.search(searchQuery, combinedItems, state.categories, {
        category: selectedCategory !== 'All' ? selectedCategory : undefined,
        minPrice: selectedPriceRange ? priceRanges.find(r => r.id === selectedPriceRange)?.value?.min : undefined,
        maxPrice: selectedPriceRange ? priceRanges.find(r => r.id === selectedPriceRange)?.value?.max : undefined,
        rating: selectedRating > 0 ? selectedRating : undefined
      });
      combinedItems = searchResult.products;
      console.log('🔍 Search results:', {
        query: searchQuery,
        resultsCount: combinedItems.length,
        totalSearched: combinedItems.length
      });
    } else {
      // Apply other filters when no search query
      
      // Filter by price range
      if (selectedPriceRange) {
        const range = priceRanges.find(r => r.id === selectedPriceRange)?.value;
        if (range && typeof range === 'object') {
          combinedItems = combinedItems.filter(item => {
            const price = 'comboPrice' in item ? item.comboPrice : (item.originalPrice || item.price);
            return price >= range.min && price <= range.max;
          });
        }
      }

      // Filter by rating (only applies to products)
      if (selectedRating > 0) {
        combinedItems = combinedItems.filter(item => {
          if ('comboPrice' in item) {
            return true; // Keep all combo packs when rating filter is applied
          } else {
            return (item.rating || 0) >= selectedRating;
          }
        });
      }
    }

    // Sort items
    combinedItems.sort((a, b) => {
      const aPrice = 'comboPrice' in a ? a.comboPrice : (a.originalPrice || a.price);
      const bPrice = 'comboPrice' in b ? b.comboPrice : (b.originalPrice || b.price);
      const aRating = 'comboPrice' in a ? 0 : (a.rating || 0);
      const bRating = 'comboPrice' in b ? 0 : (b.rating || 0);

      switch (selectedSort) {
        case 'price-asc':
          return aPrice - bPrice;
        case 'price-desc':
          return bPrice - aPrice;
        case 'rating-desc':
          return bRating - aRating;
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'newest':
          // Use createdAt if available (for combo packs), otherwise fallback to comparing _id strings
          const aDate = 'createdAt' in a && a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bDate = 'createdAt' in b && b.createdAt ? new Date(b.createdAt).getTime() : 0;
          if (aDate && bDate) {
            return bDate - aDate;
          }
          // Fallback to string comparison of _id
          return (b._id || '').localeCompare(a._id || '');
        case 'featured':
        default:
          return 0;
      }
    });

    setFilteredItems(combinedItems);
  };

  // Price ranges
  const priceRanges: FilterOption[] = [
    { id: 'all', label: 'All Prices', value: '' },
    { id: 'under-500', label: 'Under ₹500', value: { min: 0, max: 500 } },
    { id: '500-1000', label: '₹500 - ₹1,000', value: { min: 500, max: 1000 } },
    { id: '1000-2000', label: '₹1,000 - ₹2,000', value: { min: 1000, max: 2000 } },
    { id: '2000-5000', label: '₹2,000 - ₹5,000', value: { min: 2000, max: 5000 } },
    { id: 'above-5000', label: 'Above ₹5,000', value: { min: 5000, max: Infinity } },
  ];

  // Sort options
  const sortOptions: SortOption[] = [
    { id: 'featured', label: 'Featured', value: 'featured' },
    { id: 'price-low', label: 'Price: Low to High', value: 'price-asc' },
    { id: 'price-high', label: 'Price: High to Low', value: 'price-desc' },
    { id: 'rating', label: 'Customer Rating', value: 'rating-desc' },
    { id: 'newest', label: 'Newest First', value: 'newest' },
    { id: 'name', label: 'Name: A to Z', value: 'name-asc' },
  ];

  const handleProductPress = (product: Product) => {
    if (!product?._id) {
      console.error('❌ Product missing _id:', product);
      Alert.alert('Error', 'Cannot open product details');
      return;
    }
    
    console.log('🔄 Navigating to product:', product._id);
    router.push(`/product/${product._id}`);
  };

  const handleVariantSelect = (product: Product, actionType: 'cart' | 'buy') => {
    setSelectedProduct(product);
    setVariantAction(actionType);
    setShowVariantPopup(true);
  };

  const handleVariantConfirm = async (
    productId: string,
    quantity: number,
    selectedVariant: ProductVariant
  ) => {
    try {
      const success = await addToCart(productId, quantity, selectedVariant._id);
      if (success) {
        Alert.alert('Success', 'Item added to cart successfully!');
        setShowVariantPopup(false);
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      Alert.alert('Error', 'Failed to add item to cart');
    }
  };

  const handleVariantBuyNow = async (
    productId: string,
    quantity: number,
    selectedVariant: ProductVariant
  ) => {
    try {
      const success = await addToCart(productId, quantity, selectedVariant._id);
      if (success) {
        router.push('/cart');
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      Alert.alert('Error', 'Failed to add item to cart');
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // Close the search expansion when search is performed
    setSearchExpanded(false);
    setShouldHideHeader(false);
    // Note: SearchBar component now handles its own suggestions
    // No need to set suggestions here to avoid re-render loops
  };

  const handleSearchToggle = () => {
    setSearchExpanded(!searchExpanded);
  };

  const handleSearchExpandedChange = (expanded: boolean) => {
    setShouldHideHeader(expanded);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchExpanded(false);
    setShouldHideHeader(false);
    console.log('🧹 Search cleared, showing all products');
  };

  const handleAuth = () => {
    if (isAuthenticated) {
      Alert.alert(
        'Logout',
        'Are you sure you want to logout?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Logout', style: 'destructive', onPress: logout },
        ]
      );
    } else {
      router.push('/auth');
    }
  };

  const renderCategoryItem = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={[
        styles.categoryItem,
        selectedCategory === item && styles.categoryItemSelected,
      ]}
      onPress={() => setSelectedCategory(item)}
    >
      <Ionicons
        name="apps-outline"
        size={16}
        color={selectedCategory === item ? COLORS.WHITE : COLORS.PRIMARY}
      />
      <Text
        style={[
          styles.categoryText,
          selectedCategory === item && styles.categoryTextSelected,
        ]}
      >
        {item}
      </Text>
    </TouchableOpacity>
  );

  const renderProductItem = ({ item, index }: { item: Product; index: number }) => (
    <View style={viewMode === 'grid' ? styles.gridItem : styles.listItem}>
      <EnhancedProductCard
        product={item}
        onPress={() => handleProductPress(item)}
        onVariantSelect={handleVariantSelect}
      />
    </View>
  );

  const renderComboPackItem = ({ item, index }: { item: ComboPack; index: number }) => (
    <View style={viewMode === 'grid' ? styles.gridItem : styles.listItem}>
      <EnhancedProductCard
        product={item}
        onPress={() => handleComboPackPress(item)}
        onVariantSelect={() => {}} // Combo packs don't have variants
      />
    </View>
  );

  const renderItemBasedOnType = ({ item, index }: { item: Product | ComboPack; index: number }) => {
    // Check if it's a combo pack or product
    if ('comboPrice' in item) {
      // It's a combo pack
      return renderComboPackItem({ item, index });
    } else {
      // It's a product
      return renderProductItem({ item, index });
    }
  };

  const handleComboPackPress = (comboPack: ComboPack) => {
    if (!comboPack?._id) {
      console.error('❌ Combo pack missing _id:', comboPack);
      Alert.alert('Error', 'Cannot open combo pack details');
      return;
    }
    
    console.log('🔄 Navigating to combo pack:', comboPack._id);
    // Navigate to combo pack detail page using href
    router.push({
      pathname: '/combopack/[id]',
      params: { id: comboPack._id }
    } as any);
  };

  const renderFilterModal = () => (
    <Modal
      visible={showFilters}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowFilters(false)}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Filters</Text>
          <TouchableOpacity onPress={() => setShowFilters(false)}>
            <Ionicons name="close" size={24} color={COLORS.TEXT_PRIMARY} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {/* Price Range Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Price Range</Text>
            {priceRanges.map((range) => (
              <TouchableOpacity
                key={range.id}
                style={styles.filterOption}
                onPress={() => setSelectedPriceRange(range.id === 'all' ? '' : range.id)}
              >
                <Text
                  style={[
                    styles.filterOptionText,
                    selectedPriceRange === range.id && styles.filterOptionTextSelected,
                  ]}
                >
                  {range.label}
                </Text>
                {selectedPriceRange === range.id && (
                  <Ionicons name="checkmark" size={20} color={COLORS.PRIMARY} />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Rating Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Minimum Rating</Text>
            {[4, 3, 2, 1].map((rating) => (
              <TouchableOpacity
                key={rating}
                style={styles.filterOption}
                onPress={() => setSelectedRating(selectedRating === rating ? 0 : rating)}
              >
                <View style={styles.ratingRow}>
                  <View style={styles.ratingStars}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Ionicons
                        key={star}
                        name={star <= rating ? 'star' : 'star-outline'}
                        size={16}
                        color={star <= rating ? '#FFD700' : COLORS.GRAY}
                      />
                    ))}
                  </View>
                  <Text style={styles.ratingText}>& up</Text>
                </View>
                {selectedRating === rating && (
                  <Ionicons name="checkmark" size={20} color={COLORS.PRIMARY} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <View style={styles.modalFooter}>
          <TouchableOpacity
            style={styles.clearFiltersButton}
            onPress={() => {
              // Clear all filters including search and category
              setSelectedPriceRange('');
              setSelectedRating(0);
              setSelectedCategory('All');
              setSearchQuery('');
              setSearchExpanded(false);
              setShouldHideHeader(false);
              console.log('🧹 Cleared all filters and search');
            }}
          >
            <Text style={styles.clearFiltersText}>Clear All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.applyFiltersButton}
            onPress={() => setShowFilters(false)}
          >
            <Text style={styles.applyFiltersText}>Apply Filters</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );

  const renderSortModal = () => (
    <Modal
      visible={showSortModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowSortModal(false)}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Sort By</Text>
          <TouchableOpacity onPress={() => setShowSortModal(false)}>
            <Ionicons name="close" size={24} color={COLORS.TEXT_PRIMARY} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {sortOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={styles.filterOption}
              onPress={() => {
                setSelectedSort(option.value);
                setShowSortModal(false);
              }}
            >
              <Text
                style={[
                  styles.filterOptionText,
                  selectedSort === option.value && styles.filterOptionTextSelected,
                ]}
              >
                {option.label}
              </Text>
              {selectedSort === option.value && (
                <Ionicons name="checkmark" size={20} color={COLORS.PRIMARY} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  const categories = ['All', 'Combo Packs', ...state.categories];
  const activeFiltersCount = (selectedPriceRange ? 1 : 0) + (selectedRating > 0 ? 1 : 0);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.WHITE} />
      
      {/* Header with Search */}
      <View style={styles.header}>
        {!shouldHideHeader && (
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Products</Text>
            <Text style={styles.productCount}>{filteredItems.length} items</Text>
          </View>
        )}
        <View style={[styles.headerRight, shouldHideHeader && styles.headerRightExpanded]}>
          <SearchBar
            isExpanded={searchExpanded}
            onToggle={handleSearchToggle}
            onSearch={handleSearch}
            currentPage="products"
            products={allProducts}
            categories={state.categories}
            onExpandedChange={handleSearchExpandedChange}
            initialQuery={searchQuery}
          />
          {!shouldHideHeader && (
            <TouchableOpacity style={styles.authButton} onPress={handleAuth}>
              <Ionicons
                name={isAuthenticated ? 'person-circle-outline' : 'log-in-outline'}
                size={24}
                color={COLORS.PRIMARY}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>



      {/* Categories */}
      <View style={styles.categoriesContainer}>
        <FlatList
          data={categories}
          renderItem={renderCategoryItem}
          keyExtractor={(item) => item}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesList}
        />
      </View>

      {/* Show All Products Button - appears when filters/search are active */}
      {(searchQuery.trim() || selectedCategory !== 'All' || selectedPriceRange || selectedRating > 0) && (
        <View style={styles.showAllContainer}>
          <TouchableOpacity
            style={styles.showAllButton}
            onPress={() => {
              setSearchQuery('');
              setSelectedCategory('All');
              setSelectedPriceRange('');
              setSelectedRating(0);
              setSearchExpanded(false);
              setShouldHideHeader(false);
              console.log('🏠 Showing all products - reset filters');
            }}
          >
            <Ionicons name="refresh-outline" size={18} color={COLORS.WHITE} />
            <Text style={styles.showAllText}>Show All Products</Text>
          </TouchableOpacity>
          <Text style={styles.activeFiltersText}>
            {filteredItems.length} of {allProducts.length} items shown
            {searchQuery.trim() && ` • Search: "${searchQuery}"`}
            {selectedCategory !== 'All' && ` • Category: ${selectedCategory}`}
            {selectedPriceRange && ` • Price filter`}
            {selectedRating > 0 && ` • Rating: ${selectedRating}+ stars`}
          </Text>
        </View>
      )}

      {/* Controls */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilters(true)}>
          <Ionicons name="filter" size={18} color={COLORS.PRIMARY} />
          <Text style={styles.filterButtonText}>
            Filter {activeFiltersCount > 0 && `(${activeFiltersCount})`}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.sortButton} onPress={() => setShowSortModal(true)}>
          <Ionicons name="swap-vertical" size={18} color={COLORS.PRIMARY} />
          <Text style={styles.sortButtonText}>Sort</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.viewToggle}
          onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
        >
          <Ionicons
            name={viewMode === 'grid' ? 'list' : 'grid'}
            size={18}
            color={COLORS.PRIMARY}
          />
        </TouchableOpacity>
      </View>

      {/* Products/Combo Packs Grid/List */}
      {(state.loading.products || state.loading.comboPacks) ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY} />
          <Text style={styles.loadingText}>Loading items...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          renderItem={renderItemBasedOnType}
          keyExtractor={(item) => item._id || `item-${Math.random()}`}
          numColumns={viewMode === 'grid' ? 2 : 1}
          key={viewMode}
          contentContainerStyle={styles.productsList}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="search" size={64} color={COLORS.GRAY} />
              <Text style={styles.emptyTitle}>No items found</Text>
              <Text style={styles.emptySubtitle}>
                Try adjusting your search or filters
              </Text>
            </View>
          }
        />
      )}

      {/* Variant Popup */}
      <VariantPopup
        isVisible={showVariantPopup}
        product={selectedProduct}
        onClose={() => setShowVariantPopup(false)}
        onAddToCart={handleVariantConfirm}
        onBuyNow={handleVariantBuyNow}
        actionType={variantAction}
      />

      {/* Filter Modal */}
      {renderFilterModal()}

      {/* Sort Modal */}
      {renderSortModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
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
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerRightExpanded: {
    flex: 1,
    justifyContent: 'center',
    gap: 0,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
  },
  productCount: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 2,
  },
  authButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: `${COLORS.PRIMARY}10`,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.WHITE,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: COLORS.TEXT_PRIMARY,
  },
  categoriesContainer: {
    backgroundColor: COLORS.WHITE,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  categoriesList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: COLORS.BACKGROUND,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  categoryItemSelected: {
    backgroundColor: COLORS.PRIMARY,
    borderColor: COLORS.PRIMARY,
  },
  categoryText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.TEXT_PRIMARY,
  },
  categoryTextSelected: {
    color: COLORS.WHITE,
  },
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: COLORS.WHITE,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: COLORS.BACKGROUND,
    marginRight: 8,
  },
  filterButtonText: {
    marginLeft: 4,
    fontSize: 14,
    color: COLORS.PRIMARY,
    fontWeight: '500',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: COLORS.BACKGROUND,
    marginRight: 8,
  },
  sortButtonText: {
    marginLeft: 4,
    fontSize: 14,
    color: COLORS.PRIMARY,
    fontWeight: '500',
  },
  viewToggle: {
    marginLeft: 'auto',
    padding: 6,
    borderRadius: 6,
    backgroundColor: COLORS.BACKGROUND,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.TEXT_SECONDARY,
  },
  productsList: {
    padding: 16,
  },
  gridItem: {
    flex: 1,
    marginHorizontal: 4,
    marginBottom: 16,
  },
  listItem: {
    marginBottom: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 8,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.WHITE,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  filterSection: {
    marginVertical: 24,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 16,
  },
  filterOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  filterOptionText: {
    fontSize: 14,
    color: COLORS.TEXT_PRIMARY,
  },
  filterOptionTextSelected: {
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingStars: {
    flexDirection: 'row',
    marginRight: 8,
  },
  ratingText: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
  },
  clearFiltersButton: {
    flex: 1,
    paddingVertical: 12,
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: COLORS.BACKGROUND,
    alignItems: 'center',
  },
  clearFiltersText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  applyFiltersButton: {
    flex: 1,
    paddingVertical: 12,
    marginLeft: 8,
    borderRadius: 8,
    backgroundColor: COLORS.PRIMARY,
    alignItems: 'center',
  },
  applyFiltersText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.WHITE,
  },
  
  // Show All Products button styles
  showAllContainer: {
    backgroundColor: COLORS.WHITE,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  showAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.PRIMARY,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 8,
    gap: 8,
  },
  showAllText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.WHITE,
  },
  activeFiltersText: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 16,
  },
});
