export interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  images: string[];
  image?: string; // Sometimes single image field
  category: string;
  subCategory?: string;
  brand?: string;
  stock: number;
  isActive: boolean;
  isFeatured: boolean;
  tags: string[];
  variants?: ProductVariant[];
  specifications?: Record<string, any>;
  reviews?: ProductReview[];
  rating?: number;
  averageRating?: number;
  reviewCount?: number;
  totalReviews?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductVariant {
  _id: string;
  name: string;
  price: number;
  stock: number;
  sku: string;
  attributes: Record<string, string>;
}

export interface ProductReview {
  _id: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  images?: string[];
  createdAt: string;
}

export interface ComboPack {
  _id: string;
  name: string;
  description: string;
  products: ComboProduct[];
  originalPrice: number;
  originalTotalPrice?: number;
  discountedPrice: number;
  comboPrice?: number;
  discount: number;
  discountAmount?: number;
  discountPercentage?: number;
  images: string[];
  mainImage?: string;
  isActive: boolean;
  isFeatured: boolean;
  badge?: string;
  badgeText?: string;
  offer?: string;
  stock: number;
  averageRating?: number;
  totalReviews?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ComboProduct {
  _id: string;
  productId: any;
  productName: string;
  originalPrice: number;
  quantity: number;
  variantId?: string | null;
  variantName?: string | null;
  images?: string[];
  isAvailable: boolean;
}

export interface Banner {
  _id: string;
  title: string;
  description?: string;
  image: string;
  link?: string;
  isActive: boolean;
  order: number;
  type: 'hero' | 'promotional' | 'category';
}

export interface Category {
  _id: string;
  name: string;
  description?: string;
  image?: string;
  isActive: boolean;
  parentCategory?: string;
  order: number;
}

export interface CartItem {
  _id: string;
  product: Product;
  variant?: ProductVariant;
  quantity: number;
  price: number;
}

export interface User {
  _id: string;
  username: string;
  name: string;
  email?: string;
  phone: string;
  addresses: Address[];
  role: string;
}

export interface Address {
  _id: string;
  type: 'home' | 'work' | 'other';
  name: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}
