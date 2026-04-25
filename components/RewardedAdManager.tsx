
import React, { useEffect, useState, useCallback } from 'react';
import { Alert } from 'react-native';

// Stub implementation - AdMob is not installed
// To enable, run: npx expo install react-native-google-mobile-ads

interface RewardedAdManagerProps {
  onAdComplete: () => void; // Called when user earns reward
  onAdFailed: () => void;   // Called when ad fails
}

const RewardedAdManager = ({
  onAdComplete,
  onAdFailed
}: RewardedAdManagerProps) => {
  const [isAdLoaded, setIsAdLoaded] = useState(false);

  // Show placeholder in development
  useEffect(() => {
    console.log('RewardedAdManager: AdMob not installed, using stub');
    setIsAdLoaded(false);
  }, []);

  // Show the rewarded ad - stub implementation
  const showRewardedAd = useCallback(() => {
    if (__DEV__) {
      Alert.alert(
        '📱 Development Mode',
        'Rewarded ads require a development build with AdMob configured.\n\nTo enable:\n1. Run: npx expo install react-native-google-mobile-ads\n2. Configure native modules\n3. Create EAS development build',
        [
          { 
            text: 'Get Reward Anyway (Dev)', 
            onPress: () => {
              console.log('Dev mode: Granting reward without watching ad');
              onAdComplete();
            } 
          },
          { 
            text: 'Cancel', 
            onPress: onAdFailed,
            style: 'cancel'
          }
        ]
      );
    } else {
      Alert.alert(
        '📺 Ads Unavailable',
        'Rewarded ads are not available. Please check your internet connection.',
        [{ text: 'OK', onPress: onAdFailed }]
      );
    }
  }, [onAdComplete, onAdFailed]);

  return { showRewardedAd, isAdLoaded };
};

export default RewardedAdManager;
