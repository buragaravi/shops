import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Text,
  Animated,
  Image,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../theme/ThemeProvider';
import { SHADOWS, BORDER_RADIUS, SPACING, TYPOGRAPHY } from '../../theme';

interface Banner {
  _id: string;
  title: string;
  subtitle?: string;
  image: string;
  link?: string;
  isActive: boolean;
  backgroundColor?: string;
  textColor?: string;
  buttonText?: string;
}

interface EnhancedHeroSectionProps {
  banners: Banner[];
  onBannerPress: (banner: Banner) => void;
  autoSlide?: boolean;
  slideInterval?: number;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const HERO_HEIGHT = (screenWidth * 9) / 18; // 18:9 aspect ratio

const EnhancedHeroSection: React.FC<EnhancedHeroSectionProps> = ({
  banners,
  onBannerPress,
  autoSlide = true,
  slideInterval = 4000,
}) => {
  const { theme, isDark } = useAppTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const intervalRef = useRef<any>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Auto-slide functionality
  useEffect(() => {
    if (autoSlide && banners.length > 1) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prevIndex) => {
          const nextIndex = (prevIndex + 1) % banners.length;
          scrollToIndex(nextIndex);
          return nextIndex;
        });
      }, slideInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoSlide, banners.length, slideInterval]);

  const scrollToIndex = (index: number) => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({
        x: index * screenWidth,
        animated: true,
      });
    }
  };

  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / screenWidth);
    setCurrentIndex(index);
  };

  const handleBannerPress = (banner: Banner) => {
    // Animate press feedback
    Animated.sequence([
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0.8,
          duration: 100,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    onBannerPress(banner);
  };

  const renderBanner = (banner: Banner, index: number) => {
    const isActive = index === currentIndex;
    
    return (
      <Animated.View
        key={banner._id}
        style={[
          styles.bannerContainer,
          {
            transform: [
              { scale: isActive ? scaleAnim : 1 },
            ],
            opacity: isActive ? fadeAnim : 1,
          }
        ]}
      >
        <TouchableOpacity
          style={styles.banner}
          onPress={() => handleBannerPress(banner)}
          activeOpacity={0.9}
        >
          {/* Background Image */}
          <Image
            source={{ uri: banner.image }}
            style={styles.bannerImage}
            resizeMode="cover"
          />

          {/* Gradient Overlay */}
          <LinearGradient
            colors={[
              'rgba(0, 0, 0, 0.1)',
              'rgba(0, 0, 0, 0.3)',
              'rgba(0, 0, 0, 0.6)',
            ]}
            style={styles.gradientOverlay}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />

          {/* Content Container */}
          <View style={styles.contentContainer}>
            {/* Decorative Elements */}
            <View style={styles.decorativeElements}>
              {theme.iconBackgrounds.slice(0, 3).map((color, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.decorativeCircle,
                    {
                      backgroundColor: color,
                      transform: [
                        { translateX: idx * 20 },
                        { translateY: Math.sin(idx) * 10 },
                      ],
                    },
                  ]}
                />
              ))}
            </View>

            {/* Text Content */}
            <BlurView
              intensity={20}
              tint={isDark ? 'dark' : 'light'}
              style={styles.textContainer}
            >
              <Text style={styles.bannerTitle} numberOfLines={2}>
                {banner.title}
              </Text>
              
              {banner.subtitle && (
                <Text style={styles.bannerSubtitle} numberOfLines={2}>
                  {banner.subtitle}
                </Text>
              )}

              {banner.buttonText && (
                <View style={styles.buttonContainer}>
                  <LinearGradient
                    colors={[theme.primary, theme.primaryDark]}
                    style={styles.actionButton}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.buttonText}>
                      {banner.buttonText}
                    </Text>
                    <Ionicons
                      name="arrow-forward"
                      size={16}
                      color={theme.text.inverse}
                      style={styles.buttonIcon}
                    />
                  </LinearGradient>
                </View>
              )}
            </BlurView>

            {/* Premium Badge */}
            <View style={styles.premiumBadge}>
              <LinearGradient
                colors={[theme.iconBackgrounds[6], theme.iconBackgrounds[0]]}
                style={styles.badgeGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons
                  name="star"
                  size={12}
                  color={theme.text.inverse}
                />
                <Text style={styles.badgeText}>PREMIUM</Text>
              </LinearGradient>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const styles = StyleSheet.create({
    container: {
      height: HERO_HEIGHT,
      marginBottom: SPACING.lg,
    },
    scrollView: {
      height: HERO_HEIGHT,
    },
    bannerContainer: {
      width: screenWidth,
      height: HERO_HEIGHT,
      paddingHorizontal: SPACING.lg,
    },
    banner: {
      flex: 1,
      borderRadius: BORDER_RADIUS.xxl,
      overflow: 'hidden',
      backgroundColor: theme.background.surface,
      ...SHADOWS.clay.heavy,
    },
    bannerImage: {
      width: '100%',
      height: '100%',
      position: 'absolute',
    },
    gradientOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    contentContainer: {
      flex: 1,
      justifyContent: 'space-between',
      padding: SPACING.xl,
    },
    decorativeElements: {
      position: 'absolute',
      top: SPACING.lg,
      right: SPACING.lg,
      flexDirection: 'row',
    },
    decorativeCircle: {
      width: 8,
      height: 8,
      borderRadius: 4,
      opacity: 0.8,
    },
    textContainer: {
      borderRadius: BORDER_RADIUS.lg,
      padding: SPACING.lg,
      overflow: 'hidden',
      alignSelf: 'flex-start',
      maxWidth: '80%',
    },
    bannerTitle: {
      fontSize: TYPOGRAPHY.fontSize.xxl,
      fontWeight: TYPOGRAPHY.fontWeight.bold,
      color: theme.text.inverse,
      lineHeight: TYPOGRAPHY.lineHeight.tight * TYPOGRAPHY.fontSize.xxl,
      textShadowColor: 'rgba(0, 0, 0, 0.3)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    bannerSubtitle: {
      fontSize: TYPOGRAPHY.fontSize.md,
      fontWeight: TYPOGRAPHY.fontWeight.medium,
      color: theme.text.inverse,
      marginTop: SPACING.sm,
      opacity: 0.9,
      lineHeight: TYPOGRAPHY.lineHeight.normal * TYPOGRAPHY.fontSize.md,
    },
    buttonContainer: {
      marginTop: SPACING.lg,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
      borderRadius: BORDER_RADIUS.pill,
      alignSelf: 'flex-start',
      ...SHADOWS.clay.medium,
    },
    buttonText: {
      fontSize: TYPOGRAPHY.fontSize.sm,
      fontWeight: TYPOGRAPHY.fontWeight.bold,
      color: theme.text.inverse,
    },
    buttonIcon: {
      marginLeft: SPACING.sm,
    },
    premiumBadge: {
      position: 'absolute',
      top: SPACING.lg,
      left: SPACING.lg,
    },
    badgeGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: SPACING.sm,
      paddingVertical: SPACING.xs,
      borderRadius: BORDER_RADIUS.pill,
      gap: SPACING.xs,
    },
    badgeText: {
      fontSize: TYPOGRAPHY.fontSize.xs,
      fontWeight: TYPOGRAPHY.fontWeight.bold,
      color: theme.text.inverse,
    },
    paginationContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: SPACING.md,
      gap: SPACING.sm,
    },
    paginationDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.text.tertiary,
    },
    paginationDotActive: {
      backgroundColor: theme.primary,
      transform: [{ scale: 1.2 }],
    },
  });

  if (!banners || banners.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        {banners.map(renderBanner)}
      </ScrollView>

      {/* Pagination Dots */}
      {banners.length > 1 && (
        <View style={styles.paginationContainer}>
          {banners.map((_, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => {
                setCurrentIndex(index);
                scrollToIndex(index);
              }}
            >
              <View
                style={[
                  styles.paginationDot,
                  index === currentIndex && styles.paginationDotActive,
                ]}
              />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

export default EnhancedHeroSection;
