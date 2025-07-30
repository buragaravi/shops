import { API_BASE_URL, API_ENDPOINTS } from '../constants';
import TokenStorage from '../utils/tokenStorage';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

interface ProductVariant {
  _id: string;
  name: string;
  label?: string;
  price: number;
  originalPrice?: number;
  stock: number;
  sku: string;
  isDefault?: boolean;
}

interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  images: string[];
  category: string;
  stock: number;
  hasVariants?: boolean;
  variants?: ProductVariant[];
  rating?: number;
  averageRating?: number;
  reviewCount?: number;
  totalReviews?: number;
}

interface ComboPack {
  _id: string;
  name: string;
  description: string;
  comboPrice: number;
  originalTotalPrice: number;
  discountAmount: number;
  discountPercentage: number;
  mainImage?: string;
  images?: string[];
  products: Array<{
    _id: string;
    productId: any;
    productName: string;
    originalPrice: number;
    quantity: number;
    variantId?: string | null;
    variantName?: string | null;
    images?: string[];
    isAvailable: boolean;
  }>;
  stock: number;
  isActive: boolean;
  badgeText?: string;
  averageRating?: number;
  totalReviews?: number;
  category?: string;
  featured?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CartItem {
  _id: string; // cart item id
  productId: string;
  name: string;
  images: string[];
  stock: number;
  price: number;
  qty: number;
  variantId?: string;
  variant?: {
    name: string;
    images?: string[];
  };
  createdAt: string;
}

export interface Address {
  _id: string;
  name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

interface WishlistItem {
  _id: string;
  productId: Product;
  createdAt: string;
}

export interface Order {
  _id: string;
  items: Array<{
    id?: string;
    name?: string;
    productId?: Product | string;
    variantId?: ProductVariant | string;
    variantName?: string;
    quantity?: number;
    qty?: number;
    price: number;
    image?: string;
    type?: string;
    itemType?: string;
    hasVariant?: boolean;
    originalTotalPrice?: number;
    discountAmount?: number;
    discountPercentage?: number;
    comboProducts?: any[];
    isDirect?: boolean;
  }>;
  totalAmount?: number;
  total?: number;
  subtotal?: number;
  deliveryCharge?: number;
  status: string;
  deliveryAddress?: any;
  shipping?: {
    name: string;
    address: string;
    phone: string;
    city: string;
    state: string;
    pincode: string;
  };
  deliverySlot?: any;
  paymentMethod?: string;
  paymentStatus?: string;
  coupon?: string;
  couponCode?: string;
  couponDiscount?: number;
  coinDiscount?: {
    coinsUsed: number;
    discountAmount: number;
  };
  placedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface WalletBalance {
  balance: number;
  totalEarned: number;
  totalSpent: number;
}

interface Transaction {
  _id: string;
  type: string;
  amount: number;
  description: string;
  status: string;
  createdAt: string;
}

class ApiService {
  private static async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const token = await TokenStorage.getToken();
      
      // Enhanced logging for debugging Android token issues
      console.log(`🔍 API Debug Info:`, {
        endpoint,
        hasToken: !!token,
        tokenLength: token?.length || 0,
        platform: require('react-native').Platform.OS,
        timestamp: new Date().toISOString()
      });
      
      const defaultHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (token) {
        defaultHeaders.Authorization = `Bearer ${token}`;
        console.log(`🔐 Authorization header set with token (${token.substring(0, 10)}...)`);
      } else {
        console.log('⚠️ No token found for API request');
      }

      console.log(`📡 API Request: ${API_BASE_URL}${endpoint}`);
      
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          ...defaultHeaders,
          ...options.headers,
        },
      });

      console.log(`API Response Status: ${response.status}`);

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      const isJson = contentType && contentType.includes('application/json');
      
      let data;
      try {
        if (isJson) {
          data = await response.json();
        } else {
          // If not JSON, get text response
          const textResponse = await response.text();
          console.error('Non-JSON response:', textResponse);
          data = { message: 'Server returned non-JSON response', details: textResponse };
        }
      } catch (parseError) {
        console.error('JSON Parse Error:', parseError);
        return {
          success: false,
          error: 'Invalid response format from server',
        };
      }

      if (!response.ok) {
        return {
          success: false,
          error: data.message || data.error || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('API Request Error:', error);
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('Network request failed') || error.message.includes('fetch')) {
          return {
            success: false,
            error: 'Unable to connect to server. Please check your internet connection and ensure the backend server is running.',
          };
        }
        return {
          success: false,
          error: error.message,
        };
      }
      
      return {
        success: false,
        error: 'Network error occurred',
      };
    }
  }

  // Health Check
  static async healthCheck(): Promise<ApiResponse<any>> {
    return this.makeRequest('/api/health');
  }

  // Product APIs
  static async getProducts(page = 1, limit = 20): Promise<ApiResponse<{ products: Product[]; total: number }>> {
    return this.makeRequest(`${API_ENDPOINTS.PRODUCTS.ALL}?page=${page}&limit=${limit}`);
  }

  static async getProductById(id: string): Promise<ApiResponse<{ product: Product }>> {
    return this.makeRequest(API_ENDPOINTS.PRODUCTS.BY_ID(id));
  }

  static async getFeaturedProducts(): Promise<ApiResponse<{ products: Product[] }>> {
    return this.makeRequest(`${API_ENDPOINTS.PRODUCTS.FEATURED}`);
  }

  static async searchProducts(query: string, page = 1): Promise<ApiResponse<{ products: Product[]; total: number }>> {
    return this.makeRequest(`${API_ENDPOINTS.PRODUCTS.SEARCH}?q=${encodeURIComponent(query)}&page=${page}`);
  }

  // Note: Search suggestions are now handled frontend-only via SearchService
  // static async searchSuggestions(query: string): Promise<ApiResponse<{ categories: string[]; products: Product[] }>> {
  //   return this.makeRequest(`${API_ENDPOINTS.PRODUCTS.SUGGESTIONS}?q=${encodeURIComponent(query)}`);
  // }

  static async getProductsByCategory(category: string, page = 1): Promise<ApiResponse<{ products: Product[]; total: number }>> {
    return this.makeRequest(`${API_ENDPOINTS.PRODUCTS.BY_CATEGORY(category)}?page=${page}`);
  }

  // Note: Categories are extracted from products, no separate endpoint needed

  // Cart APIs
  static async getCart(): Promise<ApiResponse<{ cart: CartItem[] }>> {
    return this.makeRequest(API_ENDPOINTS.CART.GET);
  }

  static async addToCart(
    productId: string,
    quantity: number = 1,
    variantId?: string
  ): Promise<ApiResponse<{ cart: CartItem[] }>> {
    const body: { productId: string; quantity: number; variantId?: string } = { productId, quantity: quantity };
    if (variantId) {
      body.variantId = variantId;
    }
    // Using UPDATE endpoint for both add and update (upsert)
    return this.makeRequest(API_ENDPOINTS.CART.ADD, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  static async updateCartItem(
    productId: string,
    quantity: number,
    variantId?: string
  ): Promise<ApiResponse<{ cart: CartItem[] }>> {
    const body: { productId: string; quantity: number; variantId?: string } = { productId, quantity };
    if (variantId) {
      body.variantId = variantId;
    }
    return this.makeRequest(API_ENDPOINTS.CART.UPDATE, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  static async removeFromCart(
    productId: string,
    variantId?: string
  ): Promise<ApiResponse<{ cart: CartItem[] }>> {
    const body: { productId: string; variantId?: string } = { productId };
    if (variantId) {
      body.variantId = variantId;
    }
    return this.makeRequest(API_ENDPOINTS.CART.REMOVE, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  static async clearCart(): Promise<ApiResponse<{ cart: [] }>> {
    return this.makeRequest(API_ENDPOINTS.CART.CLEAR, {
      method: 'POST',
    });
  }

  // Wishlist APIs
  static async getWishlist(): Promise<ApiResponse<{ wishlist: WishlistItem[] }>> {
    return this.makeRequest(API_ENDPOINTS.WISHLIST.GET);
  }

  static async addToWishlist(productId: string): Promise<ApiResponse<{ wishlist: WishlistItem[] }>> {
    return this.makeRequest(API_ENDPOINTS.WISHLIST.ADD, {
      method: 'POST',
      body: JSON.stringify({ productId }),
    });
  }

  static async removeFromWishlist(productId: string): Promise<ApiResponse<{ wishlist: WishlistItem[] }>> {
    return this.makeRequest(API_ENDPOINTS.WISHLIST.REMOVE, {
      method: 'POST',
      body: JSON.stringify({ productId }),
    });
  }

  static async clearWishlist(): Promise<ApiResponse<{ wishlist: [] }>> {
    return this.makeRequest(API_ENDPOINTS.WISHLIST.CLEAR, {
      method: 'POST',
    });
  }

  // Order APIs
  static async getOrders(page = 1, limit = 20): Promise<ApiResponse<{ orders: Order[]; total: number }>> {
    return this.makeRequest(`${API_ENDPOINTS.ORDERS.USER_ORDERS}?page=${page}&limit=${limit}`);
  }

  static async getOrderById(orderId: string): Promise<ApiResponse<{ order: Order }>> {
    return this.makeRequest(API_ENDPOINTS.ORDERS.BY_ID(orderId));
  }

  static async placeOrder(orderData: {
    items: Array<{ productId: string; variantId?: string; quantity: number; price: number }>;
    deliveryAddress: any;
    deliverySlot?: any;
    paymentMethod: string;
    couponCode?: string;
    coinDiscount?: number;
  }): Promise<ApiResponse<{ order: Order; paymentUrl?: string }>> {
    return this.makeRequest(API_ENDPOINTS.ORDERS.CREATE, {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  }

  static async cancelOrder(orderId: string, reason: string): Promise<ApiResponse<{ message: string }>> {
    return this.makeRequest(`/api/products/orders/${orderId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  // Wallet APIs
  static async getWalletBalance(): Promise<ApiResponse<{ wallet: WalletBalance }>> {
    return this.makeRequest('/api/wallet/balance');
  }

  static async getTransactions(page = 1, limit = 20, type?: string): Promise<ApiResponse<{ transactions: Transaction[]; total: number }>> {
    let endpoint = `/api/wallet/transactions?page=${page}&limit=${limit}`;
    if (type && type !== 'ALL') {
      endpoint += `&type=${type}`;
    }
    return this.makeRequest(endpoint);
  }

  static async redeemCoins(amount: number): Promise<ApiResponse<{ discount: number }>> {
    return this.makeRequest('/api/wallet/redeem', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  }

  // Referral APIs
  static async getReferralData(): Promise<ApiResponse<{ 
    code: string; 
    totalReferred: number; 
    totalEarned: number; 
    referrals: any[] 
  }>> {
    return this.makeRequest('/api/referral/stats');
  }

  static async generateReferralCode(): Promise<ApiResponse<{ code: string }>> {
    return this.makeRequest('/api/referral/generate', {
      method: 'POST',
    });
  }

  // Address APIs
  static async getAddresses(): Promise<ApiResponse<{ addresses: any[] }>> {
    // Addresses are part of the user profile data
    const response = await this.makeRequest<{ user: { addresses: any[] } }>(API_ENDPOINTS.AUTH.PROFILE);
    if (response.success && response.data) {
      return {
        success: true,
        data: {
          addresses: response.data.user?.addresses || []
        }
      };
    }
    return {
      success: false,
      error: response.error || 'Could not fetch user profile for addresses.',
      data: { addresses: [] }
    };
  }

  static async addAddress(address: any): Promise<ApiResponse<{ addresses: any[], newAddress: any }>> {
    return this.makeRequest(API_ENDPOINTS.AUTH.ADD_ADDRESS, {
      method: 'POST',
      body: JSON.stringify(address),
    });
  }

  static async updateAddress(addressId: string, address: any): Promise<ApiResponse<{ address: any }>> {
    return this.makeRequest(`/api/user/addresses/${addressId}`, {
      method: 'PUT',
      body: JSON.stringify(address),
    });
  }

  static async deleteAddress(addressId: string): Promise<ApiResponse<{ message: string }>> {
    return this.makeRequest(`/api/user/addresses/${addressId}`, {
      method: 'DELETE',
    });
  }

  // Delivery Slot APIs
  static async getDeliverySlots(date: string): Promise<ApiResponse<{ slots: any[] }>> {
    return this.makeRequest(`/api/delivery/slots?date=${date}`);
  }

  static async updateOrderDeliverySlot(
    orderId: string,
    date: string,
    timeSlot: string
  ): Promise<ApiResponse<{ message: string }>> {
    return this.makeRequest(`/api/orders/${orderId}/delivery-slot`, {
      method: 'PUT',
      body: JSON.stringify({ date, timeSlot }),
    });
  }

  // Coupon APIs
  static async validateCoupon(code: string, orderValue: number): Promise<ApiResponse<{ 
    discount: number; 
    coupon: any 
  }>> {
    return this.makeRequest('/api/coupons/validate', {
      method: 'POST',
      body: JSON.stringify({ code, orderValue }),
    });
  }

  // Review APIs
  static async addProductReview(
    productId: string,
    rating: number,
    comment: string,
    images?: string[]
  ): Promise<ApiResponse<{ review: any }>> {
    return this.makeRequest(`/api/products/${productId}/reviews`, {
      method: 'POST',
      body: JSON.stringify({ rating, comment, images }),
    });
  }

  static async getProductReviews(productId: string, page = 1): Promise<ApiResponse<{ 
    reviews: any[]; 
    total: number;
    averageRating: number;
  }>> {
    return this.makeRequest(`/api/products/${productId}/reviews?page=${page}`);
  }

  // Return APIs
  static async initiateReturn(
    orderId: string,
    items: Array<{ productId: string; variantId?: string; quantity: number; reason: string }>
  ): Promise<ApiResponse<{ returnRequest: any }>> {
    return this.makeRequest(`/api/orders/${orderId}/return`, {
      method: 'POST',
      body: JSON.stringify({ items }),
    });
  }

  static async getOrderReturns(orderId: string): Promise<ApiResponse<{ returns: any[] }>> {
    return this.makeRequest(`/api/orders/${orderId}/returns`);
  }

  // Combo Pack APIs
  static async getComboPacks(): Promise<ApiResponse<{ comboPacks: ComboPack[] }>> {
    return this.makeRequest<{ comboPacks: ComboPack[] }>(API_ENDPOINTS.COMBO_PACKS.ALL);
  }

  static async getFeaturedComboPacks(limit = 6): Promise<ApiResponse<{ comboPacks: ComboPack[] }>> {
    return this.makeRequest<{ comboPacks: ComboPack[] }>(`${API_ENDPOINTS.COMBO_PACKS.FEATURED}?limit=${limit}`);
  }

  static async getComboPackById(id: string): Promise<ApiResponse<{ comboPack: ComboPack }>> {
    return this.makeRequest<{ comboPack: ComboPack }>(API_ENDPOINTS.COMBO_PACKS.BY_ID(id));
  }

  static async addComboPackToCart(comboPackId: string, quantity = 1): Promise<ApiResponse<any>> {
    return this.makeRequest('/api/combo-packs/cart/add', {
      method: 'POST',
      body: JSON.stringify({ comboPackId, qty: quantity }),
    });
  }

  static async addComboPackToWishlist(comboPackId: string): Promise<ApiResponse<any>> {
    return this.makeRequest('/api/combo-packs/wishlist/add', {
      method: 'POST',
      body: JSON.stringify({ comboPackId }),
    });
  }

  static async removeComboPackFromWishlist(comboPackId: string): Promise<ApiResponse<any>> {
    return this.makeRequest('/api/combo-packs/wishlist/remove', {
      method: 'POST',
      body: JSON.stringify({ comboPackId }),
    });
  }

  static async getComboPackWishlist(): Promise<ApiResponse<{ wishlist: ComboPack[] }>> {
    return this.makeRequest<{ wishlist: ComboPack[] }>('/api/combo-packs/wishlist/me');
  }
}

export default ApiService;
export type { Product, ProductVariant, CartItem, WishlistItem, WalletBalance, Transaction, ComboPack };
