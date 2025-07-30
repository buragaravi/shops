import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  FlatList,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS } from '../constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SearchService } from '../services/searchService';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface SearchSuggestion {
  id: string;
  text: string;
  type: 'category' | 'product';
  data?: any;
}

interface SearchBarProps {
  isExpanded: boolean;
  onToggle: () => void;
  onSearch: (query: string) => void;
  currentPage: 'home' | 'products' | 'product-detail' | 'combopack-detail';
  products?: any[]; // Current products data
  categories?: string[]; // Available categories
  defaultCategories?: string[]; // Default categories to use if products not loaded
  onExpandedChange?: (expanded: boolean) => void; // NEW: Callback for expanded state changes
  initialQuery?: string; // NEW: Initial search query from parent
}

const SEARCH_HISTORY_KEY = 'search_history';
const MAX_HISTORY_ITEMS = 5;

export default function SearchBar({
  isExpanded,
  onToggle,
  onSearch,
  currentPage,
  products = [],
  categories = [],
  defaultCategories = ['Electronics', 'Beverages', 'Snacks', 'Accessories', 'Combo Packs'],
  onExpandedChange,
  initialQuery = ''
}: SearchBarProps) {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [combinedSuggestions, setCombinedSuggestions] = useState<SearchSuggestion[]>([]);
  
  const router = useRouter();
  const searchInputRef = useRef<TextInput>(null);
  const animatedWidth = useRef(new Animated.Value(40)).current;
  const animatedOpacity = useRef(new Animated.Value(0)).current;
  const debounceTimer = useRef<number | null>(null);

  useEffect(() => {
    loadSearchHistory();
  }, []);

  // Handle initial query changes from parent
  useEffect(() => {
    if (initialQuery && initialQuery !== searchQuery) {
      setSearchQuery(initialQuery);
      console.log('🔍 SearchBar received initial query:', initialQuery);
    }
  }, [initialQuery]);

  useEffect(() => {
    // Animate search bar expansion/collapse
    Animated.parallel([
      Animated.timing(animatedWidth, {
        toValue: isExpanded ? screenWidth - 80 : 40,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(animatedOpacity, {
        toValue: isExpanded ? 1 : 0,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start();

    if (isExpanded) {
      setTimeout(() => searchInputRef.current?.focus(), 350);
    }
  }, [isExpanded]);

  useEffect(() => {
    // Handle search query changes with debouncing
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (searchQuery.trim()) {
      setShowSuggestions(true);
      // Clear any existing suggestions before generating new ones
      setCombinedSuggestions([]);
      // Note: Suggestions are now handled in the separate useEffect below
    } else {
      setShowSuggestions(false);
      setCombinedSuggestions([]);
    }

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [searchQuery]); // Only searchQuery as dependency

  useEffect(() => {
    // Combine history and live suggestions
    if (searchQuery.trim()) {
      // Add a small delay to ensure previous suggestions are cleared
      const timer = setTimeout(() => {
        const historySuggestions: SearchSuggestion[] = searchHistory
          .filter(item => item.toLowerCase().includes(searchQuery.toLowerCase()))
          .slice(0, 3)
          .map((item, index) => ({
            id: `history-${index}`,
            text: item,
            type: 'product' as const,
          }));

        // Get frontend suggestions - only use if we have data
        if (products.length > 0 || categories.length > 0) {
          const availableCategories = categories.length > 0 ? categories : defaultCategories;
          const frontendSuggestions = SearchService.getSuggestions(searchQuery, products, availableCategories);

          const combined = [...historySuggestions, ...frontendSuggestions.slice(0, 5)]; // Reduced from 7 to 5
          setCombinedSuggestions(combined.slice(0, 6)); // Reduced from 10 to 6 for better mobile UX
        } else {
          // If no data available, just show history
          setCombinedSuggestions(historySuggestions);
        }
      }, 50); // Small delay to ensure clean state

      return () => clearTimeout(timer);
    } else {
      setCombinedSuggestions([]);
    }
  }, [searchHistory, searchQuery]); // Removed products and categories from dependencies temporarily

  const loadSearchHistory = async () => {
    try {
      const history = await AsyncStorage.getItem(SEARCH_HISTORY_KEY);
      if (history) {
        setSearchHistory(JSON.parse(history));
      }
    } catch (error) {
      console.error('Error loading search history:', error);
    }
  };

  const saveToSearchHistory = async (query: string) => {
    try {
      const newHistory = [query, ...searchHistory.filter(item => item !== query)]
        .slice(0, MAX_HISTORY_ITEMS);
      setSearchHistory(newHistory);
      await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory));
    } catch (error) {
      console.error('Error saving search history:', error);
    }
  };

  const handleSearch = (query: string) => {
    if (!query.trim()) return;

    // Clear ALL suggestions immediately to prevent stale results
    setCombinedSuggestions([]);
    setShowSuggestions(false);

    // Save to history
    saveToSearchHistory(query.trim());
    
    // Call the search handler
    onSearch(query.trim());
    
    // Navigate to products page if not already there
    if (currentPage !== 'products') {
      router.push(`/(tabs)/products?search=${encodeURIComponent(query.trim())}`);
    }
    
    // Close suggestions and collapse search bar
    Keyboard.dismiss();
    
    // Additional cleanup after a short delay to ensure state is cleared
    setTimeout(() => {
      setCombinedSuggestions([]);
      setShowSuggestions(false);
    }, 100);
  };

  const handleSuggestionPress = (suggestion: SearchSuggestion) => {
    // Clear suggestions immediately when a suggestion is selected
    setCombinedSuggestions([]);
    setShowSuggestions(false);
    
    setSearchQuery(suggestion.text);
    handleSearch(suggestion.text);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setCombinedSuggestions([]); // Clear suggestions
    setShowSuggestions(false);
    searchInputRef.current?.blur();
    // Notify parent to clear search
    onSearch('');
  };

  const handleToggle = () => {
    if (isExpanded && searchQuery) {
      // If expanded and has text, perform search
      handleSearch(searchQuery);
    } else {
      // Toggle expansion
      onToggle();
      // Notify parent about expansion change
      onExpandedChange?.(!isExpanded);
      
      // If collapsing, clear suggestions
      if (isExpanded) {
        setCombinedSuggestions([]);
        setShowSuggestions(false);
      }
    }
  };

  const handleClose = () => {
    // Close button should just close, not search
    onToggle();
    onExpandedChange?.(false);
    setCombinedSuggestions([]);
    setShowSuggestions(false);
    clearSearch();
  };

  // Notify parent when expansion state changes
  useEffect(() => {
    onExpandedChange?.(isExpanded);
  }, [isExpanded, onExpandedChange]);

  const renderSuggestion = ({ item }: { item: SearchSuggestion }) => (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={() => handleSuggestionPress(item)}
    >
      <Ionicons
        name={item.type === 'category' ? 'grid-outline' : 'search-outline'}
        size={16}
        color={COLORS.TEXT_SECONDARY}
        style={styles.suggestionIcon}
      />
      <Text style={styles.suggestionText}>{item.text}</Text>
      <Text style={styles.suggestionType}>
        {item.type === 'category' ? 'Category' : 'Product'}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.searchContainer, { width: animatedWidth }]}>
        {!isExpanded ? (
          // Collapsed state - just the search icon
          <TouchableOpacity style={styles.searchIcon} onPress={handleToggle}>
            <Ionicons name="search" size={24} color={COLORS.PRIMARY} />
          </TouchableOpacity>
        ) : (
          // Expanded state - full search input
          <View style={styles.expandedSearch}>
            <View style={styles.searchInputContainer}>
              <Ionicons name="search" size={20} color={COLORS.GRAY} style={styles.inputIcon} />
              <Animated.View style={[styles.inputWrapper, { opacity: animatedOpacity }]}>
                <TextInput
                  ref={searchInputRef}
                  style={styles.searchInput}
                  placeholder="Search for products..."
                  placeholderTextColor={COLORS.TEXT_SECONDARY}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onSubmitEditing={() => handleSearch(searchQuery)}
                  returnKeyType="search"
                />
              </Animated.View>
              {searchQuery ? (
                <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
                  <Ionicons name="close-circle" size={20} color={COLORS.GRAY} />
                </TouchableOpacity>
              ) : null}
            </View>
            
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={20} color={COLORS.TEXT_SECONDARY} />
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>

      {/* Search Suggestions */}
      {showSuggestions && isExpanded && combinedSuggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <FlatList
            data={combinedSuggestions}
            renderItem={renderSuggestion}
            keyExtractor={(item) => item.id}
            style={styles.suggestionsList}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1000,
  },
  searchContainer: {
    height: 40,
    justifyContent: 'center',
  },
  searchIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.WHITE,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  expandedSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.WHITE,
    borderRadius: 25,
    paddingHorizontal: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputIcon: {
    marginRight: 8,
  },
  inputWrapper: {
    flex: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.TEXT_PRIMARY,
    paddingVertical: 8,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  closeButton: {
    padding: 8,
    marginLeft: 8,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: 45,
    left: 0,
    right: 0,
    backgroundColor: COLORS.WHITE,
    borderRadius: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    maxHeight: 200, // Fixed reasonable height instead of screen percentage
    zIndex: 1001,
  },
  suggestionsList: {
    paddingVertical: 4, // Reduced from 8 to 4
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8, // Reduced from 12 to 8
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  suggestionIcon: {
    marginRight: 12,
  },
  suggestionText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.TEXT_PRIMARY,
  },
  suggestionType: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
    backgroundColor: COLORS.GRAY_LIGHT,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
});
