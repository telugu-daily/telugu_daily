import mobileAds, { MaxAdContentRating } from 'react-native-google-mobile-ads';

export const initializeAds = async () => {
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
