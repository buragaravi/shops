// API Base URL - adjust based on your backend deploymen
export const API_BASE_URL = 'http://192.168.3.125:5001';
// export const API_BASE_URL = 'https://indiraa1-backend.onrender.com';

// API Endpoints
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    VERIFY_OTP: '/api/auth/verify-otp',
    REFRESH_TOKEN: '/api/auth/refresh-token',
    PROFILE: '/api/auth/me',
    ADD_ADDRESS: '/api/auth/address/add',
  },
  
  // Products
  PRODUCTS: {
    ALL: '/api/products',
    BY_ID: (id: string) => `/api/products/${id}`,
    BY_CATEGORY: (category: string) => `/api/products/category/${category}`,
    SEARCH: '/api/products/search',
    // SUGGESTIONS: '/api/products/search/suggestions', // Removed - using frontend suggestions
    FEATURED: '/api/products/featured',
    REVIEWS: (id: string) => `/api/products/${id}/reviews`,
  },
  
  // Combo Packs
  COMBO_PACKS: {
    ALL: '/api/combo-packs/all',
    BY_ID: (id: string) => `/api/combo-packs/id/${id}`,
    BY_SLUG: (slug: string) => `/api/combo-packs/slug/${slug}`,
    FEATURED: '/api/combo-packs/featured',
    // Cart operations for combo packs
    CART: {
      ADD: '/api/combo-packs/cart/add',
    },
    // Wishlist operations for combo packs
    WISHLIST: {
      GET: '/api/combo-packs/wishlist/me',
      ADD: '/api/combo-packs/wishlist/add',
      REMOVE: '/api/combo-packs/wishlist/remove',
    },
  },
  
  // Categories
  CATEGORIES: {
    ALL: '/api/categories',
    BY_ID: (id: string) => `/api/categories/${id}`,
  },
  
  // Banners
  BANNERS: {
    ALL: '/api/banners',
    ACTIVE: '/api/banners/active',
  },
  
  // Cart
  CART: {
    GET: '/api/products/cart/me',
    ADD: '/api/products/cart',
    UPDATE: '/api/products/cart/update',
    REMOVE: '/api/products/cart/remove',
    CLEAR: '/api/products/cart/clear',
    SYNC: '/api/cart/sync',
  },
  
  // Wishlist
  WISHLIST: {
    GET: '/api/products/wishlist/me',
    ADD: '/api/products/wishlist/add',
    REMOVE: '/api/products/wishlist/remove',
    CLEAR: '/api/products/wishlist/clear',
  },
  
  // Orders
  ORDERS: {
    CREATE: '/api/products/orders',
    USER_ORDERS: '/api/products/orders/user',
    BY_ID: (id: string) => `/api/products/orders/user/${id}`,
  },
};

// App Colors - matching the green theme from web version
export const COLORS = {
  PRIMARY: '#2ecc71',
  PRIMARY_DARK: '#27ae60',
  SECONDARY: '#3498db',
  SUCCESS: '#27ae60',
  WARNING: '#f39c12',
  ERROR: '#e74c3c',
  WHITE: '#ffffff',
  BLACK: '#000000',
  GRAY_LIGHT: '#ecf0f1',
  GRAY: '#95a5a6',
  GRAY_DARK: '#2c3e50',
  BACKGROUND: '#f8f9fa',
  CARD_BACKGROUND: '#ffffff',
  BORDER: '#dee2e6',
  TEXT_PRIMARY: '#2c3e50',
  TEXT_SECONDARY: '#7f8c8d',
  TEXT_LIGHT: '#bdc3c7',
};

// App Dimensions
export const DIMENSIONS = {
  WINDOW_WIDTH: 0, // Will be set dynamically
  WINDOW_HEIGHT: 0, // Will be set dynamically
  HEADER_HEIGHT: 60,
  TAB_BAR_HEIGHT: 80,
  PRODUCT_CARD_WIDTH: 160,
  PRODUCT_CARD_HEIGHT: 220,
  BANNER_HEIGHT: 200,
};

// App Constants
export const APP_CONSTANTS = {
  APP_NAME: 'Indiraa1',
  CURRENCY: '₹',
  DEFAULT_PAGINATION_LIMIT: 20,
  SEARCH_DEBOUNCE_TIME: 500,
  IMAGE_PLACEHOLDER: 'https://via.placeholder.com/300x300?text=No+Image',
};
