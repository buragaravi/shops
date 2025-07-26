import React, { useState, useEffect } from 'react';
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
  Image,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { API_BASE_URL, API_ENDPOINTS } from '../../constants';
import SearchWithSuggestions from '../../components/ui/SearchWithSuggestions';
import ProductCard from '../../components/product/ProductCard';
import ComboPackCard from '../../components/product/ComboPackCard';
import VariantPopup from '../../components/VariantPopup';
import TokenStorage from '../../utils/tokenStorage';

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

export default function ProductListScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // URL params
  const initialCategory = params.category as string;
  const initialSearch = params.search as string;

  // State
  const [products, setProducts] = useState<any[]>([]);
  const [comboPacks, setComboPacks] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Filter states
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedPriceRange, setSelectedPriceRange] = useState<string>('');
  const [selectedRating, setSelectedRating] = useState<number>(0);
  const [selectedSort, setSelectedSort] = useState<string>('featured');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter modal states
  const [showFilters, setShowFilters] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  
  // Layout state
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Wishlist state
  const [wishlistItems, setWishlistItems] = useState<string[]>([]);
  
  // Variant popup state
  const [showVariantPopup, setShowVariantPopup] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [variantAction, setVariantAction] = useState<'cart' | 'buy'>('cart');
  
  // All available categories
  const [allCategories, setAllCategories] = useState<string[]>([]);

  // Initialize filters from URL params
  useEffect(() => {
    if (initialCategory) {
      setSelectedCategories([initialCategory]);
    }
    if (initialSearch) {
      setSearchQuery(initialSearch);
    }
  }, [initialCategory, initialSearch]);
  
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

  // Fetch products and combo packs
  const fetchProducts = async () => {
    try {
      const [productsResponse, comboResponse] = await Promise.all([
        fetch(`${API_BASE_URL}${API_ENDPOINTS.PRODUCTS.ALL}`),
        fetch(`${API_BASE_URL}${API_ENDPOINTS.COMBO_PACKS.ALL}`)
      ]);

      if (!productsResponse.ok || !comboResponse.ok) {
        throw new Error('Failed to fetch data');
      }

      const productsData = await productsResponse.json();
      const comboData = await comboResponse.json();

      const productsArray = productsData.products || productsData || [];
      const comboArray = comboData.comboPacks || comboData || [];

      setProducts(productsArray);
      setComboPacks(comboArray);

      // Extract all unique categories
      const categories = new Set<string>();
      [...productsArray, ...comboArray].forEach((item: any) => {
        if (item.category) {
          categories.add(item.category);
        }
      });
      setAllCategories(Array.from(categories).sort());

    } catch (error) {
      console.error('Error fetching data:', error);
      Alert.alert('Error', 'Failed to load products. Please try again.');
    }
  };

  // Get category matches (including partial matches like electronics & electricals)
  const getCategoryMatches = (categories: string[], selectedCategories: string[]): string[] => {
    if (selectedCategories.length === 0) return categories;
    
    const matches = new Set<string>();
    
    selectedCategories.forEach(selectedCat => {
      const selectedLower = selectedCat.toLowerCase();
      
      categories.forEach(category => {
        const categoryLower = category.toLowerCase();
        
        // Direct match
        if (categoryLower === selectedLower) {
          matches.add(category);
          return;
        }
        
        // Partial word matches - split by common separators
        const selectedWords = selectedLower.split(/[\s&,\-_]+/).filter(word => word.length > 0);
        const categoryWords = categoryLower.split(/[\s&,\-_]+/).filter(word => word.length > 0);
        
        // Check if any word from selected category matches any word from actual category
        const hasWordMatch = selectedWords.some(selectedWord => 
          categoryWords.some(categoryWord => 
            // Exact word match
            categoryWord === selectedWord ||
            // One word contains the other (for partial matches)
            categoryWord.includes(selectedWord) || 
            selectedWord.includes(categoryWord)
          )
        );
        
        // Also check if the selected category is contained in the category name or vice versa
        const hasSubstringMatch = categoryLower.includes(selectedLower) || selectedLower.includes(categoryLower);
        
        if (hasWordMatch || hasSubstringMatch) {
          matches.add(category);
        }
      });
    });
    
    return Array.from(matches);
  };

  // Apply filters
  const applyFilters = () => {
    let filtered: any[] = [...products, ...comboPacks];

    // Category filter with partial matching
    if (selectedCategories.length > 0) {
      const matchingCategories = getCategoryMatches(allCategories, selectedCategories);
      filtered = filtered.filter((item: any) => 
        matchingCategories.includes(item.category)
      );
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((item: any) => {
        const name = (item.name || '').toLowerCase();
        const description = (item.description || '').toLowerCase();
        const category = (item.category || '').toLowerCase();
        
        return name.includes(query) || 
               description.includes(query) || 
               category.includes(query);
      });
    }

    // Price filter
    if (selectedPriceRange) {
      const range = priceRanges.find(r => r.id === selectedPriceRange)?.value;
      if (range && range.min !== undefined && range.max !== undefined) {
        filtered = filtered.filter((item: any) => {
          const price = item.price || item.discountedPrice || item.comboPrice || item.salePrice || 0;
          return price >= range.min && price <= range.max;
        });
      }
    }

    // Rating filter
    if (selectedRating > 0) {
      filtered = filtered.filter((item: any) => (item.rating || 0) >= selectedRating);
    }

    // Sort
    filtered.sort((a: any, b: any) => {
      switch (selectedSort) {
        case 'price-asc':
          const priceA = a.price || a.discountedPrice || a.comboPrice || a.salePrice || 0;
          const priceB = b.price || b.discountedPrice || b.comboPrice || b.salePrice || 0;
          return priceA - priceB;
        case 'price-desc':
          const priceA2 = a.price || a.discountedPrice || a.comboPrice || a.salePrice || 0;
          const priceB2 = b.price || b.discountedPrice || b.comboPrice || b.salePrice || 0;
          return priceB2 - priceA2;
        case 'rating-desc':
          return (b.rating || 0) - (a.rating || 0);
        case 'name-asc':
          return (a.name || '').localeCompare(b.name || '');
        case 'newest':
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        default:
          return 0;
      }
    });

    setFilteredProducts(filtered);
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [products, comboPacks, selectedCategories, selectedPriceRange, selectedRating, selectedSort, searchQuery]);

  const fetchAllData = async () => {
    setLoading(true);
    await fetchProducts();
    setLoading(false);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAllData().finally(() => setRefreshing(false));
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSelectedCategories([]);
    setSelectedPriceRange('');
    setSelectedRating(0);
    setSelectedSort('featured');
    setSearchQuery('');
  };

  // Get active filter count
  const getActiveFilterCount = () => {
    let count = 0;
    if (selectedCategories.length > 0) count++;
    if (selectedPriceRange) count++;
    if (selectedRating > 0) count++;
    if (searchQuery.trim()) count++;
    return count;
  };

  // Get header title based on filters
  const getHeaderTitle = () => {
    if (selectedCategories.length === 1) {
      return selectedCategories[0];
    } else if (selectedCategories.length > 1) {
      return `${selectedCategories.length} Categories`;
    } else if (searchQuery.trim()) {
      return `Search: ${searchQuery}`;
    }
    return 'Products';
  };

  // Render product card
  const renderProductCard = ({ item }: { item: any }) => {
    const isCombo = item.discountedPrice !== undefined || item.comboPrice !== undefined;
    const price = item.price || item.discountedPrice || item.comboPrice || item.salePrice || 0;
    const originalPrice = item.originalPrice;
    const discount = originalPrice && originalPrice > price 
      ? Math.round(((originalPrice - price) / originalPrice) * 100) 
      : 0;

    if (viewMode === 'list') {
      return (
        <TouchableOpacity 
          style={styles.listCard}
          onPress={() => router.push(isCombo ? `/combo/${item.id || item._id}` : `/product/${item.id || item._id}`)}
        >
          <View style={styles.listImageContainer}>
            {item.images && item.images.length > 0 ? (
              <Image source={{ uri: item.images[0] }} style={styles.listImage} resizeMode="cover" />
            ) : (
              <Ionicons name={isCombo ? "cube" : "image"} size={24} color="#9ca3af" />
            )}
            {isCombo && (
              <View style={styles.comboBadgeSmall}>
                <Text style={styles.comboBadgeTextSmall}>COMBO</Text>
              </View>
            )}
          </View>
          
          <View style={styles.listContent}>
            <Text style={styles.listProductName} numberOfLines={2}>
              {item.name || item.title || (isCombo ? 'Combo Pack' : 'Product')}
            </Text>
            <Text style={styles.listCategory} numberOfLines={1}>
              {item.category || 'Category'}
            </Text>
            
            <View style={styles.listPriceContainer}>
              <Text style={styles.listPrice}>₹{price}</Text>
              {originalPrice && originalPrice > price && (
                <Text style={styles.listOriginalPrice}>₹{originalPrice}</Text>
              )}
              {discount > 0 && (
                <Text style={styles.listDiscount}>{discount}% OFF</Text>
              )}
            </View>
            
            <View style={styles.listRatingContainer}>
              <Ionicons name="star" size={12} color="#f59e0b" />
              <Text style={styles.listRating}>{item.rating || '4.0'}</Text>
            </View>
          </View>
          
          <TouchableOpacity style={styles.listAddButton}>
            <Ionicons name="add" size={20} color="#ffffff" />
          </TouchableOpacity>
        </TouchableOpacity>
      );
    }

    // For grid view, use the new ProductCard or ComboPackCard components
    if (isCombo) {
      return (
        <ComboPackCard
          comboPack={item}
          onPress={(comboPack) => router.push(`/combo/${comboPack._id}`)}
          isWishlisted={wishlistItems.includes(item._id)}
          onWishlistUpdate={handleWishlistUpdate}
          onCartUpdate={fetchWishlistAndCart}
        />
      );
    }

    return (
      <ProductCard
        product={item}
        onPress={(product) => router.push(`/product/${product._id}`)}
        isWishlisted={wishlistItems.includes(item._id)}
        onWishlistUpdate={handleWishlistUpdate}
        onCartUpdate={fetchWishlistAndCart}
        onVariantSelect={handleVariantSelect}
      />
    );
  };

  // Variant selection handler
  const handleVariantSelect = (product: any, actionType: 'cart' | 'buy') => {
    setSelectedProduct(product);
    setVariantAction(actionType);
    setShowVariantPopup(true);
  };

  // Handle add to cart with variant
  const handleAddToCartWithVariant = async (productId: string, quantity: number, selectedVariant: any) => {
    try {
      const token = await TokenStorage.getToken();
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.CART.ADD}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          productId,
          quantity,
          variantId: selectedVariant._id
        })
      });

      if (response.ok) {
        Alert.alert('Success', 'Added to cart successfully!');
        fetchWishlistAndCart();
      } else {
        throw new Error('Failed to add to cart');
      }
    } catch (error) {
      console.error('Cart error:', error);
      Alert.alert('Error', 'Failed to add to cart');
    }
  };

  // Handle buy now with variant
  const handleBuyNowWithVariant = (productId: string, quantity: number, selectedVariant: any) => {
    router.push(`/checkout?product=${productId}&quantity=${quantity}&variantId=${selectedVariant._id}`);
  };

  // Wishlist handlers
  const handleWishlistUpdate = (productId: string, isWishlisted: boolean) => {
    if (isWishlisted) {
      setWishlistItems(prev => [...prev, productId]);
    } else {
      setWishlistItems(prev => prev.filter(id => id !== productId));
    }
  };

  const fetchWishlistAndCart = async () => {
    // Add wishlist fetching logic here if needed
    console.log('Refreshing wishlist and cart');
  };

  // Render filter modal
  const renderFilterModal = () => (
    <Modal
      visible={showFilters}
      animationType="slide"
      transparent={false}
      onRequestClose={() => setShowFilters(false)}
    >
      <SafeAreaView style={styles.filterModalContainer}>
        <View style={styles.filterHeader}>
          <TouchableOpacity onPress={() => setShowFilters(false)}>
            <Ionicons name="close" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.filterTitle}>Filters</Text>
          <TouchableOpacity onPress={clearAllFilters}>
            <Text style={styles.clearAllText}>Clear All</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.filterContent}>
          {/* Categories */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Categories</Text>
            <View style={styles.categoriesGrid}>
              {allCategories.map(category => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryChip,
                    selectedCategories.includes(category) && styles.categoryChipSelected
                  ]}
                  onPress={() => {
                    if (selectedCategories.includes(category)) {
                      setSelectedCategories(selectedCategories.filter(c => c !== category));
                    } else {
                      setSelectedCategories([...selectedCategories, category]);
                    }
                  }}
                >
                  <Text style={[
                    styles.categoryChipText,
                    selectedCategories.includes(category) && styles.categoryChipTextSelected
                  ]}>
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Price Range */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Price Range</Text>
            {priceRanges.map(range => (
              <TouchableOpacity
                key={range.id}
                style={styles.filterOption}
                onPress={() => setSelectedPriceRange(range.id === 'all' ? '' : range.id)}
              >
                <View style={styles.filterOptionContent}>
                  <Text style={styles.filterOptionText}>{range.label}</Text>
                  <View style={[
                    styles.radioButton,
                    (selectedPriceRange === range.id || (selectedPriceRange === '' && range.id === 'all')) && styles.radioButtonSelected
                  ]} />
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Rating */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Minimum Rating</Text>
            {[4, 3, 2, 1].map(rating => (
              <TouchableOpacity
                key={rating}
                style={styles.filterOption}
                onPress={() => setSelectedRating(selectedRating === rating ? 0 : rating)}
              >
                <View style={styles.filterOptionContent}>
                  <View style={styles.ratingOption}>
                    {[...Array(5)].map((_, index) => (
                      <Ionicons
                        key={index}
                        name="star"
                        size={16}
                        color={index < rating ? "#f59e0b" : "#e5e7eb"}
                        style={styles.ratingStarIcon}
                      />
                    ))}
                    <Text style={styles.ratingText}>& up</Text>
                  </View>
                  <View style={[
                    styles.radioButton,
                    selectedRating === rating && styles.radioButtonSelected
                  ]} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <View style={styles.filterFooter}>
          <TouchableOpacity
            style={styles.applyFiltersButton}
            onPress={() => setShowFilters(false)}
          >
            <Text style={styles.applyFiltersText}>
              Apply Filters ({filteredProducts.length} results)
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#22c55e" />
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{getHeaderTitle()}</Text>
        <TouchableOpacity onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}>
          <Ionicons name={viewMode === 'grid' ? 'list' : 'grid'} size={24} color="#1f2937" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <SearchWithSuggestions
          products={products}
          comboPacks={comboPacks}
          categories={allCategories}
          onSearch={setSearchQuery}
          placeholder="Search products and categories..."
        />
      </View>

      {/* Filter and Sort Bar */}
      <View style={styles.filterSortBar}>
        <TouchableOpacity 
          style={styles.filterButton} 
          onPress={() => setShowFilters(true)}
        >
          <Ionicons name="filter" size={16} color="#6b7280" />
          <Text style={styles.filterButtonText}>Filter</Text>
          {getActiveFilterCount() > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{getActiveFilterCount()}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.sortButton}
          onPress={() => setShowSortModal(true)}
        >
          <Ionicons name="swap-vertical" size={16} color="#6b7280" />
          <Text style={styles.sortButtonText}>
            {sortOptions.find(opt => opt.value === selectedSort)?.label || 'Sort'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Results Count */}
      <View style={styles.resultsHeader}>
        <View style={styles.resultsTextContainer}>
          <Text style={styles.resultsText}>
            {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} found
          </Text>
          {(selectedCategories.length > 0 || searchQuery.trim()) && (
            <View style={styles.activeFiltersContainer}>
              {selectedCategories.map(category => (
                <View key={category} style={styles.activeFilterChip}>
                  <Text style={styles.activeFilterText}>{category}</Text>
                  <TouchableOpacity 
                    onPress={() => setSelectedCategories(selectedCategories.filter(c => c !== category))}
                    style={styles.removeFilterButton}
                  >
                    <Ionicons name="close" size={12} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              ))}
              {searchQuery.trim() && (
                <View style={styles.activeFilterChip}>
                  <Text style={styles.activeFilterText}>"{searchQuery}"</Text>
                  <TouchableOpacity 
                    onPress={() => setSearchQuery('')}
                    style={styles.removeFilterButton}
                  >
                    <Ionicons name="close" size={12} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>
        {(selectedCategories.length > 0 || searchQuery.trim()) && (
          <TouchableOpacity onPress={clearAllFilters}>
            <Text style={styles.clearFiltersText}>Clear all</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Products List */}
      <FlatList
        data={filteredProducts}
        renderItem={renderProductCard}
        keyExtractor={(item) => `${item.id || item._id}-${item.discountedPrice ? 'combo' : 'product'}`}
        numColumns={viewMode === 'grid' ? 2 : 1}
        key={viewMode} // Force re-render when view mode changes
        contentContainerStyle={styles.productsList}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="search" size={48} color="#9ca3af" />
            <Text style={styles.emptyTitle}>No products found</Text>
            <Text style={styles.emptySubtitle}>Try adjusting your filters or search terms</Text>
            <TouchableOpacity style={styles.clearFiltersButton} onPress={clearAllFilters}>
              <Text style={styles.clearFiltersButtonText}>Clear Filters</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Filter Modal */}
      {renderFilterModal()}

      {/* Sort Modal */}
      <Modal
        visible={showSortModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSortModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSortModal(false)}
        >
          <View style={styles.sortModalContainer}>
            <Text style={styles.sortModalTitle}>Sort by</Text>
            {sortOptions.map(option => (
              <TouchableOpacity
                key={option.id}
                style={styles.sortOption}
                onPress={() => {
                  setSelectedSort(option.value);
                  setShowSortModal(false);
                }}
              >
                <Text style={[
                  styles.sortOptionText,
                  selectedSort === option.value && styles.sortOptionTextSelected
                ]}>
                  {option.label}
                </Text>
                {selectedSort === option.value && (
                  <Ionicons name="checkmark" size={20} color="#22c55e" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Variant Selection Popup */}
      <VariantPopup
        isVisible={showVariantPopup}
        onClose={() => {
          setShowVariantPopup(false);
          setSelectedProduct(null);
        }}
        product={selectedProduct}
        onAddToCart={handleAddToCartWithVariant}
        onBuyNow={handleBuyNowWithVariant}
        actionType={variantAction}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  // Header styles
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 10,
  },
  
  // Search styles
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  
  // Filter and sort bar
  filterSortBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    marginRight: 12,
    position: 'relative',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 4,
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    flex: 1,
  },
  sortButtonText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 4,
  },
  
  // Results header
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#f9fafb',
  },
  resultsTextContainer: {
    flex: 1,
  },
  resultsText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  activeFiltersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22c55e',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeFilterText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
    marginRight: 4,
  },
  removeFilterButton: {
    padding: 2,
  },
  clearFiltersText: {
    fontSize: 14,
    color: '#22c55e',
    fontWeight: '600',
  },
  
  // Product list styles
  productsList: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  
  // Grid view styles
  gridCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  gridImageContainer: {
    height: 120,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  gridImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  gridProductName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 4,
    minHeight: 36,
  },
  gridPriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  gridPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#22c55e',
  },
  gridOriginalPrice: {
    fontSize: 12,
    color: '#9ca3af',
    textDecorationLine: 'line-through',
    marginLeft: 8,
  },
  gridRatingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gridRating: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 4,
  },
  gridAddButton: {
    backgroundColor: '#22c55e',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // List view styles
  listCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  listImageContainer: {
    width: 80,
    height: 80,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    position: 'relative',
  },
  listImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  listContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  listProductName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  listCategory: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  listPriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  listPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#22c55e',
  },
  listOriginalPrice: {
    fontSize: 14,
    color: '#9ca3af',
    textDecorationLine: 'line-through',
    marginLeft: 8,
  },
  listDiscount: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: '600',
    marginLeft: 8,
  },
  listRatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listRating: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 4,
  },
  listAddButton: {
    backgroundColor: '#22c55e',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  
  // Badge styles
  comboBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  comboBadgeText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: 'bold',
  },
  comboBadgeSmall: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
  },
  comboBadgeTextSmall: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: 'bold',
  },
  discountBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#ef4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  discountText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: 'bold',
  },
  
  // Filter modal styles
  filterModalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  filterTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  clearAllText: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '600',
  },
  filterContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  filterSection: {
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f3f4f6',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  categoryChipSelected: {
    backgroundColor: '#dcfce7',
    borderColor: '#22c55e',
  },
  categoryChipText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  categoryChipTextSelected: {
    color: '#22c55e',
  },
  filterOption: {
    paddingVertical: 12,
  },
  filterOptionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterOptionText: {
    fontSize: 14,
    color: '#1f2937',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  radioButtonSelected: {
    borderColor: '#22c55e',
    backgroundColor: '#22c55e',
  },
  ratingOption: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingStarIcon: {
    marginRight: 2,
  },
  ratingText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 4,
  },
  filterFooter: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  applyFiltersButton: {
    backgroundColor: '#22c55e',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  applyFiltersText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Sort modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sortModalContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  sortModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 20,
    textAlign: 'center',
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  sortOptionText: {
    fontSize: 16,
    color: '#1f2937',
  },
  sortOptionTextSelected: {
    color: '#22c55e',
    fontWeight: '600',
  },
  
  // Empty state styles
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  clearFiltersButton: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  clearFiltersButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  
  // Loading styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
});
