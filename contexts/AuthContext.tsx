import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, API_ENDPOINTS } from '../constants';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  phone: string;
  isVerified: boolean;
  createdAt: string;
}

interface AuthContextType {
  // State
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  loading: boolean;
  loadingMessage: string;
  
  // Actions
  login: (username: string, password: string, rememberMe?: boolean, isAutoLogin?: boolean) => Promise<boolean>;
  register: (userData: RegisterData) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  updateProfile: (userData: Partial<User>) => Promise<boolean>;
  checkAuthStatus: () => Promise<void>;
}

interface RegisterData {
  firstName: string;
  lastName: string;
  username: string;
  phone: string;
  password: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Initializing...');

  // Check authentication status on app start  
  useEffect(() => {
    const initializeAuth = async () => {
      // Add a small delay to ensure any ongoing operations complete
      await new Promise(resolve => setTimeout(resolve, 100));
      checkAuthStatus();
    };
    initializeAuth();
  }, []);

  // Add a periodic check for auth status changes
  useEffect(() => {
    const checkInterval = setInterval(async () => {
      // Only check if we're currently not authenticated
      if (!isAuthenticated && !loading) {
        const storedToken = await AsyncStorage.getItem('userToken');
        const storedUser = await AsyncStorage.getItem('userProfile');
        const authFlag = await AsyncStorage.getItem('isAuthenticated');
        
        if (storedToken && storedUser && authFlag === 'true') {
          console.log('🔄 Detected stored auth data, updating state...');
          try {
            const userData = JSON.parse(storedUser);
            setToken(storedToken);
            setUser(userData);
            setIsAuthenticated(true);
            console.log('✅ Auth state updated from periodic check');
          } catch (error) {
            console.error('Error parsing stored user data:', error);
          }
        }
      }
    }, 2000); // Check every 2 seconds

    return () => clearInterval(checkInterval);
  }, [isAuthenticated, loading]);

  // Check if user is authenticated
  const checkAuthStatus = async () => {
    try {
      setLoading(true);
      setLoadingMessage('Checking authentication...');
      console.log('🔍 Starting authentication check...');
      
      const storedToken = await AsyncStorage.getItem('userToken');

      if (storedToken) {
        console.log('📱 Found stored token. Validating with backend...');
        
        // If a token exists, it's the source of truth. Validate it.
        const isValid = await validateToken(storedToken);

        if (isValid) {
          console.log('✅ Token is valid. Session restored.');
          // The user, token, and auth state are set within validateToken
        } else {
          console.log('❌ Token is invalid. User is logged out.');
          // clearAuthData is called within validateToken on failure
        }
      } else {
        // No token, check for auto-login credentials
        console.log('❌ No stored token found. Checking for auto-login credentials...');
        const rememberMe = await AsyncStorage.getItem('remember_me');
        if (rememberMe === 'true') {
          const storedCredentials = await AsyncStorage.getItem('stored_credentials');
          if (storedCredentials) {
            try {
              const { username, password } = JSON.parse(storedCredentials);
              setLoadingMessage('Welcome back! Signing you in...');
              console.log('🔄 Attempting auto-login for remembered user...');
              await login(username, password, true, true);
            } catch (error) {
              console.log('Failed to parse or use auto-login credentials:', error);
              await clearAuthData(); // Clear potentially corrupt data
            }
          }
        } else {
           console.log('ℹ️ No token and no auto-login. User is not logged in.');
           setIsAuthenticated(false);
           setUser(null);
           setToken(null);
        }
      }
    } catch (error) {
      console.error('Error during auth status check:', error);
      await clearAuthData(); // Clear data on critical errors
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  // Validate token with backend
  const validateToken = async (authToken: string): Promise<boolean> => {
    try {
      console.log('🔍 Validating token with backend...');
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.AUTH.PROFILE}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const userData = await response.json();
        console.log('✅ Token validation successful');
        setUser(userData.user || userData);
        setToken(authToken);
        setIsAuthenticated(true);
        return true;
      } else if (response.status === 401 || response.status === 403) {
        // Only clear auth data for authentication errors (401, 403)
        console.log('❌ Token is invalid (401/403), clearing auth data');
        await clearAuthData();
        return false;
      } else {
        // For other errors (500, 404, etc.), keep the user logged in
        console.log(`⚠️ Token validation failed with status ${response.status}, but keeping user logged in`);
        return true;
      }
    } catch (error) {
      console.error('Token validation error:', error);
      // On network errors, keep the user logged in
      console.log('⚠️ Network error during token validation, keeping user logged in');
      return true;
    }
  };

  // Login function
  const login = async (
    username: string, 
    password: string, 
    rememberMe: boolean = false, 
    isAutoLogin: boolean = false
  ): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.AUTH.LOGIN}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username ? username.toLowerCase().trim() : '',
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Store auth data
      const storagePromises = [
        AsyncStorage.setItem('userToken', data.token),
        AsyncStorage.setItem('userProfile', JSON.stringify(data.user)),
        AsyncStorage.setItem('isAuthenticated', 'true'),
      ];

      // Handle "Remember Me" functionality
      if (rememberMe) {
        storagePromises.push(
          AsyncStorage.setItem('remember_me', 'true'),
          AsyncStorage.setItem('stored_credentials', JSON.stringify({ username, password }))
        );
      } else {
        // Clear remember me data if not checked
        storagePromises.push(
          AsyncStorage.removeItem('remember_me'),
          AsyncStorage.removeItem('stored_credentials')
        );
      }

      await Promise.all(storagePromises);

      // Update state immediately
      console.log('🔄 Updating AuthContext state...');
      console.log('📊 Login data received:', { 
        tokenExists: !!data.token, 
        userExists: !!data.user, 
        userName: data.user?.firstName 
      });
      
      setToken(data.token);
      setUser(data.user);
      setIsAuthenticated(true);
      console.log('✅ AuthContext state updated - isAuthenticated: true');
      console.log('🎯 Auth state after login - isAuthenticated:', true, 'user:', data.user?.firstName);
      
      // Add a small delay to ensure state is set before any subsequent checks
      setTimeout(() => {
        console.log('🔍 Final auth state check - isAuthenticated:', isAuthenticated);
        // Force a manual state update to ensure consistency
        setIsAuthenticated(true);
        setUser(data.user);
        setToken(data.token);
        console.log('🔄 Forced state update completed');
      }, 100);

      if (!isAutoLogin) {
        console.log('Login successful for:', username);
      }

      return true;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  // Register function
  const register = async (userData: RegisterData): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.AUTH.REGISTER}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: userData.firstName.trim(),
          lastName: userData.lastName.trim(),
          username: userData.username.toLowerCase().trim(),
          phone: userData.phone.replace(/\D/g, ''),
          password: userData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      return true;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  // Logout function
  const logout = async (): Promise<void> => {
    try {
      // Clear backend session if needed
      if (token) {
        try {
          await fetch(`${API_BASE_URL}/api/auth/logout`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
        } catch (error) {
          console.error('Backend logout error:', error);
          // Continue with local logout even if backend fails
        }
      }

      await clearAuthData();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Clear authentication data
  const clearAuthData = async (): Promise<void> => {
    try {
      console.log('🧹 Clearing auth data...');
      console.log('📍 clearAuthData called - this will set isAuthenticated to false');
      console.trace('🔍 Call stack for clearAuthData:');
      await Promise.all([
        AsyncStorage.removeItem('userToken'),
        AsyncStorage.removeItem('userProfile'),
        AsyncStorage.removeItem('isAuthenticated'),
        AsyncStorage.removeItem('remember_me'),
        AsyncStorage.removeItem('stored_credentials'),
      ]);

      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
      console.log('✅ Credentials cleared - isAuthenticated now: false');
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  };

  // Refresh token
  const refreshToken = async (): Promise<boolean> => {
    try {
      if (!token) return false;

      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.AUTH.REFRESH_TOKEN}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        
        await Promise.all([
          AsyncStorage.setItem('userToken', data.token),
          AsyncStorage.setItem('userProfile', JSON.stringify(data.user)),
        ]);

        setToken(data.token);
        setUser(data.user);
        
        return true;
      } else {
        await clearAuthData();
        return false;
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      return false;
    }
  };

  // Update user profile
  const updateProfile = async (userData: Partial<User>): Promise<boolean> => {
    try {
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.AUTH.PROFILE}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (response.ok) {
        const data = await response.json();
        const updatedUser = data.user || data;
        
        await AsyncStorage.setItem('userProfile', JSON.stringify(updatedUser));
        setUser(updatedUser);
        
        return true;
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Profile update failed');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    // State
    isAuthenticated,
    user,
    token,
    loading,
    loadingMessage,
    
    // Actions
    login,
    register,
    logout,
    refreshToken,
    updateProfile,
    checkAuthStatus,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook to use authentication context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Higher-order component for protected routes
export const withAuth = <P extends object>(Component: React.ComponentType<P>) => {
  return (props: P) => {
    const { isAuthenticated, loading } = useAuth();
    
    if (loading) {
      return null; // or a loading spinner
    }
    
    if (!isAuthenticated) {
      return null; // or redirect to auth screen
    }
    
    return <Component {...props} />;
  };
};

export default AuthContext;
