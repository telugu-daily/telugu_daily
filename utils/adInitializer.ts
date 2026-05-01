// Safely try to import native ads module (not available in Expo Go)
let mobileAds: any = null;
let MaxAdContentRating: any = null;

try {
  const adsModule = require('react-native-google-mobile-ads');
  mobileAds = adsModule.default;
  MaxAdContentRating = adsModule.MaxAdContentRating;
} catch (e) {
  console.log('Google Mobile Ads not available (Expo Go). Ads disabled.');
}

export const initializeAds = async () => {
  if (!mobileAds) {
    console.log('AdMob: Skipping initialization (native module not available)');
    return {};
  }

  try {
    await mobileAds().setRequestConfiguration({
      maxAdContentRating: MaxAdContentRating.PG,
      tagForChildDirectedTreatment: false,
      tagForUnderAgeOfConsent: false,
    });

    const adapterStatuses = await mobileAds().initialize();
    console.log('AdMob: Initialized successfully', adapterStatuses);
    return adapterStatuses;
  } catch (error) {
    console.error('AdMob: Initialization failed', error);
    return {};
  }
};
