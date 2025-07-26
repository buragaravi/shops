import React, { useState, useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, Text } from 'react-native';
import { COLORS } from '../../constants';
import { CartManager } from '../../utils/cartWishlistManager';

// Badge component for cart and wishlist counts
const TabBadge = ({ count, color }: { count: number; color: string }) => {
  if (count === 0) return null;
  
  return (
    <View style={{
      position: 'absolute',
      top: -2,
      right: -6,
      backgroundColor: '#dc2626',
      borderRadius: 10,
      minWidth: 18,
      height: 18,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 4,
    }}>
      <Text style={{
        color: '#ffffff',
        fontSize: 10,
        fontWeight: 'bold',
      }}>
        {count > 99 ? '99+' : count}
      </Text>
    </View>
  );
};

// Cart icon with badge
const CartIcon = ({ color, size }: { color: string; size: number }) => {
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    const updateCartCount = async () => {
      const count = await CartManager.getCartCount();
      setCartCount(count);
    };

    updateCartCount();
    
    // Set up interval to update count periodically
    const interval = setInterval(updateCartCount, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={{ position: 'relative' }}>
      <Ionicons name="bag" size={size} color={color} />
      <TabBadge count={cartCount} color={color} />
    </View>
  );
};

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.PRIMARY,
        tabBarInactiveTintColor: COLORS.GRAY,
        tabBarStyle: {
          backgroundColor: COLORS.WHITE,
          borderTopWidth: 1,
          borderTopColor: COLORS.BORDER,
          paddingBottom: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: 'Products',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Cart',
          tabBarIcon: ({ color, size }) => (
            <CartIcon color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="receipt" size={size} color={color} />
          ),
        }}
      />
      
      {/* Hidden tabs - accessible through header or other navigation */}
      <Tabs.Screen
        name="wishlist"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          href: null, // Hide from tab bar
        }}
      />
    </Tabs>
  );
}
