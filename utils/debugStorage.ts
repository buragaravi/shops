import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

/**
 * Debug utility for storage issues across iOS/Android
 */
export class DebugStorage {
  
  /**
   * Get all auth-related storage data for debugging
   */
  static async getAllAuthData(): Promise<any> {
    try {
      const keys = [
        'userToken',
        'userProfile', 
        'isAuthenticated',
        'remember_me',
        'stored_credentials'
      ];
      
      const values = await AsyncStorage.multiGet(keys);
      const data: any = {
        platform: Platform.OS,
        timestamp: new Date().toISOString()
      };
      
      values.forEach(([key, value]) => {
        data[key] = value;
        if (key === 'userProfile' && value) {
          try {
            data[`${key}_parsed`] = JSON.parse(value);
          } catch (e: any) {
            data[`${key}_parseError`] = e.message;
          }
        }
      });
      
      return data;
    } catch (error: any) {
      console.error('Debug storage error:', error);
      return { error: error.message, platform: Platform.OS };
    }
  }
  
  /**
   * Log all auth data to console
   */
  static async logAllAuthData(): Promise<void> {
    const data = await this.getAllAuthData();
    console.log('🔍 DEBUG STORAGE DATA:', JSON.stringify(data, null, 2));
  }
  
  /**
   * Test storage write/read cycle
   */
  static async testStorageCycle(): Promise<boolean> {
    try {
      const testKey = 'storage_test';
      const testValue = { test: true, timestamp: Date.now(), platform: Platform.OS };
      
      // Write
      await AsyncStorage.setItem(testKey, JSON.stringify(testValue));
      
      // Read
      const retrieved = await AsyncStorage.getItem(testKey);
      
      // Clean up
      await AsyncStorage.removeItem(testKey);
      
      if (retrieved) {
        const parsed = JSON.parse(retrieved);
        console.log('✅ Storage test passed:', parsed);
        return true;
      } else {
        console.log('❌ Storage test failed: No data retrieved');
        return false;
      }
    } catch (error: any) {
      console.error('❌ Storage test error:', error);
      return false;
    }
  }
  
  /**
   * Clear all storage (for debugging)
   */
  static async clearAllStorage(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      await AsyncStorage.multiRemove(keys);
      console.log('🧹 All storage cleared for debugging');
    } catch (error: any) {
      console.error('Clear storage error:', error);
    }
  }
}

export default DebugStorage;
