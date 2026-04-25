// mocks/react-native-google-mobile-ads.js
// This file provides a mock for react-native-google-mobile-ads for native builds.
// This prevents TurboModuleRegistry errors when native modules aren't linked.

'use strict';

// Mock the default export (mobileAds)
const mobileAds = () => ({
  initialize: () => {
    console.log('AdMob: initialize called (mock)');
    return Promise.resolve();
  },
  setRequestConfiguration: (config) => {
    console.log('AdMob: setRequestConfiguration called (mock)', config);
    return Promise.resolve();
  },
});

// Mock BannerAd component
const BannerAd = () => {
  console.log('AdMob: BannerAd rendered (mock)');
  return null; // Render nothing
};

// Mock BannerAdSize and TestIds, MaxAdContentRating
const BannerAdSize = {
  BANNER: '320x50',
  LARGE_BANNER: '320x100',
  MEDIUM_RECTANGLE: '300x250',
  FULL_BANNER: '468x60',
  LEADERBOARD: '728x90',
  ADAPTIVE_BANNER: 'adaptive',
};

const TestIds = {
  BANNER: 'ca-app-pub-3940256099942544/6300978111',
  INTERSTITIAL: 'ca-app-pub-3940256099942544/1033173712',
  REWARDED: 'ca-app-pub-3940256099942544/5224354917',
  APP_OPEN: 'ca-app-pub-3940256099942544/3419835294',
};

const MaxAdContentRating = {
  G: 'G',
  PG: 'PG',
  T: 'T',
  MA: 'MA',
  UNSPECIFIED: 'UNSPECIFIED',
};

// Export for both CommonJS and ES modules
module.exports = {
  default: mobileAds,
  BannerAd,
  BannerAdSize,
  TestIds,
  MaxAdContentRating,
};

// Also set as default export for ES modules
module.exports.default = mobileAds;
