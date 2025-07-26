import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, API_ENDPOINTS } from '../constants';
import { Product, ComboPack, Banner, Category } from '../types';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.log('Error getting auth token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired, redirect to login
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('user');
      // You can implement navigation to login here
    }
    return Promise.reject(error);
  }
);

// Product API calls
export const productApi = {
  getAllProducts: async (): Promise<Product[]> => {
    try {
      const response = await api.get(API_ENDPOINTS.PRODUCTS.ALL);
      // Handle different response structures
      return response.data.products || response.data || [];
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  },

  getProductById: async (id: string): Promise<Product> => {
    try {
      const response = await api.get(API_ENDPOINTS.PRODUCTS.BY_ID(id));
      return response.data.product || response.data;
    } catch (error) {
      console.error('Error fetching product by ID:', error);
      throw error;
    }
  },

  getProductsByCategory: async (category: string): Promise<Product[]> => {
    try {
      // First get all products, then filter by category
      const allProducts = await productApi.getAllProducts();
      return allProducts.filter(product => 
        product.category && product.category.toLowerCase() === category.toLowerCase()
      );
    } catch (error) {
      console.error('Error fetching products by category:', error);
      throw error;
    }
  },

  getFeaturedProducts: async (): Promise<Product[]> => {
    try {
      // Get all products and filter featured ones
      const allProducts = await productApi.getAllProducts();
      return allProducts.filter(product => product.isFeatured);
    } catch (error) {
      console.error('Error fetching featured products:', error);
      throw error;
    }
  },

  searchProducts: async (query: string): Promise<Product[]> => {
    try {
      const response = await api.post(API_ENDPOINTS.PRODUCTS.SEARCH, { query });
      return response.data.products || response.data || [];
    } catch (error) {
      console.error('Error searching products:', error);
      throw error;
    }
  },
};

// Combo Pack API calls
export const comboPackApi = {
  getAllComboPacks: async (): Promise<ComboPack[]> => {
    try {
      const response = await api.get(API_ENDPOINTS.COMBO_PACKS.ALL);
      return response.data.comboPacks || response.data || [];
    } catch (error) {
      console.error('Error fetching combo packs:', error);
      throw error;
    }
  },

  getComboPackById: async (id: string): Promise<ComboPack> => {
    try {
      const response = await api.get(API_ENDPOINTS.COMBO_PACKS.BY_ID(id));
      return response.data.comboPack || response.data;
    } catch (error) {
      console.error('Error fetching combo pack by ID:', error);
      throw error;
    }
  },

  getFeaturedComboPacks: async (): Promise<ComboPack[]> => {
    try {
      const response = await api.get(API_ENDPOINTS.COMBO_PACKS.FEATURED);
      return response.data.comboPacks || response.data || [];
    } catch (error) {
      console.error('Error fetching featured combo packs:', error);
      throw error;
    }
  },
};

// Banner API calls
export const bannerApi = {
  getActiveBanners: async (): Promise<Banner[]> => {
    try {
      const response = await api.get(API_ENDPOINTS.BANNERS.ACTIVE);
      return response.data.banners || response.data;
    } catch (error) {
      console.error('Error fetching banners:', error);
      throw error;
    }
  },
};

// Category API calls
export const categoryApi = {
  getAllCategories: async (): Promise<Category[]> => {
    try {
      const response = await api.get(API_ENDPOINTS.CATEGORIES.ALL);
      return response.data.categories || response.data;
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  },
};

export default api;
