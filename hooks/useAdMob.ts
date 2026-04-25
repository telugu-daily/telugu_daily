import { useEffect, useState } from 'react';
import { initializeAds } from '@/utils/adInitializer';

export const useAdMob = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        await initializeAds();
        setIsInitialized(true);
      } catch (error) {
        console.error('AdMob initialization error:', error);
        setInitError(error instanceof Error ? error.message : 'Failed to initialize ads');
        setIsInitialized(true); // Allow app to continue even if ads fail
      }
    };

    init();
  }, []);

  return { isInitialized, initError };
};