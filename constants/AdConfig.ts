import { Platform } from 'react-native';

// Import TestIds only on native platforms
let TestIds: any = null;
if (Platform.OS !== 'web') {
  try {
    const adMobModule = require('react-native-google-mobile-ads');
    TestIds = adMobModule.TestIds;
    console.log('AdConfig: TestIds imported successfully');
  } catch (error) {
    console.error('AdConfig: Failed to import TestIds:', error);
  }
}

// Ad Unit IDs from AdMob console
export const AD_UNIT_IDS = {
  banner: {
    ios: 'ca-app-pub-2909263012824712/5261368488',
    android: 'ca-app-pub-2909263012824712/5261368488',
  },
  interstitial: {
    ios: 'ca-app-pub-2909263012824712/5261368488',
    android: 'ca-app-pub-2909263012824712/5261368488',
  },
  rewarded: {
    ios: 'ca-app-pub-2909263012824712/5261368488',
    android: 'ca-app-pub-2909263012824712/5261368488',
  },
};

// Environment configuration
const IS_PRODUCTION = true; // Set to true for real ads, false for test ads

// Helper function to get the appropriate ad unit ID
export const getAdUnitId = (adType: keyof typeof AD_UNIT_IDS): string => {
  const adUnit = AD_UNIT_IDS[adType];
  
  console.log(`AdConfig: Getting ad unit for ${adType}`);
  
  if (IS_PRODUCTION) {
    // Use real production ad unit IDs
    const productionId = Platform.select({
      ios: adUnit.ios,
      android: adUnit.android,
      default: adUnit.android,
    });
    
    console.log(`AdConfig: Using PRODUCTION ad unit for ${adType}:`, productionId);
    return productionId;
  } else {
    // Use test ad unit IDs for development
    const testId = TestIds ? TestIds.BANNER : adUnit.android;
    console.log(`AdConfig: Using TEST ad unit for ${adType}:`, testId);
    return testId;
  }
};

// Ad configuration
export const AD_CONFIG = {
  // Show ads after these sentence numbers
  bannerPositions: [10, 20, 30, 40, 50],
  
  // Ad request configuration
  requestConfig: {
    requestNonPersonalizedAdsOnly: false, // Set to true if you want non-personalized ads only
    keywords: ['education', 'language', 'learning', 'telugu', 'study', 'vocabulary', 'indian', 'south indian'],
    contentUrl: 'https://telugulearning.app',
    // Additional targeting options for better ad relevance
    location: {
      latitude: 17.3850, // Hyderabad coordinates (optional)
      longitude: 78.4867,
    },
  },
  
  // Production settings
  production: {
    enableTestDevices: false, // Disable test devices for production
    enableLogging: false, // Disable verbose logging for production
  },
};