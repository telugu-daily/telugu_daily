import React, { useState } from 'react';
import { View, StyleSheet, Text, Platform } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import { getAdUnitId } from '@/constants/AdConfig';

interface BannerAdProps {
  position?: number;
}

const BannerAdComponent: React.FC<BannerAdProps> = ({ position }) => {
  const [adLoaded, setAdLoaded] = useState(false);
  const [adError, setAdError] = useState(false);

  const adUnitId = __DEV__ ? TestIds.ADAPTIVE_BANNER : getAdUnitId('banner');

  if (adError) {
    return null; // Hide the ad slot if it fails to load
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
        onAdLoaded={() => setAdLoaded(true)}
        onAdFailedToLoad={(error) => {
          console.log('Banner ad failed to load:', error);
          setAdError(true);
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
  },
});

export default BannerAdComponent;
