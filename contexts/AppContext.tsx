import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import ApiService from '../services/apiService';
import { API_BASE_URL, API_ENDPOINTS } from '../constants';
import type { Product, ProductVariant, CartItem, WishlistItem, Order, WalletBalance, Transaction, ComboPack } from '../services/apiService';
import TokenStorage from '../utils/tokenStorage';

// Types
interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
}

interface AppState {
  // User & Auth
  isAuthenticated: boolean;
  user: User | null;
  
  // Products
  products: Product[];
  featuredProducts: Product[];
  categories: string[];
  
  // Combo Packs
  comboPacks: ComboPack[];
  featuredComboPacks: ComboPack[];
  comboPackWishlist: ComboPack[];
  
  // Cart & Wishlist
  cartItems: CartItem[];
  wishlistItems: WishlistItem[];
  cartTotal: number;
  cartCount: number;
  
  // Orders
  orders: Order[];
  currentOrder: Order | null;
  
  // Wallet
  walletBalance: WalletBalance | null;
  transactions: Transaction[];
  
  // UI State
  loading: {
    products: boolean;
    comboPacks: boolean;
    cart: boolean;
    wishlist: boolean;
    orders: boolean;
    wallet: boolean;
  };
  
  // Error State
  errors: {
    general: string | null;
    cart: string | null;
    wishlist: string | null;
    orders: string | null;
  };
}

// Actions
type AppAction =
  | { type: 'SET_AUTH'; payload: { isAuthenticated: boolean; user: User | null } }
  | { type: 'SET_PRODUCTS'; payload: Product[] }
  | { type: 'SET_FEATURED_PRODUCTS'; payload: Product[] }
  | { type: 'SET_CATEGORIES'; payload: string[] }
  | { type: 'SET_COMBO_PACKS'; payload: ComboPack[] }
  | { type: 'SET_FEATURED_COMBO_PACKS'; payload: ComboPack[] }
  | { type: 'SET_COMBO_PACK_WISHLIST'; payload: ComboPack[] }
  | { type: 'SET_CART'; payload: { items: CartItem[]; total: number } }
  | { type: 'SET_WISHLIST'; payload: WishlistItem[] }
  | { type: 'SET_ORDERS'; payload: Order[] }
  | { type: 'SET_CURRENT_ORDER'; payload: Order | null }
  | { type: 'SET_WALLET'; payload: WalletBalance }
  | { type: 'SET_TRANSACTIONS'; payload: Transaction[] }
  | { type: 'ADD_TO_CART'; payload: CartItem }
  | { type: 'UPDATE_CART_ITEM'; payload: { itemId: string; quantity: number } }
  | { type: 'REMOVE_FROM_CART'; payload: string }
  | { type: 'SET_LOADING'; payload: { key: keyof AppState['loading']; value: boolean } }
  | { type: 'SET_ERROR'; payload: { key: keyof AppState['errors']; value: string | null } }
  | { type: 'ADD_TO_WISHLIST'; payload: WishlistItem }
  | { type: 'REMOVE_FROM_WISHLIST'; payload: string }
  | { type: 'ADD_COMBO_TO_WISHLIST'; payload: ComboPack }
  | { type: 'REMOVE_COMBO_FROM_WISHLIST'; payload: string }
  | { type: 'CLEAR_CART' }
  | { type: 'CLEAR_WISHLIST' }
  | { type: 'LOGOUT' };

// Initial State
const initialState: AppState = {
  isAuthenticated: false,
  user: null,
  products: [],
  featuredProducts: [],
  categories: [],
  comboPacks: [],
  featuredComboPacks: [],
  comboPackWishlist: [],
  cartItems: [],
  wishlistItems: [],
  cartTotal: 0,
  cartCount: 0,
  orders: [],
  currentOrder: null,
  walletBalance: null,
  transactions: [],
  loading: {
    products: false,
    comboPacks: false,
    cart: false,
    wishlist: false,
    orders: false,
    wallet: false,
  },
  errors: {
    general: null,
    cart: null,
    wishlist: null,
    orders: null,
  },
};

// Reducer
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_AUTH':
      return {
        ...state,
        isAuthenticated: action.payload.isAuthenticated,
        user: action.payload.user,
      };

    case 'SET_PRODUCTS':
      return {
        ...state,
        products: action.payload,
      };

    case 'SET_FEATURED_PRODUCTS':
      return {
        ...state,
        featuredProducts: action.payload,
      };

    case 'SET_CATEGORIES':
      return {
        ...state,
        categories: action.payload,
      };

    case 'SET_COMBO_PACKS':
      return {
        ...state,
        comboPacks: action.payload,
      };

    case 'SET_FEATURED_COMBO_PACKS':
      return {
        ...state,
        featuredComboPacks: action.payload,
      };

    case 'SET_COMBO_PACK_WISHLIST':
      return {
        ...state,
        comboPackWishlist: action.payload,
      };

    case 'SET_CART':
      return {
        ...state,
        cartItems: action.payload.items,
        cartTotal: action.payload.total,
        cartCount: action.payload.items.reduce((sum, item) => sum + item.qty, 0),
      };

    case 'SET_WISHLIST':
      return {
        ...state,
        wishlistItems: action.payload,
      };

    case 'SET_ORDERS':
      return {
        ...state,
        orders: action.payload,
      };

    case 'SET_CURRENT_ORDER':
      return {
        ...state,
        currentOrder: action.payload,
      };

    case 'SET_WALLET':
      return {
        ...state,
        walletBalance: action.payload,
      };

    case 'SET_TRANSACTIONS':
      return {
        ...state,
        transactions: action.payload,
      };

    case 'SET_LOADING':
      return {
        ...state,
        loading: {
          ...state.loading,
          [action.payload.key]: action.payload.value,
        },
      };

    case 'SET_ERROR':
      return {
        ...state,
        errors: {
          ...state.errors,
          [action.payload.key]: action.payload.value,
        },
      };

    case 'ADD_TO_WISHLIST':
      return {
        ...state,
        wishlistItems: [...state.wishlistItems, action.payload],
      };

    case 'REMOVE_FROM_WISHLIST':
      return {
        ...state,
        wishlistItems: state.wishlistItems.filter(item => 
          item?.productId?._id !== action.payload
        ),
      };

    case 'ADD_COMBO_TO_WISHLIST':
      return {
        ...state,
        comboPackWishlist: [...state.comboPackWishlist, action.payload],
      };

    case 'REMOVE_COMBO_FROM_WISHLIST':
      return {
        ...state,
        comboPackWishlist: state.comboPackWishlist.filter(item => item._id !== action.payload),
      };

    case 'CLEAR_CART':
      return {
        ...state,
        cartItems: [],
        cartTotal: 0,
        cartCount: 0,
      };

    case 'CLEAR_WISHLIST':
      return {
        ...state,
        wishlistItems: [],
      };

    case 'LOGOUT':
      return {
        ...initialState,
      };

    default:
      return state;
  }
}

// Context
interface AppContextType {
  state: AppState;
  
  // Auth Actions
  login: (authData: { token: string; user: User }) => void;
  logout: () => void;
  checkAuthStatus: () => Promise<void>;
  
  // Product Actions
  loadProducts: (page?: number, category?: string) => Promise<void>;
  loadFeaturedProducts: () => Promise<void>;
  loadCategories: () => Promise<void>;
  searchProducts: (query: string) => Promise<Product[]>;
  
  // Cart Actions
  loadCart: () => Promise<void>;
  addToCart: (productId: string, quantity?: number, variantId?: string) => Promise<boolean>;
  updateCartItem: (productId: string, quantity: number, variantId?: string) => Promise<void>;
  removeFromCart: (productId: string, variantId?: string) => Promise<void>;
  clearCart: () => Promise<void>;
  
  // Wishlist Actions
  loadWishlist: () => Promise<void>;
  addToWishlist: (productId: string) => Promise<boolean>;
  removeFromWishlist: (productId: string) => Promise<void>;
  isInWishlist: (productId: string) => boolean;
  
  // Combo Pack Actions
  loadComboPacks: () => Promise<void>;
  loadFeaturedComboPacks: () => Promise<void>;
  loadComboPackWishlist: () => Promise<void>;
  addComboToCart: (comboPackId: string, quantity?: number) => Promise<boolean>;
  addComboToWishlist: (comboPackId: string) => Promise<boolean>;
  removeComboFromWishlist: (comboPackId: string) => Promise<void>;
  isComboInWishlist: (comboPackId: string) => boolean;
  
  // Order Actions
  loadOrders: () => Promise<void>;
  placeOrder: (orderData: any) => Promise<Order | null>;
  cancelOrder: (orderId: string, reason: string) => Promise<void>;
  
  // Wallet Actions
  loadWalletBalance: () => Promise<void>;
  loadTransactions: (page?: number, type?: string) => Promise<void>;
  
  // Utility Actions
  setLoading: (key: keyof AppState['loading'], value: boolean) => void;
  setError: (key: keyof AppState['errors'], value: string | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider Component
export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const { isAuthenticated, user } = useAuth();

  // Sync auth state from AuthContext
  useEffect(() => {
    console.log('🔄 AppContext: Syncing auth state from AuthContext', { isAuthenticated, user: !!user });
    
    // Convert AuthContext User to AppContext User format
    let appUser = null;
    if (user) {
      appUser = {
        _id: user.id,
        name: `${user.firstName} ${user.lastName}`.trim(),
        email: user.username, // Assuming username is email
        phone: user.phone,
        avatar: undefined
      };
    }
    
    dispatch({ 
      type: 'SET_AUTH', 
      payload: { 
        isAuthenticated, 
        user: appUser 
      } 
    });

    // Load user-specific data when authenticated
    if (isAuthenticated && user) {
      console.log('✅ AppContext: User authenticated, loading user data');
      loadCart();
      loadWishlist();
      loadComboPackWishlist();
      loadWalletBalance();
    }
  }, [isAuthenticated, user]);

  // Auth Actions
  const login = async (authData: { token: string; user: User }) => {
    const success = await TokenStorage.storeAuthData({
      token: authData.token,
      user: authData.user,
      userType: 'user', // Assuming 'user' type for now
    });

    if (success) {
      dispatch({ type: 'SET_AUTH', payload: { isAuthenticated: true, user: authData.user } });
      // After successful login, immediately load user-specific data
      loadCart();
      loadWishlist();
      loadComboPackWishlist();
      loadWalletBalance();
    }
  };

  const logout = async () => {
    await TokenStorage.clearAll(); // Use clearAll for a full cleanup
    dispatch({ type: 'LOGOUT' });
  };

  const checkAuthStatus = async () => {
    try {
      const isAuthenticated = await TokenStorage.isAuthenticated();
      if (isAuthenticated) {
        const user = await TokenStorage.getUser();
        if (user) {
          dispatch({ type: 'SET_AUTH', payload: { isAuthenticated: true, user } });
          // Load user data when authenticated on app start
          loadCart();
          loadWishlist();
          loadWalletBalance();
        } else {
          // Data inconsistency, force logout
          await logout();
        }
      }
    } catch (error) {
      console.error('Auth check error:', error);
      await logout(); // Force logout on any error
    }
  };

  // Product Actions
  const loadProducts = async (page = 1, category?: string) => {
    setLoading('products', true);
    try {
      console.log(`📦 Loading products ${category ? `for category: ${category}` : '(all)'}...`);
      console.log(`🌐 API URL: ${API_BASE_URL}${category ? API_ENDPOINTS.PRODUCTS.BY_CATEGORY(category) : API_ENDPOINTS.PRODUCTS.ALL}?page=${page}`);
      
      const startTime = Date.now();
      const response = category 
        ? await ApiService.getProductsByCategory(category, page)
        : await ApiService.getProducts(page);
      const endTime = Date.now();
      
      console.log(`⏱️ Products API call took ${endTime - startTime}ms`);
      
      if (response.success && response.data) {
        const products = response.data.products || response.data || [];
        console.log(`✅ Loaded ${products.length} products successfully`);
        console.log(`📋 Sample product:`, products[0] ? { 
          id: products[0]._id, 
          name: products[0].name, 
          price: products[0].price 
        } : 'No products');
        dispatch({ type: 'SET_PRODUCTS', payload: products });
        setError('general', null); // Clear any previous errors
      } else {
        console.log('❌ Products API failed:', response.error);
        console.log('🔍 Response details:', response);
        // Set empty array if API fails, but don't show error for missing endpoints
        dispatch({ type: 'SET_PRODUCTS', payload: [] });
        if (!response.error?.includes('Cannot GET')) {
          setError('general', response.error || 'Failed to load products');
        }
      }
    } catch (error) {
      console.error('❌ Load products error:', error);
      dispatch({ type: 'SET_PRODUCTS', payload: [] });
      // Only show error for actual network issues, not missing endpoints
      const errorMessage = error instanceof Error ? error.message : 'Failed to load products';
      if (!errorMessage.includes('Cannot GET')) {
        setError('general', errorMessage);
      }
    } finally {
      setLoading('products', false);
    }
  };

  const loadFeaturedProducts = async () => {
    try {
      const response = await ApiService.getFeaturedProducts();
      if (response.success && response.data) {
        dispatch({ type: 'SET_FEATURED_PRODUCTS', payload: response.data.products });
      }
    } catch (error) {
      console.error('Load featured products error:', error);
    }
  };

  const loadCategories = async () => {
    try {
      // Instead of calling a categories endpoint, extract categories from products
      console.log('🏷️ Extracting categories from products...');
      
      // Get products first if we don't have them
      let products = state.products;
      if (products.length === 0) {
        console.log('📦 Loading products to extract categories...');
        const response = await ApiService.getProducts();
        if (response.success && response.data) {
          products = response.data.products || response.data || [];
          // Also update the products in state
          dispatch({ type: 'SET_PRODUCTS', payload: products });
        } else {
          console.log('⚠️ Products API failed, using mock data for development');
          // Use mock data for development if API is not available
          products = [
            { _id: '1', name: 'Sample Product 1', category: 'Electronics', price: 100, description: 'Sample', images: [], stock: 10 },
            { _id: '2', name: 'Sample Product 2', category: 'Clothing', price: 50, description: 'Sample', images: [], stock: 5 },
            { _id: '3', name: 'Sample Product 3', category: 'Food', price: 25, description: 'Sample', images: [], stock: 20 },
            { _id: '4', name: 'Sample Product 4', category: 'Books', price: 15, description: 'Sample', images: [], stock: 30 },
          ];
          dispatch({ type: 'SET_PRODUCTS', payload: products });
        }
      }
      
      // Extract unique categories from products
      const categorySet = new Set<string>();
      products.forEach((product: any) => {
        if (product.category && product.category.trim()) {
          categorySet.add(product.category.trim());
        }
      });
      
      const categories = Array.from(categorySet).sort();
      console.log('✅ Extracted categories:', categories);
      
      if (categories.length > 0) {
        dispatch({ type: 'SET_CATEGORIES', payload: categories });
      } else {
        console.log('⚠️ No categories found in products, using default categories');
        // Set default categories if no products have categories
        dispatch({ type: 'SET_CATEGORIES', payload: ['Electronics', 'Clothing', 'Food', 'Books', 'Home & Garden'] });
      }
    } catch (error) {
      console.error('Load categories error:', error);
      // Set default categories if anything fails
      dispatch({ type: 'SET_CATEGORIES', payload: ['Electronics', 'Clothing', 'Food', 'Books', 'Home & Garden'] });
    }
  };

  const searchProducts = async (query: string): Promise<Product[]> => {
    try {
      const response = await ApiService.searchProducts(query);
      if (response.success && response.data) {
        return response.data.products;
      }
      return [];
    } catch (error) {
      console.error('Search products error:', error);
      return [];
    }
  };

  // Cart Actions
  const loadCart = async () => {
    console.log('🛒 AppContext: LoadCart called', { 
      stateAuth: state.isAuthenticated,
      authContextAuth: isAuthenticated,
      stateUser: !!state.user,
      authContextUser: !!user
    });
    
    if (!isAuthenticated || !user) {
      console.log('❌ AppContext: LoadCart - User not authenticated');
      return;
    }
    
    setLoading('cart', true);
    setError('cart', null);
    try {
      console.log('🔄 AppContext: Calling API getCart');
      const response = await ApiService.getCart();
      console.log('📋 AppContext: Cart API response:', response);
      
      if (response.success && response.data) {
        const cartItems = response.data.cart || [];
        // Note: The backend now sends 'qty', so we use it here.
        const total = cartItems.reduce((sum, item) => sum + item.price * item.qty, 0);
        dispatch({ type: 'SET_CART', payload: { items: cartItems, total } });
        console.log('✅ AppContext: Cart loaded successfully', { itemCount: cartItems.length, total });
      } else {
        console.log('⚠️ AppContext: Cart API returned no data or failed');
        dispatch({ type: 'SET_CART', payload: { items: [], total: 0 } });
        if (response.error) {
          setError('cart', response.error);
        }
      }
    } catch (error) {
      setError('cart', error instanceof Error ? error.message : 'Failed to load cart');
    } finally {
      setLoading('cart', false);
    }
  };

  const addToCart = async (productId: string, quantity: number = 1, variantId?: string): Promise<boolean> => {
    console.log('🛒 AppContext: AddToCart called', { 
      productId, 
      quantity, 
      variantId, 
      isAuthenticated: state.isAuthenticated,
      authContextAuth: isAuthenticated,
      user: !!state.user,
      authContextUser: !!user
    });
    
    if (!isAuthenticated || !user) {
      console.log('❌ AppContext: User not authenticated');
      Alert.alert('Please login to add items to your cart.');
      return false;
    }
    
    setLoading('cart', true);
    try {
      console.log('🔄 AppContext: Calling API addToCart');
      const response = await ApiService.addToCart(productId, quantity, variantId);
      console.log('📋 AppContext: API response:', response);
      
      if (response.success) {
        await loadCart(); // Reload the cart from the server for consistency
        console.log('✅ AppContext: Item added to cart successfully');
        return true;
      } else {
        console.log('❌ AppContext: API returned failure:', response.error);
        setError('cart', response.error || 'Failed to add to cart');
        return false;
      }
    } catch (error) {
      console.error('❌ AppContext: AddToCart error:', error);
      setError('cart', error instanceof Error ? error.message : 'Failed to add to cart');
      return false;
    } finally {
      setLoading('cart', false);
    }
  };

  const updateCartItem = async (productId: string, quantity: number, variantId?: string): Promise<void> => {
    if (!state.isAuthenticated) return;
    setLoading('cart', true);
    try {
      await ApiService.updateCartItem(productId, quantity, variantId);
      await loadCart(); // Reload the cart from the server for consistency
    } catch (error) {
      setError('cart', error instanceof Error ? error.message : 'Failed to update cart');
    } finally {
      setLoading('cart', false);
    }
  };

  const removeFromCart = async (productId: string, variantId?: string): Promise<void> => {
    if (!state.isAuthenticated) return;
    setLoading('cart', true);
    try {
      await ApiService.removeFromCart(productId, variantId);
      await loadCart(); // Reload the cart from the server for consistency
    } catch (error) {
      setError('cart', error instanceof Error ? error.message : 'Failed to remove from cart');
    } finally {
      setLoading('cart', false);
    }
  };

  const clearCart = async () => {
    if (!state.isAuthenticated) return;
    
    setLoading('cart', true);
    try {
      const response = await ApiService.clearCart();
      if (response.success) {
        dispatch({ type: 'CLEAR_CART' });
      }
    } catch (error) {
      console.error('Clear cart error:', error);
      setError('cart', 'Failed to clear cart');
    } finally {
      setLoading('cart', false);
    }
  };
  
  // Wishlist Actions
  const loadWishlist = async () => {
    if (!state.isAuthenticated) return;
    
    setLoading('wishlist', true);
    try {
      const response = await ApiService.getWishlist();
      if (response.success && response.data) {
        dispatch({ type: 'SET_WISHLIST', payload: response.data.wishlist || [] });
      }
    } catch (error) {
      console.error('Load wishlist error:', error);
      setError('wishlist', 'Failed to load wishlist');
    } finally {
      setLoading('wishlist', false);
    }
  };

  const addToWishlist = async (productId: string): Promise<boolean> => {
    if (!state.isAuthenticated) {
      Alert.alert('Please log in to add items to your wishlist.');
      return false;
    }
    
    setLoading('wishlist', true);
    try {
      const response = await ApiService.addToWishlist(productId);
      if (response.success && response.data) {
        dispatch({ type: 'SET_WISHLIST', payload: response.data.wishlist || [] });
        return true;
      } else {
        setError('wishlist', response.error || 'Failed to add to wishlist');
        return false;
      }
    } catch (error) {
      console.error('Add to wishlist error:', error);
      setError('wishlist', 'Failed to add to wishlist');
      return false;
    } finally {
      setLoading('wishlist', false);
    }
  };

  const removeFromWishlist = async (productId: string) => {
    if (!state.isAuthenticated) return;
    
    setLoading('wishlist', true);
    try {
      const response = await ApiService.removeFromWishlist(productId);
      if (response.success && response.data) {
        dispatch({ type: 'SET_WISHLIST', payload: response.data.wishlist || [] });
      }
    } catch (error) {
      console.error('Remove from wishlist error:', error);
      setError('wishlist', 'Failed to remove from wishlist');
    } finally {
      setLoading('wishlist', false);
    }
  };

  const isInWishlist = (productId: string): boolean => {
    return state.wishlistItems.some(item => 
      item?.productId?._id === productId
    );
  };

  // Combo Pack Actions
  const loadComboPacks = async () => {
    setLoading('comboPacks', true);
    try {
      const response = await ApiService.getComboPacks();
      if (response.success && response.data) {
        dispatch({ type: 'SET_COMBO_PACKS', payload: response.data.comboPacks || [] });
      }
    } catch (error) {
      console.error('Load combo packs error:', error);
      setError('general', 'Failed to load combo packs');
    } finally {
      setLoading('comboPacks', false);
    }
  };

  const loadFeaturedComboPacks = async () => {
    setLoading('comboPacks', true);
    try {
      const response = await ApiService.getFeaturedComboPacks();
      if (response.success && response.data) {
        dispatch({ type: 'SET_FEATURED_COMBO_PACKS', payload: response.data.comboPacks || [] });
      }
    } catch (error) {
      console.error('Load featured combo packs error:', error);
      setError('general', 'Failed to load featured combo packs');
    } finally {
      setLoading('comboPacks', false);
    }
  };

  const loadComboPackWishlist = async () => {
    if (!state.isAuthenticated) return;
    
    setLoading('wishlist', true);
    try {
      const response = await ApiService.getComboPackWishlist();
      if (response.success && response.data) {
        dispatch({ type: 'SET_COMBO_PACK_WISHLIST', payload: response.data.wishlist || [] });
      }
    } catch (error) {
      console.error('Load combo pack wishlist error:', error);
      setError('wishlist', 'Failed to load combo pack wishlist');
    } finally {
      setLoading('wishlist', false);
    }
  };

  const addComboToWishlist = async (comboPackId: string): Promise<boolean> => {
    if (!state.isAuthenticated) {
      Alert.alert('Please log in to add combo packs to your wishlist.');
      return false;
    }
    
    try {
      const response = await ApiService.addComboPackToWishlist(comboPackId);
      if (response.success && response.data) {
        dispatch({ type: 'ADD_COMBO_TO_WISHLIST', payload: response.data.comboPack });
        return true;
      } else {
        setError('wishlist', response.error || 'Failed to add combo pack to wishlist');
        return false;
      }
    } catch (error) {
      console.error('Add combo to wishlist error:', error);
      setError('wishlist', 'Failed to add combo pack to wishlist');
      return false;
    }
  };

  const addComboToCart = async (comboPackId: string, quantity = 1): Promise<boolean> => {
    if (!state.isAuthenticated) {
      Alert.alert('Please log in to add combo packs to your cart.');
      return false;
    }
    
    try {
      setLoading('cart', true);
      const response = await ApiService.addComboPackToCart(comboPackId, quantity);
      if (response.success) {
        // Reload cart to get updated data
        await loadCart();
        return true;
      } else {
        setError('cart', response.error || 'Failed to add combo pack to cart');
        return false;
      }
    } catch (error) {
      console.error('Add combo to cart error:', error);
      setError('cart', 'Failed to add combo pack to cart');
      return false;
    } finally {
      setLoading('cart', false);
    }
  };

  const removeComboFromWishlist = async (comboPackId: string) => {
    if (!state.isAuthenticated) return;
    
    try {
      const response = await ApiService.removeComboPackFromWishlist(comboPackId);
      if (response.success) {
        dispatch({ type: 'REMOVE_COMBO_FROM_WISHLIST', payload: comboPackId });
      }
    } catch (error) {
      console.error('Remove combo from wishlist error:', error);
      setError('wishlist', 'Failed to remove combo pack from wishlist');
    }
  };

  const isComboInWishlist = (comboPackId: string): boolean => {
    return state.comboPackWishlist.some(combo => combo._id === comboPackId);
  };

  // Order Actions
  const loadOrders = async () => {
    if (!state.isAuthenticated) return;
    
    setLoading('orders', true);
    try {
      const response = await ApiService.getOrders();
      if (response.success && response.data) {
        dispatch({ type: 'SET_ORDERS', payload: response.data.orders });
      }
    } catch (error) {
      console.error('Load orders error:', error);
      setError('orders', 'Failed to load orders');
    } finally {
      setLoading('orders', false);
    }
  };

  const placeOrder = async (orderData: any): Promise<Order | null> => {
    try {
      const response = await ApiService.placeOrder(orderData);
      if (response.success && response.data) {
        // Clear cart after successful order
        dispatch({ type: 'CLEAR_CART' });
        // Reload orders
        await loadOrders();
        return response.data.order;
      } else {
        Alert.alert('Error', response.error || 'Failed to place order');
        return null;
      }
    } catch (error) {
      console.error('Place order error:', error);
      Alert.alert('Error', 'Failed to place order');
      return null;
    }
  };

  const cancelOrder = async (orderId: string, reason: string) => {
    try {
      const response = await ApiService.cancelOrder(orderId, reason);
      if (response.success) {
        // Reload orders
        await loadOrders();
        Alert.alert('Success', 'Order cancelled successfully');
      }
    } catch (error) {
      console.error('Cancel order error:', error);
      Alert.alert('Error', 'Failed to cancel order');
    }
  };

  // Wallet Actions
  const loadWalletBalance = async () => {
    if (!state.isAuthenticated) return;
    
    setLoading('wallet', true);
    try {
      const response = await ApiService.getWalletBalance();
      if (response.success && response.data) {
        dispatch({ type: 'SET_WALLET', payload: response.data.wallet });
      }
    } catch (error) {
      console.error('Load wallet error:', error);
    } finally {
      setLoading('wallet', false);
    }
  };

  const loadTransactions = async (page = 1, type?: string) => {
    try {
      const response = await ApiService.getTransactions(page, 20, type);
      if (response.success && response.data) {
        dispatch({ type: 'SET_TRANSACTIONS', payload: response.data.transactions });
      }
    } catch (error) {
      console.error('Load transactions error:', error);
    }
  };

  // Utility Actions
  const setLoading = (key: keyof AppState['loading'], value: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: { key, value } });
  };

  const setError = (key: keyof AppState['errors'], value: string | null) => {
    dispatch({ type: 'SET_ERROR', payload: { key, value } });
  };

  // Initialize app data
  useEffect(() => {
    checkAuthStatus();
    loadFeaturedProducts();
  }, []);

  const value: AppContextType = {
    state,
    login,
    logout,
    checkAuthStatus,
    loadProducts,
    loadFeaturedProducts,
    loadCategories,
    searchProducts,
    loadCart,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    loadWishlist,
    addToWishlist,
    removeFromWishlist,
    isInWishlist,
    loadComboPacks,
    loadFeaturedComboPacks,
    loadComboPackWishlist,
    addComboToCart,
    addComboToWishlist,
    removeComboFromWishlist,
    isComboInWishlist,
    loadOrders,
    placeOrder,
    cancelOrder,
    loadWalletBalance,
    loadTransactions,
    setLoading,
    setError,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

// Hook to use the context
export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export type { User, AppState, AppContextType };
