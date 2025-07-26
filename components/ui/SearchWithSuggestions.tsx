import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Dimensions,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const { width: screenWidth } = Dimensions.get('window');

interface SearchSuggestion {
  id: string;
  type: 'product' | 'combo' | 'category';
  title: string;
  subtitle?: string;
  image?: string;
  category?: string;
  data?: any;
}

interface SearchWithSuggestionsProps {
  products: any[];
  comboPacks: any[];
  categories: string[];
  onSearch: (query: string) => void;
  placeholder?: string;
  style?: any;
}

const SearchWithSuggestions: React.FC<SearchWithSuggestionsProps> = ({
  products,
  comboPacks,
  categories,
  onSearch,
  placeholder = "Search products, categories...",
  style,
}) => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<TextInput>(null);

  // Enhanced search function with better matching
  const searchItems = (query: string, items: any[], type: 'product' | 'combo') => {
    if (!query.trim()) return [];
    
    const queryLower = query.toLowerCase().trim();
    const queryWords = queryLower.split(/\s+/).filter(word => word.length > 0);
    
    const results = items.map(item => {
      const name = (item.name || '').toLowerCase();
      const description = (item.description || '').toLowerCase();
      const category = (item.category || '').toLowerCase();
      const searchText = `${name} ${description} ${category}`.toLowerCase();
      
      let score = 0;
      
      // Exact name match (highest priority)
      if (name === queryLower) {
        score += 100;
      }
      // Name starts with query
      else if (name.startsWith(queryLower)) {
        score += 90;
      }
      // Name contains query
      else if (name.includes(queryLower)) {
        score += 80;
      }
      
      // Check individual words
      queryWords.forEach(word => {
        if (word.length >= 2) {
          // Name contains word
          if (name.includes(word)) {
            score += 30;
          }
          // Description contains word
          if (description.includes(word)) {
            score += 20;
          }
          // Category contains word
          if (category.includes(word)) {
            score += 25;
          }
        }
      });
      
      // Check for partial word matches (fuzzy matching)
      const allWords = searchText.split(/\s+/);
      queryWords.forEach(queryWord => {
        allWords.forEach(itemWord => {
          if (itemWord.length >= 3 && queryWord.length >= 3) {
            // Check if query word is contained in item word or vice versa
            if (itemWord.includes(queryWord) || queryWord.includes(itemWord)) {
              score += 10;
            }
            // Check for similar words (simple similarity)
            if (getSimilarity(queryWord, itemWord) > 0.7) {
              score += 15;
            }
          }
        });
      });
      
      return { item, score, type };
    }).filter(result => result.score > 0);
    
    return results;
  };

  // Simple string similarity function
  const getSimilarity = (str1: string, str2: string): number => {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = getEditDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  };

  // Calculate edit distance (Levenshtein distance)
  const getEditDistance = (str1: string, str2: string): number => {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  };

  // Function to get category matches (including partial matches)
  const getCategoryMatches = (query: string): string[] => {
    const queryLower = query.toLowerCase().trim();
    const queryWords = queryLower.split(/\s+/).filter(word => word.length > 0);
    const matchedCategories = new Set<string>();

    categories.forEach(category => {
      const categoryLower = category.toLowerCase();
      let score = 0;
      
      // Direct match
      if (categoryLower.includes(queryLower)) {
        score += 50;
      }
      
      // Word matches
      const categoryWords = categoryLower.split(/[\s&,\-_]+/).filter(word => word.length > 0);
      
      queryWords.forEach(queryWord => {
        categoryWords.forEach(categoryWord => {
          if (categoryWord === queryWord) {
            score += 30;
          } else if (categoryWord.includes(queryWord) || queryWord.includes(categoryWord)) {
            score += 20;
          } else if (getSimilarity(queryWord, categoryWord) > 0.7) {
            score += 15;
          }
        });
      });
      
      if (score > 0) {
        matchedCategories.add(category);
      }
    });

    return Array.from(matchedCategories);
  };

  // Enhanced suggestion generation
  const generateSuggestions = (query: string) => {
    if (query.trim().length < 1) {
      setSuggestions([]);
      return;
    }

    const queryLower = query.toLowerCase().trim();
    const newSuggestions: SearchSuggestion[] = [];

    // Search in categories first
    const matchedCategories = getCategoryMatches(query);
    matchedCategories.forEach(category => {
      newSuggestions.push({
        id: `category-${category}`,
        type: 'category',
        title: category,
        subtitle: 'Category',
        category: category,
      });
    });

    // Search in products with scoring
    const productResults = searchItems(query, products, 'product');
    productResults
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .forEach(result => {
        const product = result.item;
        newSuggestions.push({
          id: `product-${product.id || product._id}`,
          type: 'product',
          title: product.name || 'Product',
          subtitle: `₹${product.price || product.salePrice || '0'} • ${product.category || 'Product'}`,
          image: product.images?.[0],
          category: product.category,
          data: product,
        });
      });

    // Search in combo packs with scoring
    const comboResults = searchItems(query, comboPacks, 'combo');
    comboResults
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .forEach(result => {
        const combo = result.item;
        newSuggestions.push({
          id: `combo-${combo.id || combo._id}`,
          type: 'combo',
          title: combo.name || 'Combo Pack',
          subtitle: `₹${combo.discountedPrice || combo.comboPrice || combo.price || '0'} • Combo Pack`,
          image: combo.images?.[0] || combo.mainImage,
          category: combo.category,
          data: combo,
        });
      });

    // Limit total suggestions to 8 items
    setSuggestions(newSuggestions.slice(0, 8));
  };

  // Handle search input change
  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    generateSuggestions(text);
    setShowSuggestions(text.length > 0);
  };

  // Handle suggestion selection
  const handleSuggestionPress = (suggestion: SearchSuggestion) => {
    switch (suggestion.type) {
      case 'product':
        router.push(`/product/${suggestion.data.id || suggestion.data._id}`);
        break;
      case 'combo':
        router.push(`/combo/${suggestion.data.id || suggestion.data._id}`);
        break;
      case 'category':
        // Navigate directly to products tab with category parameter
        router.push(`/products?category=${encodeURIComponent(suggestion.category || suggestion.title)}`);
        break;
    }
    
    // Add to recent searches
    const newRecentSearches = [suggestion.title, ...recentSearches.filter(item => item !== suggestion.title)].slice(0, 5);
    setRecentSearches(newRecentSearches);
    
    setSearchQuery(suggestion.title);
    setShowSuggestions(false);
    inputRef.current?.blur();
  };

  // Handle search submit
  const handleSearchSubmit = () => {
    if (searchQuery.trim()) {
      // Navigate directly to products tab with search parameter
      router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      
      // Add to recent searches
      const newRecentSearches = [searchQuery.trim(), ...recentSearches.filter(item => item !== searchQuery.trim())].slice(0, 5);
      setRecentSearches(newRecentSearches);
      
      setShowSuggestions(false);
      inputRef.current?.blur();
    }
  };

  // Handle clear search
  const handleClearSearch = () => {
    setSearchQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
  };

  // Handle input blur
  const handleInputBlur = () => {
    // Add a small delay to allow suggestion press to register
    setTimeout(() => {
      setShowSuggestions(false);
    }, 150);
  };

  // Render suggestion item
  const renderSuggestionItem = ({ item }: { item: SearchSuggestion }) => (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={() => handleSuggestionPress(item)}
    >
      <View style={styles.suggestionContent}>
        {item.type === 'category' ? (
          <View style={[styles.suggestionIcon, { backgroundColor: '#f3f4f6' }]}>
            <Ionicons name="grid" size={20} color="#6b7280" />
          </View>
        ) : (
          <View style={styles.suggestionImageContainer}>
            {item.image ? (
              <Image source={{ uri: item.image }} style={styles.suggestionImage} resizeMode="cover" />
            ) : (
              <View style={[styles.suggestionIcon, { backgroundColor: item.type === 'combo' ? '#ddd6fe' : '#f3f4f6' }]}>
                <Ionicons 
                  name={item.type === 'combo' ? 'cube' : 'image'} 
                  size={20} 
                  color={item.type === 'combo' ? '#8b5cf6' : '#6b7280'} 
                />
              </View>
            )}
          </View>
        )}
        
        <View style={styles.suggestionTextContainer}>
          <Text style={styles.suggestionTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.suggestionSubtitle} numberOfLines={1}>
            {item.subtitle}
          </Text>
        </View>
        
        <View style={styles.suggestionTypeContainer}>
          <View style={[
            styles.typeChip, 
            { 
              backgroundColor: item.type === 'category' ? '#dbeafe' : 
                               item.type === 'combo' ? '#ede9fe' : '#ecfdf5',
              borderColor: item.type === 'category' ? '#3b82f6' : 
                          item.type === 'combo' ? '#8b5cf6' : '#22c55e'
            }
          ]}>
            <Text style={[
              styles.typeChipText,
              { 
                color: item.type === 'category' ? '#3b82f6' : 
                       item.type === 'combo' ? '#8b5cf6' : '#22c55e'
              }
            ]}>
              {item.type === 'category' ? 'Category' : 
               item.type === 'combo' ? 'Combo' : 'Product'}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, style]}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color="#9ca3af" style={styles.searchIcon} />
        <TextInput
          ref={inputRef}
          style={styles.searchInput}
          placeholder={placeholder}
          value={searchQuery}
          onChangeText={handleSearchChange}
          onSubmitEditing={handleSearchSubmit}
          onFocus={() => searchQuery.length > 0 && setShowSuggestions(true)}
          onBlur={handleInputBlur}
          placeholderTextColor="#9ca3af"
          returnKeyType="search"
        />
        
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={handleClearSearch} style={styles.clearButton}>
            <Ionicons name="close-circle" size={18} color="#9ca3af" />
          </TouchableOpacity>
        )}
        
        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="options" size={18} color="#6b7280" />
        </TouchableOpacity>
      </View>

      {/* Suggestions Dropdown - directly below search bar */}
      {showSuggestions && suggestions.length > 0 && (
        <View style={styles.suggestionsDropdown}>
          <FlatList
            data={suggestions}
            renderItem={renderSuggestionItem}
            keyExtractor={(item) => item.id}
            style={styles.suggestionsList}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
  filterButton: {
    marginLeft: 8,
    padding: 4,
  },
  suggestionsDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    maxHeight: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  suggestionsList: {
    paddingVertical: 8,
  },
  suggestionItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  suggestionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  suggestionImageContainer: {
    marginRight: 12,
  },
  suggestionImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  suggestionIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  suggestionTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  suggestionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  suggestionSubtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  suggestionTypeContainer: {
    alignItems: 'flex-end',
  },
  typeChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  typeChipText: {
    fontSize: 10,
    fontWeight: '600',
  },
});

export default SearchWithSuggestions;
