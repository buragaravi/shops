import { Appearance } from 'react-native';

// Color palette with green vibrant theme and claymorphism inspiration
export const COLOR_PALETTE = {
  // Primary greens - vibrant and elegant
  primary: {
    50: '#f0fdf4',   // Very light green
    100: '#dcfce7',  // Light green
    200: '#bbf7d0',  // Soft green
    300: '#86efac',  // Medium green
    400: '#4ade80',  // Vibrant green
    500: '#22c55e',  // Primary green
    600: '#16a34a',  // Dark green
    700: '#15803d',  // Darker green
    800: '#166534',  // Very dark green
    900: '#14532d',  // Deepest green
  },
  
  // Secondary colors - vibrant accents
  secondary: {
    orange: '#ff6b35',
    purple: '#8b5cf6',
    blue: '#3b82f6',
    pink: '#ec4899',
    yellow: '#f59e0b',
    teal: '#14b8a6',
  },
  
  // Neutral colors for backgrounds and text
  neutral: {
    white: '#ffffff',
    gray50: '#f9fafb',
    gray100: '#f3f4f6',
    gray200: '#e5e7eb',
    gray300: '#d1d5db',
    gray400: '#9ca3af',
    gray500: '#6b7280',
    gray600: '#4b5563',
    gray700: '#374151',
    gray800: '#1f2937',
    gray900: '#111827',
    black: '#000000',
  },
  
  // Status colors
  status: {
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  }
};

// Light theme configuration
export const LIGHT_THEME = {
  // Background colors with claymorphism feel
  background: {
    primary: COLOR_PALETTE.neutral.white,
    secondary: COLOR_PALETTE.primary[50],
    surface: COLOR_PALETTE.neutral.gray50,
    elevated: COLOR_PALETTE.neutral.white,
    overlay: 'rgba(255, 255, 255, 0.9)',
    blur: 'rgba(255, 255, 255, 0.8)',
  },
  
  // Text colors
  text: {
    primary: COLOR_PALETTE.neutral.gray900,
    secondary: COLOR_PALETTE.neutral.gray600,
    tertiary: COLOR_PALETTE.neutral.gray400,
    inverse: COLOR_PALETTE.neutral.white,
    accent: COLOR_PALETTE.primary[600],
  },
  
  // Primary colors
  primary: COLOR_PALETTE.primary[500],
  primaryLight: COLOR_PALETTE.primary[100],
  primaryDark: COLOR_PALETTE.primary[700],
  
  // Border and divider colors
  border: COLOR_PALETTE.neutral.gray200,
  divider: COLOR_PALETTE.neutral.gray100,
  
  // Card and component colors
  card: {
    background: COLOR_PALETTE.neutral.white,
    border: COLOR_PALETTE.neutral.gray100,
    shadow: 'rgba(0, 0, 0, 0.05)',
  },
  
  // Status colors
  success: COLOR_PALETTE.status.success,
  warning: COLOR_PALETTE.status.warning,
  error: COLOR_PALETTE.status.error,
  info: COLOR_PALETTE.status.info,
  
  // Icon backgrounds - vibrant colors
  iconBackgrounds: [
    COLOR_PALETTE.secondary.orange,
    COLOR_PALETTE.secondary.purple,
    COLOR_PALETTE.secondary.blue,
    COLOR_PALETTE.secondary.pink,
    COLOR_PALETTE.secondary.yellow,
    COLOR_PALETTE.secondary.teal,
    COLOR_PALETTE.primary[400],
    COLOR_PALETTE.primary[600],
  ],
};

// Dark theme configuration
export const DARK_THEME = {
  // Background colors with claymorphism feel
  background: {
    primary: COLOR_PALETTE.neutral.gray900,
    secondary: COLOR_PALETTE.neutral.gray800,
    surface: COLOR_PALETTE.neutral.gray800,
    elevated: COLOR_PALETTE.neutral.gray700,
    overlay: 'rgba(0, 0, 0, 0.9)',
    blur: 'rgba(0, 0, 0, 0.8)',
  },
  
  // Text colors
  text: {
    primary: COLOR_PALETTE.neutral.white,
    secondary: COLOR_PALETTE.neutral.gray300,
    tertiary: COLOR_PALETTE.neutral.gray500,
    inverse: COLOR_PALETTE.neutral.gray900,
    accent: COLOR_PALETTE.primary[400],
  },
  
  // Primary colors (adjusted for dark mode)
  primary: COLOR_PALETTE.primary[400],
  primaryLight: COLOR_PALETTE.primary[200],
  primaryDark: COLOR_PALETTE.primary[600],
  
  // Border and divider colors
  border: COLOR_PALETTE.neutral.gray700,
  divider: COLOR_PALETTE.neutral.gray800,
  
  // Card and component colors
  card: {
    background: COLOR_PALETTE.neutral.gray800,
    border: COLOR_PALETTE.neutral.gray700,
    shadow: 'rgba(0, 0, 0, 0.3)',
  },
  
  // Status colors (adjusted for dark mode)
  success: COLOR_PALETTE.status.success,
  warning: COLOR_PALETTE.status.warning,
  error: COLOR_PALETTE.status.error,
  info: COLOR_PALETTE.status.info,
  
  // Icon backgrounds - vibrant colors (same as light)
  iconBackgrounds: [
    COLOR_PALETTE.secondary.orange,
    COLOR_PALETTE.secondary.purple,
    COLOR_PALETTE.secondary.blue,
    COLOR_PALETTE.secondary.pink,
    COLOR_PALETTE.secondary.yellow,
    COLOR_PALETTE.secondary.teal,
    COLOR_PALETTE.primary[400],
    COLOR_PALETTE.primary[600],
  ],
};

// Theme hook to get current theme based on system preference
export const useTheme = () => {
  const colorScheme = Appearance.getColorScheme();
  const isDark = colorScheme === 'dark';
  
  return {
    theme: isDark ? DARK_THEME : LIGHT_THEME,
    isDark,
    colorScheme,
  };
};

// Claymorphism shadow presets
export const SHADOWS = {
  // Soft clay-like shadows
  clay: {
    light: {
      shadowColor: COLOR_PALETTE.neutral.gray400,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    medium: {
      shadowColor: COLOR_PALETTE.neutral.gray500,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 6,
    },
    heavy: {
      shadowColor: COLOR_PALETTE.neutral.gray600,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 12,
    },
  },
  
  // Inset shadows for pressed states
  inset: {
    shadowColor: COLOR_PALETTE.neutral.gray500,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: -2,
  },
};

// Border radius presets for organic, clay-like shapes
export const BORDER_RADIUS = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  pill: 50, // For pill-shaped buttons
  circle: 999, // For circular elements
};

// Spacing system
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
};

// Typography system
export const TYPOGRAPHY = {
  // Font sizes
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    huge: 48,
  },
  
  // Font weights
  fontWeight: {
    light: '300' as const,
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },
  
  // Line heights
  lineHeight: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
    loose: 1.8,
  },
};

// Animation durations for smooth UX
export const ANIMATIONS = {
  fast: 150,
  normal: 300,
  slow: 500,
  verySlow: 800,
};

// Screen breakpoints for responsive design
export const BREAKPOINTS = {
  mobile: 0,
  tablet: 768,
  desktop: 1024,
};

export default {
  COLOR_PALETTE,
  LIGHT_THEME,
  DARK_THEME,
  useTheme,
  SHADOWS,
  BORDER_RADIUS,
  SPACING,
  TYPOGRAPHY,
  ANIMATIONS,
  BREAKPOINTS,
};
