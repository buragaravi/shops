import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { API_BASE_URL, API_ENDPOINTS } from '../constants';

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  discountedPrice?: number;
  image: string;
  category: string;
  quantity: number;
  variant?: string;
  maxQuantity?: number;
  type: 'product' | 'combo';
}

export interface WishlistItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  discountedPrice?: number;
  image: string;
  category: string;
  rating?: number;
  inStock: boolean;
  type: 'product' | 'combo';
  dateAdded: string;
}

export interface PendingOperation {
  id: string;
  type: 'cart_add' | 'cart_update' | 'cart_remove' | 'wishlist_add' | 'wishlist_remove';
  data: any;
  timestamp: number;
  retryCount: number;
}

// Simple Network and Sync Utilities
export class NetworkManager {
  // Check if device is online using simple fetch
  static async isOnline(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch('https://www.google.com', {
        method: 'HEAD',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      console.log('Device appears to be offline');
      return false;
    }
  }

  // Test API connectivity directly
  static async testApiConnectivity(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

      const response = await fetch(`${API_BASE_URL}/api/health`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      console.error('API connectivity test failed:', error);
      return false;
    }
  }

  // Store pending operation for later sync
  static async storePendingOperation(operation: Omit<PendingOperation, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    try {
      const pendingOps = await this.getPendingOperations();
      const newOperation: PendingOperation = {
        ...operation,
        id: `${operation.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        retryCount: 0,
      };

      pendingOps.push(newOperation);
      await AsyncStorage.setItem('pendingOperations', JSON.stringify(pendingOps));
      console.log('Stored pending operation:', newOperation.type);
    } catch (error) {
      console.error('Error storing pending operation:', error);
    }
  }

  // Get all pending operations
  static async getPendingOperations(): Promise<PendingOperation[]> {
    try {
      const pendingOpsData = await AsyncStorage.getItem('pendingOperations');
      return pendingOpsData ? JSON.parse(pendingOpsData) : [];
    } catch (error) {
      console.error('Error getting pending operations:', error);
      return [];
    }
  }

  // Remove pending operation
  static async removePendingOperation(operationId: string): Promise<void> {
    try {
      const pendingOps = await this.getPendingOperations();
      const updatedOps = pendingOps.filter(op => op.id !== operationId);
      await AsyncStorage.setItem('pendingOperations', JSON.stringify(updatedOps));
    } catch (error) {
      console.error('Error removing pending operation:', error);
    }
  }

  // Sync all pending operations
  static async syncPendingOperations(): Promise<void> {
    try {
      const isConnected = await this.isOnline();
      if (!isConnected) {
        console.log('Device is offline, skipping sync');
        return;
      }

      const apiAvailable = await this.testApiConnectivity();
      if (!apiAvailable) {
        console.log('API not available, skipping sync');
        return;
      }

      const pendingOps = await this.getPendingOperations();
      console.log(`Syncing ${pendingOps.length} pending operations`);

      for (const operation of pendingOps) {
        try {
          await this.executePendingOperation(operation);
          await this.removePendingOperation(operation.id);
          console.log(`Successfully synced operation: ${operation.type}`);
        } catch (error) {
          console.error(`Failed to sync operation ${operation.type}:`, error);
          
          // Increment retry count
          operation.retryCount++;
          
          // Remove operation if it has failed too many times (max 3 retries)
          if (operation.retryCount >= 3) {
            console.log(`Removing operation after ${operation.retryCount} failed attempts`);
            await this.removePendingOperation(operation.id);
          } else {
            // Update the operation with new retry count
            const allOps = await this.getPendingOperations();
            const updatedOps = allOps.map(op => op.id === operation.id ? operation : op);
            await AsyncStorage.setItem('pendingOperations', JSON.stringify(updatedOps));
          }
        }
      }
    } catch (error) {
      console.error('Error syncing pending operations:', error);
    }
  }

  // Execute a specific pending operation
  private static async executePendingOperation(operation: PendingOperation): Promise<void> {
    const token = await AsyncStorage.getItem('userToken');
    if (!token) throw new Error('No auth token available');

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };

    switch (operation.type) {
      case 'cart_add':
        await fetch(`${API_BASE_URL}${API_ENDPOINTS.CART.ADD}`, {
          method: 'POST',
          headers,
          body: JSON.stringify(operation.data),
        });
        break;

      case 'cart_update':
        await fetch(`${API_BASE_URL}${API_ENDPOINTS.CART.UPDATE}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(operation.data),
        });
        break;

      case 'cart_remove':
        await fetch(`${API_BASE_URL}${API_ENDPOINTS.CART.REMOVE}`, {
          method: 'DELETE',
          headers,
          body: JSON.stringify(operation.data),
        });
        break;

      case 'wishlist_add':
        await fetch(`${API_BASE_URL}${API_ENDPOINTS.WISHLIST.ADD}`, {
          method: 'POST',
          headers,
          body: JSON.stringify(operation.data),
        });
        break;

      case 'wishlist_remove':
        await fetch(`${API_BASE_URL}${API_ENDPOINTS.WISHLIST.REMOVE}`, {
          method: 'DELETE',
          headers,
          body: JSON.stringify(operation.data),
        });
        break;

      default:
        throw new Error(`Unknown operation type: ${operation.type}`);
    }
  }
}

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  discountedPrice?: number;
  image: string;
  category: string;
  quantity: number;
  variant?: string;
  maxQuantity?: number;
  type: 'product' | 'combo';
}

export interface WishlistItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  discountedPrice?: number;
  image: string;
  category: string;
  rating?: number;
  inStock: boolean;
  type: 'product' | 'combo';
  dateAdded: string;
}

// Cart Utilities
export class CartManager {
  private static CART_KEY = 'cartItems';

  // Get all cart items
  static async getCartItems(): Promise<CartItem[]> {
    try {
      const cartData = await AsyncStorage.getItem(this.CART_KEY);
      return cartData ? JSON.parse(cartData) : [];
    } catch (error) {
      console.error('Error getting cart items:', error);
      return [];
    }
  }

  // Save cart items
  static async saveCartItems(items: CartItem[]): Promise<void> {
    try {
      await AsyncStorage.setItem(this.CART_KEY, JSON.stringify(items));
    } catch (error) {
      console.error('Error saving cart items:', error);
    }
  }

  // Add item to cart with network awareness
  static async addToCart(product: any, type: 'product' | 'combo' = 'product', quantity: number = 1): Promise<boolean> {
    try {
      const cartItems = await this.getCartItems();
      
      // Check if item already exists
      const existingItemIndex = cartItems.findIndex(item => 
        item.productId === (product.id || product._id) && item.type === type
      );

      let updatedCart: CartItem[];
      
      if (existingItemIndex !== -1) {
        // Update quantity if item exists
        updatedCart = [...cartItems];
        updatedCart[existingItemIndex].quantity += quantity;
        const maxQty = updatedCart[existingItemIndex].maxQuantity || 99;
        updatedCart[existingItemIndex].quantity = Math.min(updatedCart[existingItemIndex].quantity, maxQty);
      } else {
        // Add new item
        const newItem: CartItem = {
          id: `${type}_${product.id || product._id}_${Date.now()}`,
          productId: product.id || product._id,
          name: product.name,
          price: product.price || product.comboPrice || 0,
          discountedPrice: product.discountedPrice || product.salePrice,
          image: product.images?.[0] || product.mainImage || '',
          category: product.category || '',
          quantity,
          maxQuantity: product.stock || 99,
          type,
        };
        updatedCart = [...cartItems, newItem];
      }

      // Save locally first
      await this.saveCartItems(updatedCart);

      // Try to sync with backend
      await this.syncCartOperation('add', {
        productId: product.id || product._id,
        type,
        quantity,
        productData: {
          name: product.name,
          price: product.price || product.comboPrice || 0,
          discountedPrice: product.discountedPrice || product.salePrice,
          image: product.images?.[0] || product.mainImage || '',
          category: product.category || '',
        }
      });

      return true;
    } catch (error) {
      console.error('Error adding to cart:', error);
      return false;
    }
  }

  // Update item quantity with network awareness
  static async updateQuantity(itemId: string, newQuantity: number): Promise<boolean> {
    try {
      const cartItems = await this.getCartItems();
      let productId = '';
      let type: 'product' | 'combo' = 'product';
      
      const updatedCart = cartItems.map(item => {
        if (item.id === itemId) {
          productId = item.productId;
          type = item.type;
          const maxQty = item.maxQuantity || 99;
          return {
            ...item,
            quantity: Math.max(0, Math.min(newQuantity, maxQty)),
          };
        }
        return item;
      }).filter(item => item.quantity > 0); // Remove items with 0 quantity

      // Save locally first
      await this.saveCartItems(updatedCart);

      // Try to sync with backend
      if (newQuantity > 0) {
        await this.syncCartOperation('update', {
          productId,
          type,
          quantity: newQuantity,
        });
      } else {
        await this.syncCartOperation('remove', {
          productId,
          type,
        });
      }

      return true;
    } catch (error) {
      console.error('Error updating quantity:', error);
      return false;
    }
  }

  // Remove item from cart with network awareness
  static async removeFromCart(itemId: string): Promise<boolean> {
    try {
      const cartItems = await this.getCartItems();
      const itemToRemove = cartItems.find(item => item.id === itemId);
      
      if (!itemToRemove) return false;

      const updatedCart = cartItems.filter(item => item.id !== itemId);
      
      // Save locally first
      await this.saveCartItems(updatedCart);

      // Try to sync with backend
      await this.syncCartOperation('remove', {
        productId: itemToRemove.productId,
        type: itemToRemove.type,
      });

      return true;
    } catch (error) {
      console.error('Error removing from cart:', error);
      return false;
    }
  }

  // Clear cart
  static async clearCart(): Promise<boolean> {
    try {
      await this.saveCartItems([]);
      return true;
    } catch (error) {
      console.error('Error clearing cart:', error);
      return false;
    }
  }

  // Get cart count
  static async getCartCount(): Promise<number> {
    try {
      const cartItems = await this.getCartItems();
      return cartItems.reduce((sum, item) => sum + item.quantity, 0);
    } catch (error) {
      console.error('Error getting cart count:', error);
      return 0;
    }
  }

  // Check if item is in cart
  static async isInCart(productId: string, type: 'product' | 'combo' = 'product'): Promise<boolean> {
    try {
      const cartItems = await this.getCartItems();
      return cartItems.some(item => item.productId === productId && item.type === type);
    } catch (error) {
      console.error('Error checking cart:', error);
      return false;
    }
  }

  // Network-aware cart operation sync
  // Simple network-aware cart operation
  private static async syncCartOperation(operation: 'add' | 'update' | 'remove', data: any): Promise<void> {
    try {
      const isConnected = await NetworkManager.isOnline();
      
      if (isConnected) {
        // Device is online - make direct API call
        console.log(`Device online - making direct API call for cart ${operation}`);
        await this.executeCartOperation(operation, data);
        console.log(`Cart ${operation} completed successfully`);
      } else {
        // Device is offline - store operation for later sync
        console.log(`Device offline - storing cart ${operation} for later sync`);
        await NetworkManager.storePendingOperation({
          type: `cart_${operation}` as any,
          data,
        });
      }
    } catch (error) {
      console.error(`Error with cart ${operation}:`, error);
      // If API call fails, store for later sync
      console.log(`API call failed - storing cart ${operation} for later sync`);
      await NetworkManager.storePendingOperation({
        type: `cart_${operation}` as any,
        data,
      });
    }
  }

  // Execute cart operation with backend
  private static async executeCartOperation(operation: 'add' | 'update' | 'remove', data: any): Promise<void> {
    const token = await AsyncStorage.getItem('userToken');
    if (!token) return; // Skip if not authenticated

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };

    let url = '';
    let method = 'POST';
    let body = {};

    switch (operation) {
      case 'add':
        url = `${API_BASE_URL}${API_ENDPOINTS.CART.ADD}`;
        method = 'POST';
        body = {
          productId: data.productId,
          type: data.type,
          quantity: data.quantity,
          productData: data.productData,
        };
        break;

      case 'update':
        url = `${API_BASE_URL}${API_ENDPOINTS.CART.UPDATE}`;
        method = 'PUT';
        body = {
          productId: data.productId,
          type: data.type,
          quantity: data.quantity,
        };
        break;

      case 'remove':
        url = `${API_BASE_URL}${API_ENDPOINTS.CART.REMOVE}`;
        method = 'DELETE';
        body = {
          productId: data.productId,
          type: data.type,
        };
        break;
    }

    const response = await fetch(url, {
      method,
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Cart ${operation} failed: ${response.statusText}`);
    }
  }

  // Trigger sync of pending operations
  static async syncWithBackend(): Promise<void> {
    await NetworkManager.syncPendingOperations();
  }
}

// Wishlist Utilities
export class WishlistManager {
  private static WISHLIST_KEY = 'wishlistItems';

  // Get all wishlist items
  static async getWishlistItems(): Promise<WishlistItem[]> {
    try {
      const wishlistData = await AsyncStorage.getItem(this.WISHLIST_KEY);
      return wishlistData ? JSON.parse(wishlistData) : [];
    } catch (error) {
      console.error('Error getting wishlist items:', error);
      return [];
    }
  }

  // Save wishlist items
  static async saveWishlistItems(items: WishlistItem[]): Promise<void> {
    try {
      await AsyncStorage.setItem(this.WISHLIST_KEY, JSON.stringify(items));
      // Auto-sync if user is authenticated
      this.syncWithBackend(items);
    } catch (error) {
      console.error('Error saving wishlist items:', error);
    }
  }

  // Add item to wishlist
  static async addToWishlist(product: any, type: 'product' | 'combo' = 'product'): Promise<boolean> {
    try {
      const wishlistItems = await this.getWishlistItems();
      
      // Check if item already exists
      const existingItem = wishlistItems.find(item => 
        item.productId === (product.id || product._id) && item.type === type
      );

      if (existingItem) {
        return false; // Already in wishlist
      }

      const newItem: WishlistItem = {
        id: `${type}_${product.id || product._id}_${Date.now()}`,
        productId: product.id || product._id,
        name: product.name,
        price: product.price || product.comboPrice || 0,
        discountedPrice: product.discountedPrice || product.salePrice,
        image: product.images?.[0] || product.mainImage || '',
        category: product.category || '',
        rating: product.rating || 0,
        inStock: (product.stock || 0) > 0,
        type,
        dateAdded: new Date().toISOString(),
      };

      const updatedWishlist = [newItem, ...wishlistItems];
      await this.saveWishlistItems(updatedWishlist);
      return true;
    } catch (error) {
      console.error('Error adding to wishlist:', error);
      return false;
    }
  }

  // Remove item from wishlist
  static async removeFromWishlist(itemId: string): Promise<boolean> {
    try {
      const wishlistItems = await this.getWishlistItems();
      const updatedWishlist = wishlistItems.filter(item => item.id !== itemId);
      await this.saveWishlistItems(updatedWishlist);
      return true;
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      return false;
    }
  }

  // Remove by product ID
  static async removeFromWishlistByProductId(productId: string, type: 'product' | 'combo' = 'product'): Promise<boolean> {
    try {
      const wishlistItems = await this.getWishlistItems();
      const updatedWishlist = wishlistItems.filter(item => 
        !(item.productId === productId && item.type === type)
      );
      await this.saveWishlistItems(updatedWishlist);
      return true;
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      return false;
    }
  }

  // Clear wishlist
  static async clearWishlist(): Promise<boolean> {
    try {
      await this.saveWishlistItems([]);
      return true;
    } catch (error) {
      console.error('Error clearing wishlist:', error);
      return false;
    }
  }

  // Check if item is in wishlist
  static async isInWishlist(productId: string, type: 'product' | 'combo' = 'product'): Promise<boolean> {
    try {
      const wishlistItems = await this.getWishlistItems();
      return wishlistItems.some(item => item.productId === productId && item.type === type);
    } catch (error) {
      console.error('Error checking wishlist:', error);
      return false;
    }
  }

  // Get wishlist count
  static async getWishlistCount(): Promise<number> {
    try {
      const wishlistItems = await this.getWishlistItems();
      return wishlistItems.length;
    } catch (error) {
      console.error('Error getting wishlist count:', error);
      return 0;
    }
  }

  // Move item from wishlist to cart
  static async moveToCart(itemId: string): Promise<boolean> {
    try {
      const wishlistItems = await this.getWishlistItems();
      const wishlistItem = wishlistItems.find(item => item.id === itemId);
      
      if (!wishlistItem) return false;

      // Add to cart
      const success = await CartManager.addToCart({
        id: wishlistItem.productId,
        name: wishlistItem.name,
        price: wishlistItem.price,
        discountedPrice: wishlistItem.discountedPrice,
        images: [wishlistItem.image],
        category: wishlistItem.category,
        stock: 99, // Default stock
      }, wishlistItem.type, 1);

      if (success) {
        // Remove from wishlist
        await this.removeFromWishlist(itemId);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error moving to cart:', error);
      return false;
    }
  }

  // Sync with backend
  private static async syncWithBackend(items: WishlistItem[]): Promise<void> {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const isOnline = await NetworkManager.isOnline();
      
      if (isOnline) {
        // Online: Direct API call
        await fetch(`${API_BASE_URL}${API_ENDPOINTS.WISHLIST.GET}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ wishlistItems: items }),
        });
      } else {
        // Offline: Store pending operation
        // TODO: Implement SyncManager for offline operations
        console.log('Offline wishlist sync not implemented yet');
        /*
        const pendingOps = await SyncManager.getPendingOperations();
        await SyncManager.savePendingOperations([
          ...pendingOps,
          {
            id: `wishlist_sync_${Date.now()}`,
            type: 'wishlist_sync',
            data: { wishlistItems: items },
            timestamp: Date.now(),
          }
        ]);
        */
      }
    } catch (error) {
      console.error('Error syncing wishlist:', error);
    }
  }
}

// Helper functions for UI interactions
export const showAddToCartSuccess = (onViewCart?: () => void) => {
  Alert.alert(
    'Added to Cart',
    'Item has been added to your cart successfully!',
    [
      { text: 'Continue Shopping', style: 'cancel' },
      ...(onViewCart ? [{ text: 'View Cart', onPress: onViewCart }] : []),
    ]
  );
};

export const showAddToWishlistSuccess = (onViewWishlist?: () => void) => {
  Alert.alert(
    'Added to Wishlist',
    'Item has been added to your wishlist successfully!',
    [
      { text: 'Continue Shopping', style: 'cancel' },
      ...(onViewWishlist ? [{ text: 'View Wishlist', onPress: onViewWishlist }] : []),
    ]
  );
};

export const showRemoveFromWishlistConfirm = (onConfirm: () => void) => {
  Alert.alert(
    'Remove from Wishlist',
    'Are you sure you want to remove this item from your wishlist?',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: onConfirm },
    ]
  );
};
