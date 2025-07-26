import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { API_BASE_URL, API_ENDPOINTS } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import ReferralCodeInput from '../components/ReferralCodeInput';
import TokenStorage from '../utils/tokenStorage';

interface LoginForm {
  username: string;
  password: string;
}

interface RegisterForm {
  username: string;
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  referralCode: string;
}

export default function AuthScreen() {
  const router = useRouter();
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [validReferralCode, setValidReferralCode] = useState(false);

  // Login form state
  const [loginForm, setLoginForm] = useState<LoginForm>({
    username: '',
    password: '',
  });

  // Register form state
  const [registerForm, setRegisterForm] = useState<RegisterForm>({
    username: '',
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    referralCode: '',
  });

  const handleReferralCodeChange = (code: string, isValid: boolean) => {
    setRegisterForm({ ...registerForm, referralCode: code });
    setValidReferralCode(isValid);
  };

  // Handle login
  const handleLogin = async () => {
    try {
      setLoading(true);

      // Validate form
      if (!loginForm.username || !loginForm.password) {
        Alert.alert('Error', 'Please fill in all fields');
        return;
      }

      // Make API call directly (not using AuthContext for now)
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.AUTH.LOGIN}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          username: loginForm.username, 
          password: loginForm.password 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Store token and user data using TokenStorage
      await TokenStorage.storeAuthData({
        token: data.token,
        user: data.user,
        userType: 'user'
      });

      // Store credentials for remember me if needed
      await TokenStorage.storeCredentials(
        loginForm.username, 
        loginForm.password, 
        rememberMe
      );

      Alert.alert('Success', 'Login successful!', [
        {
          text: 'OK',
          onPress: () => {
            // Navigate back to previous screen or home
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/');
            }
          },
        },
      ]);
    } catch (error: any) {
      console.error('Login error:', error);
      Alert.alert('Login Failed', error.message || 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  // Handle registration
  const handleRegister = async () => {
    try {
      setLoading(true);

      // Validate form
      if (!registerForm.username || !registerForm.name || !registerForm.email || 
          !registerForm.phone || !registerForm.password || !registerForm.confirmPassword) {
        Alert.alert('Error', 'Please fill in all required fields');
        return;
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(registerForm.email)) {
        Alert.alert('Error', 'Please enter a valid email address');
        return;
      }

      // Phone validation
      const phoneRegex = /^[0-9]{10}$/;
      if (!phoneRegex.test(registerForm.phone.replace(/\D/g, ''))) {
        Alert.alert('Error', 'Please enter a valid 10-digit phone number');
        return;
      }

      // Password validation
      if (registerForm.password.length < 6) {
        Alert.alert('Error', 'Password must be at least 6 characters long');
        return;
      }

      if (registerForm.password !== registerForm.confirmPassword) {
        Alert.alert('Error', 'Passwords do not match');
        return;
      }

      const registrationData: any = {
        username: registerForm.username.trim(),
        name: registerForm.name.trim(),
        email: registerForm.email ? registerForm.email.toLowerCase().trim() : '',
        phone: registerForm.phone.replace(/\D/g, ''),
        password: registerForm.password,
      };

      // Include referral code if provided
      if (registerForm.referralCode && registerForm.referralCode.trim()) {
        registrationData.referralCode = registerForm.referralCode.trim();
      }

      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.AUTH.REGISTER}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registrationData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      let successMessage = 'Registration successful! You can now login.';
      if (registerForm.referralCode && validReferralCode) {
        successMessage += ' Your referrer has been rewarded with bonus coins!';
      }

      Alert.alert(
        'Registration Successful', 
        successMessage,
        [
          {
            text: 'OK',
            onPress: () => setIsLogin(true),
          },
        ]
      );

      // Clear form
      setRegisterForm({
        username: '',
        name: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        referralCode: '',
      });

    } catch (error: any) {
      console.error('Registration error:', error);
      Alert.alert('Registration Failed', error.message || 'An error occurred during registration');
    } finally {
      setLoading(false);
    }
  };

  // Skip authentication (guest mode)
  const handleSkip = () => {
    Alert.alert(
      'Continue as Guest',
      'You can browse products and add items to cart. Sign in later to sync your data across devices.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          onPress: () => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/');
            }
          },
        },
      ]
    );
  };

  const renderLoginForm = () => (
    <>
      <View style={styles.inputContainer}>
        <Ionicons name="person-outline" size={20} color="#6b7280" style={styles.inputIcon} />
        <TextInput
          style={styles.textInput}
          placeholder="Username"
          value={loginForm.username}
          onChangeText={(text) => setLoginForm({ ...loginForm, username: text })}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <View style={styles.inputContainer}>
        <Ionicons name="lock-closed-outline" size={20} color="#6b7280" style={styles.inputIcon} />
        <TextInput
          style={styles.textInput}
          placeholder="Password"
          value={loginForm.password}
          onChangeText={(text) => setLoginForm({ ...loginForm, password: text })}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
        />
        <TouchableOpacity
          onPress={() => setShowPassword(!showPassword)}
          style={styles.eyeIcon}
        >
          <Ionicons
            name={showPassword ? "eye-off-outline" : "eye-outline"}
            size={20}
            color="#6b7280"
          />
        </TouchableOpacity>
      </View>

      {/* Remember Me Checkbox */}
      <View style={styles.rememberMeContainer}>
        <TouchableOpacity
          style={styles.checkboxContainer}
          onPress={() => setRememberMe(!rememberMe)}
        >
          <View style={[styles.checkbox, rememberMe && styles.checkedCheckbox]}>
            {rememberMe && (
              <Ionicons name="checkmark" size={14} color="#ffffff" />
            )}
          </View>
          <Text style={styles.rememberMeText}>Remember me</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.forgotPassword}>
        <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.authButton, loading && styles.disabledButton]}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.authButtonText}>Sign In</Text>
        )}
      </TouchableOpacity>
    </>
  );

  const renderRegisterForm = () => (
    <>
      <View style={styles.inputContainer}>
        <Ionicons name="person-outline" size={20} color="#6b7280" style={styles.inputIcon} />
        <TextInput
          style={styles.textInput}
          placeholder="Username"
          value={registerForm.username}
          onChangeText={(text) => setRegisterForm({ ...registerForm, username: text })}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <View style={styles.inputContainer}>
        <Ionicons name="person-outline" size={20} color="#6b7280" style={styles.inputIcon} />
        <TextInput
          style={styles.textInput}
          placeholder="Full Name"
          value={registerForm.name}
          onChangeText={(text) => setRegisterForm({ ...registerForm, name: text })}
          autoCapitalize="words"
        />
      </View>

      <View style={styles.inputContainer}>
        <Ionicons name="mail-outline" size={20} color="#6b7280" style={styles.inputIcon} />
        <TextInput
          style={styles.textInput}
          placeholder="Email address"
          value={registerForm.email}
          onChangeText={(text) => setRegisterForm({ ...registerForm, email: text })}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <View style={styles.inputContainer}>
        <Ionicons name="call-outline" size={20} color="#6b7280" style={styles.inputIcon} />
        <TextInput
          style={styles.textInput}
          placeholder="Phone number"
          value={registerForm.phone}
          onChangeText={(text) => setRegisterForm({ ...registerForm, phone: text })}
          keyboardType="phone-pad"
          maxLength={10}
        />
      </View>

      <View style={styles.inputContainer}>
        <Ionicons name="lock-closed-outline" size={20} color="#6b7280" style={styles.inputIcon} />
        <TextInput
          style={styles.textInput}
          placeholder="Password"
          value={registerForm.password}
          onChangeText={(text) => setRegisterForm({ ...registerForm, password: text })}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
        />
        <TouchableOpacity
          onPress={() => setShowPassword(!showPassword)}
          style={styles.eyeIcon}
        >
          <Ionicons
            name={showPassword ? "eye-off-outline" : "eye-outline"}
            size={20}
            color="#6b7280"
          />
        </TouchableOpacity>
      </View>

      <View style={styles.inputContainer}>
        <Ionicons name="lock-closed-outline" size={20} color="#6b7280" style={styles.inputIcon} />
        <TextInput
          style={styles.textInput}
          placeholder="Confirm Password"
          value={registerForm.confirmPassword}
          onChangeText={(text) => setRegisterForm({ ...registerForm, confirmPassword: text })}
          secureTextEntry={!showConfirmPassword}
          autoCapitalize="none"
        />
        <TouchableOpacity
          onPress={() => setShowConfirmPassword(!showConfirmPassword)}
          style={styles.eyeIcon}
        >
          <Ionicons
            name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
            size={20}
            color="#6b7280"
          />
        </TouchableOpacity>
      </View>

      <ReferralCodeInput 
        onCodeChange={handleReferralCodeChange}
        initialCode={registerForm.referralCode}
      />

      <TouchableOpacity
        style={[styles.authButton, loading && styles.disabledButton]}
        onPress={handleRegister}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.authButtonText}>Create Account</Text>
        )}
      </TouchableOpacity>
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#1f2937" />
            </TouchableOpacity>
            
            <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          </View>

          {/* Logo/Title */}
          <View style={styles.logoContainer}>
            <View style={styles.logo}>
              <Ionicons name="storefront" size={48} color="#2563eb" />
            </View>
            <Text style={styles.appName}>Indiraa1</Text>
            <Text style={styles.subtitle}>
              {isLogin ? 'Welcome back!' : 'Create your account'}
            </Text>
          </View>

          {/* Tab Switcher */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, isLogin && styles.activeTab]}
              onPress={() => setIsLogin(true)}
            >
              <Text style={[styles.tabText, isLogin && styles.activeTabText]}>
                Sign In
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.tab, !isLogin && styles.activeTab]}
              onPress={() => setIsLogin(false)}
            >
              <Text style={[styles.tabText, !isLogin && styles.activeTabText]}>
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form */}
          <View style={styles.formContainer}>
            {isLogin ? renderLoginForm() : renderRegisterForm()}
          </View>

          {/* Switch Auth Mode */}
          <View style={styles.switchContainer}>
            <Text style={styles.switchText}>
              {isLogin ? "Don't have an account? " : "Already have an account? "}
            </Text>
            <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
              <Text style={styles.switchLink}>
                {isLogin ? 'Sign Up' : 'Sign In'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Social Login Placeholder */}
          <View style={styles.socialContainer}>
            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.divider} />
            </View>

            <View style={styles.socialButtons}>
              <TouchableOpacity style={styles.socialButton}>
                <Ionicons name="logo-google" size={24} color="#db4437" />
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.socialButton}>
                <Ionicons name="logo-facebook" size={24} color="#3b5998" />
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.socialButton}>
                <Ionicons name="logo-apple" size={24} color="#000000" />
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  skipButton: {
    padding: 8,
  },
  skipText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  logoContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 40,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 30,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6b7280',
  },
  activeTabText: {
    color: '#1f2937',
    fontWeight: '600',
  },
  formContainer: {
    paddingHorizontal: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    width: '48%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 16,
    backgroundColor: '#ffffff',
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
    paddingVertical: 12,
  },
  eyeIcon: {
    padding: 4,
  },
  rememberMeContainer: {
    marginBottom: 16,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  checkedCheckbox: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  rememberMeText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '500',
  },
  authButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  disabledButton: {
    opacity: 0.6,
  },
  authButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  switchText: {
    fontSize: 14,
    color: '#6b7280',
  },
  switchLink: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '600',
  },
  socialContainer: {
    paddingHorizontal: 20,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  dividerText: {
    fontSize: 12,
    color: '#9ca3af',
    marginHorizontal: 16,
  },
  socialButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  socialButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
