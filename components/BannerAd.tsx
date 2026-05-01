import React, { useState } from 'react';
import { View, StyleSheet, Text, Platform } from 'react-native';

// Safely try to import native ads module (not available in Expo Go)
let BannerAd: any = null;
let BannerAdSize: any = null;
let TestIds: any = null;
let getAdUnitId: any = null;
let ADS_AVAILABLE = false;

try {
  const adsModule = require('react-native-google-mobile-ads');
  BannerAd = adsModule.BannerAd;
  BannerAdSize = adsModule.BannerAdSize;
  TestIds = adsModule.TestIds;
  getAdUnitId = require('@/constants/AdConfig').getAdUnitId;
  ADS_AVAILABLE = true;
} catch (e) {
  console.log('Google Mobile Ads not available (Expo Go). Ads disabled.');
}

interface BannerAdProps {
  position?: number;
}

const BannerAdComponent: React.FC<BannerAdProps> = ({ position }) => {
  const [adLoaded, setAdLoaded] = useState(false);
  const [adError, setAdError] = useState<string | null>(null);

  // Ads not available in Expo Go — render nothing
  if (!ADS_AVAILABLE) {
    return null;
  }

  // Use real ad unit ID in production, test ads in development
  const adUnitId = __DEV__ ? TestIds.ADAPTIVE_BANNER : getAdUnitId('banner');

  if (adError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Ad failed: {adError}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.adContainer, !adLoaded && styles.adLoading]}>
      <BannerAd
        unitId={adUnitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: false,
          keywords: ['education', 'language', 'learning', 'telugu'],
        }}
        onAdLoaded={() => {
          console.log('Banner ad loaded at position', position);
          setAdLoaded(true);
        }}
        onAdFailedToLoad={(error: any) => {
          console.log('Banner ad failed at position', position, ':', error);
          setAdError(error?.message || 'Unknown error');
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  adContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  adLoading: {
    minHeight: 50,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
  },
  errorContainer: {
    alignItems: 'center',
    marginVertical: 8,
    padding: 8,
    backgroundColor: '#fff3cd',
    borderRadius: 4,
  },
  errorText: {
    color: '#856404',
    fontSize: 11,
  },
});

export default BannerAdComponent;
