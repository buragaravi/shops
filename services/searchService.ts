import ApiService from './apiService';

export interface SearchSuggestion {
  id: string;
  text: string;
  type: 'category' | 'product';
  data?: any;
}

export interface SearchResult {
  products: any[];
  categories: string[];
  totalCount: number;
}

export class SearchService {
  private static suggestionsCache = new Map<string, SearchSuggestion[]>();
  private static cacheTimeout = 5 * 60 * 1000; // 5 minutes

  /**
   * Get search suggestions from existing products data (frontend-only)
   */
  static getSuggestions(query: string, products: any[], categories: string[]): SearchSuggestion[] {
    if (!query.trim()) return [];

    const queryLower = query.toLowerCase().trim();
    const suggestions: SearchSuggestion[] = [];
    
    // Temporarily disable caching to ensure fresh results
    // TODO: Implement better cache invalidation logic if needed

    // 1. Category suggestions (up to 3)
    const matchingCategories = categories
      .filter(category => 
        category.toLowerCase().includes(queryLower) ||
        queryLower.includes(category.toLowerCase())
      )
      .slice(0, 3);

    matchingCategories.forEach((category, index) => {
      suggestions.push({
        id: `category-${index}`,
        text: category,
        type: 'category',
        data: { category }
      });
    });

    // 2. Product name suggestions (up to 7)
    const matchingProducts = products
      .filter(product => {
        const name = product.name?.toLowerCase() || '';
        const description = product.description?.toLowerCase() || '';
        const category = product.category?.toLowerCase() || '';
        
        return (
          name.includes(queryLower) ||
          description.includes(queryLower) ||
          category.includes(queryLower) ||
          // Also check if query words are in the product
          queryLower.split(' ').some(word => 
            word.length > 2 && (
              name.includes(word) || 
              description.includes(word) ||
              category.includes(word)
            )
          )
        );
      })
      .slice(0, 7);

    matchingProducts.forEach((product, index) => {
      suggestions.push({
        id: `product-${index}`,
        text: product.name,
        type: 'product',
        data: product
      });
    });

    // Sort suggestions by relevance
    const sortedSuggestions = this.sortSuggestionsByRelevance(suggestions, queryLower);
    
    // Temporarily disable caching to ensure fresh results
    // const cacheKey = `${queryLower}_${products.length}_${categories.length}`;
    // this.suggestionsCache.set(cacheKey, sortedSuggestions);
    
    // Clear cache after timeout
    // setTimeout(() => {
    //   this.suggestionsCache.delete(cacheKey);
    // }, this.cacheTimeout);
    
    return sortedSuggestions.slice(0, 6);
  }

  /**
   * Sort suggestions by relevance to the query
   */
  private static sortSuggestionsByRelevance(suggestions: SearchSuggestion[], query: string): SearchSuggestion[] {
    return suggestions.sort((a, b) => {
      const aText = a.text.toLowerCase();
      const bText = b.text.toLowerCase();
      
      // Exact matches first
      if (aText === query) return -1;
      if (bText === query) return 1;
      
      // Starts with query
      if (aText.startsWith(query) && !bText.startsWith(query)) return -1;
      if (bText.startsWith(query) && !aText.startsWith(query)) return 1;
      
      // Categories before products (when relevance is similar)
      if (a.type === 'category' && b.type === 'product') return -1;
      if (a.type === 'product' && b.type === 'category') return 1;
      
      // Shorter text (more specific) first
      return aText.length - bText.length;
    });
  }

  /**
   * Perform actual search using existing products
   */
  static search(query: string, products: any[], categories: string[], filters?: {
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    rating?: number;
  }): SearchResult {
    if (!query.trim()) {
      return {
        products: products,
        categories: categories,
        totalCount: products.length
      };
    }

    const queryLower = query.toLowerCase().trim();
    const queryWords = queryLower.split(' ').filter(word => word.length > 1);
    
    let filteredProducts = products.filter(product => {
      const name = product.name?.toLowerCase() || '';
      const description = product.description?.toLowerCase() || '';
      const category = product.category?.toLowerCase() || '';
      
      // Check if query or any query word matches
      const matchesQuery = 
        name.includes(queryLower) ||
        description.includes(queryLower) ||
        category.includes(queryLower) ||
        queryWords.some(word => 
          name.includes(word) || 
          description.includes(word) ||
          category.includes(word)
        );

      if (!matchesQuery) return false;

      // Apply filters if provided
      if (filters) {
        if (filters.category && filters.category !== 'All' && product.category !== filters.category) {
          return false;
        }
        
        if (filters.minPrice && product.price < filters.minPrice) {
          return false;
        }
        
        if (filters.maxPrice && product.price > filters.maxPrice) {
          return false;
        }
        
        if (filters.rating && (product.rating || 0) < filters.rating) {
          return false;
        }
      }

      return true;
    });

    // Sort by relevance
    filteredProducts = this.sortProductsByRelevance(filteredProducts, queryLower);

    // Get unique categories from filtered products
    const resultCategories = [...new Set(
      filteredProducts.map(product => product.category).filter(Boolean)
    )];

    return {
      products: filteredProducts,
      categories: resultCategories,
      totalCount: filteredProducts.length
    };
  }

  /**
   * Sort products by search relevance
   */
  private static sortProductsByRelevance(products: any[], query: string): any[] {
    return products.sort((a, b) => {
      const aName = a.name?.toLowerCase() || '';
      const bName = b.name?.toLowerCase() || '';
      
      // Exact name matches first
      if (aName === query) return -1;
      if (bName === query) return 1;
      
      // Name starts with query
      if (aName.startsWith(query) && !bName.startsWith(query)) return -1;
      if (bName.startsWith(query) && !aName.startsWith(query)) return 1;
      
      // Featured products first (if available)
      if (a.isFeatured && !b.isFeatured) return -1;
      if (b.isFeatured && !a.isFeatured) return 1;
      
      // Higher rated products first
      const aRating = a.rating || 0;
      const bRating = b.rating || 0;
      if (aRating !== bRating) return bRating - aRating;
      
      // More popular products first (by view count or purchase count)
      const aPopularity = (a.viewCount || 0) + (a.purchaseCount || 0);
      const bPopularity = (b.viewCount || 0) + (b.purchaseCount || 0);
      
      return bPopularity - aPopularity;
    });
  }

  /**
   * Clear all cached suggestions
   */
  static clearCache(): void {
    this.suggestionsCache.clear();
  }
}
