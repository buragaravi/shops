import React from 'react';
import { ScrollView, Dimensions, StyleSheet, TouchableOpacity, Image, View, Text } from 'react-native';
import { Banner } from '../../types';
import { COLORS, DIMENSIONS } from '../../constants';

interface HeroSectionProps {
  banners: Banner[];
  onBannerPress?: (banner: Banner) => void;
}

const { width: screenWidth } = Dimensions.get('window');

const HeroSection: React.FC<HeroSectionProps> = ({ banners, onBannerPress }) => {
  if (!banners || banners.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={styles.scrollView}
      >
        {banners.map((banner, index) => (
          <TouchableOpacity
            key={banner._id || index}
            style={styles.bannerContainer}
            onPress={() => onBannerPress?.(banner)}
            activeOpacity={0.9}
          >
            <Image
              source={{ uri: banner.image }}
              style={styles.bannerImage}
              resizeMode="cover"
            />
            {(banner.title || banner.description) && (
              <View style={styles.bannerOverlay}>
                {banner.title && (
                  <Text style={styles.bannerTitle}>{banner.title}</Text>
                )}
                {banner.description && (
                  <Text style={styles.bannerDescription}>{banner.description}</Text>
                )}
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
      
      {banners.length > 1 && (
        <View style={styles.pagination}>
          {banners.map((_, index) => (
            <View key={index} style={styles.paginationDot} />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.WHITE,
    marginBottom: 16,
  },
  scrollView: {
    height: DIMENSIONS.BANNER_HEIGHT,
  },
  bannerContainer: {
    width: screenWidth,
    height: DIMENSIONS.BANNER_HEIGHT,
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    padding: 16,
  },
  bannerTitle: {
    color: COLORS.WHITE,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  bannerDescription: {
    color: COLORS.WHITE,
    fontSize: 14,
    opacity: 0.9,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.GRAY,
    marginHorizontal: 4,
  },
});

export default HeroSection;
