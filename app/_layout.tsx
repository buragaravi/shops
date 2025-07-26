import { Stack } from "expo-router";
import { Provider } from 'react-redux';
import { store } from '../store';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider } from '../theme/ThemeProvider';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { CartWishlistProvider } from '../contexts/CartWishlistContext';
import { AppProvider } from '../contexts/AppContext';
import SplashScreen from '../components/SplashScreen';

function AppContent() {
  const { loading, loadingMessage } = useAuth();

  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="auth" options={{ presentation: 'modal' }} />
        <Stack.Screen name="product/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="combo/[id]" options={{ presentation: 'modal' }} />
      </Stack>
      {loading && (
        <SplashScreen 
          isLoading={loading} 
          message={loadingMessage || "Welcome back! Signing you in..."}
        />
      )}
    </>
  );
}

export default function RootLayout() {
  return (
    <Provider store={store}>
      <ThemeProvider>
        <AuthProvider>
          <AppProvider>
            <CartWishlistProvider>
              <AppContent />
            </CartWishlistProvider>
          </AppProvider>
        </AuthProvider>
      </ThemeProvider>
    </Provider>
  );
}
