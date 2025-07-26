import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

/**
 * Secure Token Storage Utility
 * Cross-platform storage that works for both iOS and Android
 * Uses AsyncStorage with proper error handling and JSON serialization
 */

interface AuthData {
  token: string;
  user: any;
  userType: 'user' | 'admin';
  expiresAt?: number;
}

interface StoredCredentials {
  username: string;
  password: string;
}

class TokenStorage {
  private static readonly KEYS = {
    TOKEN: 'userToken',
    USER: 'user',
    USER_TYPE: 'userType',
    AUTHENTICATED: 'isAuthenticated',
    REMEMBER_ME: 'remember_me',
    STORED_CREDENTIALS: 'stored_credentials',
    REFRESH_TOKEN: 'refreshToken',
  };

  /**
   * Store authentication data securely
   */
  static async storeAuthData(authData: AuthData): Promise<boolean> {
    try {
      const operations = [
        AsyncStorage.setItem(this.KEYS.TOKEN, authData.token),
        AsyncStorage.setItem(this.KEYS.USER, JSON.stringify(authData.user)),
        AsyncStorage.setItem(this.KEYS.USER_TYPE, authData.userType),
        AsyncStorage.setItem(this.KEYS.AUTHENTICATED, 'true'),
      ];

      await Promise.all(operations);
      console.log('✅ Auth data stored successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to store auth data:', error);
      return false;
    }
  }

  /**
   * Get stored authentication token
   */
  static async getToken(): Promise<string | null> {
    try {
      const token = await AsyncStorage.getItem(this.KEYS.TOKEN);
      return token;
    } catch (error) {
      console.error('❌ Failed to get token:', error);
      return null;
    }
  }

  /**
   * Get stored user data
   */
  static async getUser(): Promise<any | null> {
    try {
      const userData = await AsyncStorage.getItem(this.KEYS.USER);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('❌ Failed to get user data:', error);
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  static async isAuthenticated(): Promise<boolean> {
    try {
      const [token, isAuth] = await Promise.all([
        AsyncStorage.getItem(this.KEYS.TOKEN),
        AsyncStorage.getItem(this.KEYS.AUTHENTICATED),
      ]);
      
      return !!(token && isAuth === 'true');
    } catch (error) {
      console.error('❌ Failed to check auth status:', error);
      return false;
    }
  }

  /**
   * Store credentials for "Remember Me" functionality
   */
  static async storeCredentials(
    username: string, 
    password: string, 
    rememberMe: boolean = true
  ): Promise<boolean> {
    try {
      if (rememberMe) {
        const credentials: StoredCredentials = { username, password };
        await Promise.all([
          AsyncStorage.setItem(this.KEYS.REMEMBER_ME, 'true'),
          AsyncStorage.setItem(this.KEYS.STORED_CREDENTIALS, JSON.stringify(credentials)),
        ]);
        console.log('✅ Credentials stored for auto-login');
      } else {
        await this.clearCredentials();
      }
      return true;
    } catch (error) {
      console.error('❌ Failed to store credentials:', error);
      return false;
    }
  }

  /**
   * Get stored credentials for auto-login
   */
  static async getStoredCredentials(): Promise<StoredCredentials | null> {
    try {
      const [rememberMe, credentialsStr] = await Promise.all([
        AsyncStorage.getItem(this.KEYS.REMEMBER_ME),
        AsyncStorage.getItem(this.KEYS.STORED_CREDENTIALS),
      ]);

      if (rememberMe === 'true' && credentialsStr) {
        return JSON.parse(credentialsStr);
      }
      return null;
    } catch (error) {
      console.error('❌ Failed to get stored credentials:', error);
      return null;
    }
  }

  /**
   * Clear stored credentials
   */
  static async clearCredentials(): Promise<boolean> {
    try {
      await Promise.all([
        AsyncStorage.removeItem(this.KEYS.REMEMBER_ME),
        AsyncStorage.removeItem(this.KEYS.STORED_CREDENTIALS),
      ]);
      console.log('✅ Credentials cleared');
      return true;
    } catch (error) {
      console.error('❌ Failed to clear credentials:', error);
      return false;
    }
  }

  /**
   * Clear all authentication data (logout)
   */
  static async clearAuthData(): Promise<boolean> {
    try {
      await AsyncStorage.multiRemove([
        this.KEYS.TOKEN,
        this.KEYS.USER,
        this.KEYS.USER_TYPE,
        this.KEYS.AUTHENTICATED,
        this.KEYS.REFRESH_TOKEN,
      ]);
      console.log('✅ Auth data cleared');
      return true;
    } catch (error) {
      console.error('❌ Failed to clear auth data:', error);
      return false;
    }
  }

  /**
   * Clear everything (complete logout)
   */
  static async clearAll(): Promise<boolean> {
    try {
      await AsyncStorage.multiRemove([
        this.KEYS.TOKEN,
        this.KEYS.USER,
        this.KEYS.USER_TYPE,
        this.KEYS.AUTHENTICATED,
        this.KEYS.REMEMBER_ME,
        this.KEYS.STORED_CREDENTIALS,
        this.KEYS.REFRESH_TOKEN,
      ]);
      console.log('✅ All storage cleared');
      return true;
    } catch (error) {
      console.error('❌ Failed to clear all storage:', error);
      return false;
    }
  }

  /**
   * Get authorization header for API calls
   */
  static async getAuthHeader(): Promise<{ Authorization: string } | {}> {
    try {
      const token = await this.getToken();
      return token ? { Authorization: `Bearer ${token}` } : {};
    } catch (error) {
      console.error('❌ Failed to get auth header:', error);
      return {};
    }
  }

  /**
   * Update stored user data (for profile updates)
   */
  static async updateUser(userData: any): Promise<boolean> {
    try {
      await AsyncStorage.setItem(this.KEYS.USER, JSON.stringify(userData));
      console.log('✅ User data updated');
      return true;
    } catch (error) {
      console.error('❌ Failed to update user data:', error);
      return false;
    }
  }

  /**
   * Debug: Get all stored data (for development)
   */
  static async getAllStoredData(): Promise<any> {
    try {
      const keys = Object.values(this.KEYS);
      const values = await AsyncStorage.multiGet(keys);
      
      const data: any = {};
      values.forEach(([key, value]) => {
        data[key] = value;
      });
      
      return data;
    } catch (error) {
      console.error('❌ Failed to get all stored data:', error);
      return {};
    }
  }
}

export default TokenStorage;
