import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CartManager, WishlistManager, CartItem, WishlistItem } from '../utils/cartWishlistManager';

interface CartWishlistContextType {
  // Cart state
  cartItems: CartItem[];
  cartCount: number;
  cartTotal: number;
  
  // Wishlist state
  wishlistItems: WishlistItem[];
  wishlistCount: number;
  
  // Cart actions
  addToCart: (product: any, type?: 'product' | 'combo', quantity?: number) => Promise<boolean>;
  removeFromCart: (itemId: string) => Promise<boolean>;
  updateCartQuantity: (itemId: string, quantity: number) => Promise<boolean>;
  clearCart: () => Promise<boolean>;
  isInCart: (productId: string, type?: 'product' | 'combo') => boolean;
  
  // Wishlist actions
  addToWishlist: (product: any, type?: 'product' | 'combo') => Promise<boolean>;
  removeFromWishlist: (itemId: string) => Promise<boolean>;
  removeFromWishlistByProductId: (productId: string, type?: 'product' | 'combo') => Promise<boolean>;
  clearWishlist: () => Promise<boolean>;
  isInWishlist: (productId: string, type?: 'product' | 'combo') => boolean;
  moveToCartFromWishlist: (itemId: string) => Promise<boolean>;
  
  // Utility actions
  refreshData: () => Promise<void>;
  syncing: boolean;
}

const CartWishlistContext = createContext<CartWishlistContextType | undefined>(undefined);

interface CartWishlistProviderProps {
  children: ReactNode;
}

export const CartWishlistProvider: React.FC<CartWishlistProviderProps> = ({ children }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [syncing, setSyncing] = useState(false);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  // Load cart and wishlist data
  const loadData = async () => {
    try {
      setSyncing(true);
      const [cartData, wishlistData] = await Promise.all([
        CartManager.getCartItems(),
        WishlistManager.getWishlistItems(),
      ]);
      
      setCartItems(cartData);
      setWishlistItems(wishlistData);
    } catch (error) {
      console.error('Error loading cart/wishlist data:', error);
    } finally {
      setSyncing(false);
    }
  };

  // Refresh data
  const refreshData = async () => {
    await loadData();
  };

  // Calculate cart metrics
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cartItems.reduce((sum, item) => {
    const price = item.discountedPrice || item.price;
    return sum + (price * item.quantity);
  }, 0);
  const wishlistCount = wishlistItems.length;

  // Cart actions
  const addToCart = async (product: any, type: 'product' | 'combo' = 'product', quantity: number = 1): Promise<boolean> => {
    const success = await CartManager.addToCart(product, type, quantity);
    if (success) {
      await refreshData();
    }
    return success;
  };

  const removeFromCart = async (itemId: string): Promise<boolean> => {
    const success = await CartManager.removeFromCart(itemId);
    if (success) {
      await refreshData();
    }
    return success;
  };

  const updateCartQuantity = async (itemId: string, quantity: number): Promise<boolean> => {
    const success = await CartManager.updateQuantity(itemId, quantity);
    if (success) {
      await refreshData();
    }
    return success;
  };

  const clearCart = async (): Promise<boolean> => {
    const success = await CartManager.clearCart();
    if (success) {
      await refreshData();
    }
    return success;
  };

  const isInCart = (productId: string, type: 'product' | 'combo' = 'product'): boolean => {
    return cartItems.some(item => item.productId === productId && item.type === type);
  };

  // Wishlist actions
  const addToWishlist = async (product: any, type: 'product' | 'combo' = 'product'): Promise<boolean> => {
    const success = await WishlistManager.addToWishlist(product, type);
    if (success) {
      await refreshData();
    }
    return success;
  };

  const removeFromWishlist = async (itemId: string): Promise<boolean> => {
    const success = await WishlistManager.removeFromWishlist(itemId);
    if (success) {
      await refreshData();
    }
    return success;
  };

  const removeFromWishlistByProductId = async (productId: string, type: 'product' | 'combo' = 'product'): Promise<boolean> => {
    const success = await WishlistManager.removeFromWishlistByProductId(productId, type);
    if (success) {
      await refreshData();
    }
    return success;
  };

  const clearWishlist = async (): Promise<boolean> => {
    const success = await WishlistManager.clearWishlist();
    if (success) {
      await refreshData();
    }
    return success;
  };

  const isInWishlist = (productId: string, type: 'product' | 'combo' = 'product'): boolean => {
    return wishlistItems.some(item => item.productId === productId && item.type === type);
  };

  const moveToCartFromWishlist = async (itemId: string): Promise<boolean> => {
    const success = await WishlistManager.moveToCart(itemId);
    if (success) {
      await refreshData();
    }
    return success;
  };

  const value: CartWishlistContextType = {
    // State
    cartItems,
    cartCount,
    cartTotal,
    wishlistItems,
    wishlistCount,
    syncing,
    
    // Cart actions
    addToCart,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    isInCart,
    
    // Wishlist actions
    addToWishlist,
    removeFromWishlist,
    removeFromWishlistByProductId,
    clearWishlist,
    isInWishlist,
    moveToCartFromWishlist,
    
    // Utility
    refreshData,
  };

  return (
    <CartWishlistContext.Provider value={value}>
      {children}
    </CartWishlistContext.Provider>
  );
};

// Hook to use the context
export const useCartWishlist = (): CartWishlistContextType => {
  const context = useContext(CartWishlistContext);
  if (context === undefined) {
    throw new Error('useCartWishlist must be used within a CartWishlistProvider');
  }
  return context;
};

export default CartWishlistContext;
