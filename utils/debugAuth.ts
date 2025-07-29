import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export const debugAuthState = async () => {
  try {
    console.log('🔍 [DEBUG AUTH] Starting comprehensive auth state debug...');
    
    // Get all auth-related storage items
    const [
      userToken,
      userProfile,
      isAuthenticated,
      rememberMe,
      storedCredentials,
    ] = await Promise.all([
      AsyncStorage.getItem('userToken'),
      AsyncStorage.getItem('userProfile'),
      AsyncStorage.getItem('isAuthenticated'),
      AsyncStorage.getItem('remember_me'),
      AsyncStorage.getItem('stored_credentials'),
    ]);

    const debugInfo = {
      platform: Platform.OS,
      timestamp: new Date().toISOString(),
      storage: {
        userToken: {
          exists: !!userToken,
          length: userToken?.length || 0,
          preview: userToken ? `${userToken.substring(0, 20)}...` : null,
          type: typeof userToken,
        },
        userProfile: {
          exists: !!userProfile,
          length: userProfile?.length || 0,
          canParse: false,
          parsed: null as any,
        },
        isAuthenticated: {
          value: isAuthenticated,
          type: typeof isAuthenticated,
          isTrue: isAuthenticated === 'true',
        },
        rememberMe: {
          value: rememberMe,
          type: typeof rememberMe,
          isTrue: rememberMe === 'true',
        },
        storedCredentials: {
          exists: !!storedCredentials,
          length: storedCredentials?.length || 0,
        },
      },
    };

    // Try to parse user profile
    if (userProfile) {
      try {
        const parsed = JSON.parse(userProfile);
        debugInfo.storage.userProfile.canParse = true;
        debugInfo.storage.userProfile.parsed = {
          id: parsed.id,
          username: parsed.username,
          firstName: parsed.firstName,
          lastName: parsed.lastName,
        };
      } catch (error) {
        debugInfo.storage.userProfile.canParse = false;
        console.error('❌ [DEBUG AUTH] Cannot parse user profile:', error);
      }
    }

    console.log('📊 [DEBUG AUTH] Complete state:', debugInfo);
    
    return debugInfo;
  } catch (error) {
    console.error('❌ [DEBUG AUTH] Error during debug:', error);
    return null;
  }
};

export const testTokenPersistence = async () => {
  console.log('🧪 [TEST TOKEN] Starting token persistence test...');
  
  try {
    const testToken = `test_token_${Date.now()}`;
    
    // Write test token
    await AsyncStorage.setItem('test_token', testToken);
    console.log('✅ [TEST TOKEN] Test token written');
    
    // Immediately read it back
    const immediateRead = await AsyncStorage.getItem('test_token');
    console.log('📖 [TEST TOKEN] Immediate read:', {
      success: immediateRead === testToken,
      expected: testToken,
      actual: immediateRead,
    });
    
    // Wait a bit and read again
    await new Promise(resolve => setTimeout(resolve, 1000));
    const delayedRead = await AsyncStorage.getItem('test_token');
    console.log('⏰ [TEST TOKEN] Delayed read:', {
      success: delayedRead === testToken,
      expected: testToken,
      actual: delayedRead,
    });
    
    // Clean up
    await AsyncStorage.removeItem('test_token');
    console.log('🧹 [TEST TOKEN] Test cleaned up');
    
    return {
      immediate: immediateRead === testToken,
      delayed: delayedRead === testToken,
    };
  } catch (error) {
    console.error('❌ [TEST TOKEN] Error during test:', error);
    return { immediate: false, delayed: false };
  }
};

export const clearAndDebugAuth = async () => {
  console.log('🗑️ [CLEAR DEBUG] Clearing all auth data and debugging...');
  
  try {
    // Debug before clear
    await debugAuthState();
    
    // Clear all auth data
    await AsyncStorage.multiRemove([
      'userToken',
      'userProfile', 
      'isAuthenticated',
      'remember_me',
      'stored_credentials',
    ]);
    
    console.log('✅ [CLEAR DEBUG] Auth data cleared');
    
    // Debug after clear
    await debugAuthState();
    
  } catch (error) {
    console.error('❌ [CLEAR DEBUG] Error during clear and debug:', error);
  }
};
