import { useEffect, useState, useRef } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Text, Animated, StyleSheet, Dimensions, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold } from '@expo-google-fonts/poppins';
import { NotoSansTelugu_400Regular } from '@expo-google-fonts/noto-sans-telugu';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { ThemeProvider } from '@/hooks/useTheme';
import { useAdMob } from '@/hooks/useAdMob';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import * as SplashScreen from 'expo-splash-screen';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Prevent the splash screen from auto-hiding before asset loading is complete
SplashScreen.preventAutoHideAsync();

// Animated loading dots component
function LoadingDots() {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 400,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0.3,
            duration: 400,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
        ])
      );

    animate(dot1, 0).start();
    animate(dot2, 200).start();
    animate(dot3, 400).start();
  }, []);

  return (
    <View style={styles.dotsContainer}>
      <Animated.View style={[styles.dot, { opacity: dot1 }]} />
      <Animated.View style={[styles.dot, { opacity: dot2 }]} />
      <Animated.View style={[styles.dot, { opacity: dot3 }]} />
    </View>
  );
}

function InitialLayout() {
  const { isInitialized } = useAdMob();
  const [showSplash, setShowSplash] = useState(false);

  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  const userName = user?.user_metadata?.full_name || user?.email || undefined;
  useNotifications(isAuthenticated, userName);

  let [fontsLoaded] = useFonts({
    'Poppins-Regular': Poppins_400Regular,
    'Poppins-Medium': Poppins_500Medium,
    'Poppins-SemiBold': Poppins_600SemiBold,
    'NotoSansTelugu-Regular': NotoSansTelugu_400Regular,
  });

  useEffect(() => {
    if (authLoading) return;

    const inAuthGroup = segments[0] === 'auth';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/auth');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, authLoading, segments]);

  // Fade-out animation for exit
  const fadeOutAnim = useRef(new Animated.Value(1)).current;

  // Entrance animations (inside the opaque overlay — safe, no flash)
  const logoScale = useRef(new Animated.Value(0.4)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const appNameOpacity = useRef(new Animated.Value(0)).current;
  const appNameTranslateY = useRef(new Animated.Value(15)).current;
  const dividerWidth = useRef(new Animated.Value(0)).current;
  const mainTextOpacity = useRef(new Animated.Value(0)).current;
  const mainTextTranslateY = useRef(new Animated.Value(15)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const logoPulse = useRef(new Animated.Value(1)).current;

  const runSplashAnimation = () => {
    // Reset values in case of re-login
    logoScale.setValue(0.4);
    logoOpacity.setValue(0);
    appNameOpacity.setValue(0);
    appNameTranslateY.setValue(15);
    dividerWidth.setValue(0);
    mainTextOpacity.setValue(0);
    mainTextTranslateY.setValue(15);
    subtitleOpacity.setValue(0);
    logoPulse.setValue(1);
    fadeOutAnim.setValue(1);

    setShowSplash(true);

    // Staggered entrance
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, friction: 5, tension: 50, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(appNameOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(appNameTranslateY, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]),
      Animated.timing(dividerWidth, { toValue: 1, duration: 200, useNativeDriver: false }),
      Animated.parallel([
        Animated.timing(mainTextOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(mainTextTranslateY, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(subtitleOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();

    // Subtle logo pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoPulse, { toValue: 1.05, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(logoPulse, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();

    // Fade out custom splash after 3 seconds
    setTimeout(() => {
      Animated.timing(fadeOutAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        setShowSplash(false);
      });
    }, 3000);
  };

  useEffect(() => {
    if (fontsLoaded && isInitialized && !authLoading) {
      if (isAuthenticated) {
        // Run custom splash when authenticated
        runSplashAnimation();
        // Wait a tiny bit for React to render the splash overlay, then hide native splash
        setTimeout(() => SplashScreen.hideAsync(), 100);
      } else {
        // If not authenticated, hide native splash and skip custom splash (go to auth screen)
        setShowSplash(false);
        SplashScreen.hideAsync();
      }
    }
  }, [fontsLoaded, isInitialized, authLoading, isAuthenticated]);

  // While fonts/ads are loading, show plain teal (matches native splash background)
  if (!fontsLoaded || !isInitialized) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={{ flex: 1, backgroundColor: '#4ECDC4' }} />
      </View>
    );
  }

  return (
    <ThemeProvider>
      {/* App content renders underneath - loads while splash is on top */}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style={showSplash ? 'light' : 'auto'} />

      {/* Splash overlay — opaque background, animated content inside */}
      {showSplash && (
        <Animated.View
          style={[
            styles.splashOverlay,
            { opacity: fadeOutAnim },
          ]}
          pointerEvents="none"
        >
          <LinearGradient
            colors={['#4ECDC4', '#45B7AA', '#3DA89E']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
          >
            {/* Decorative circles */}
            <View style={styles.decorCircle1} />
            <View style={styles.decorCircle2} />

            <View style={styles.splashContent}>
              {/* Giant floating తె letter */}
              <Animated.Text
                style={[
                  styles.logoText,
                  {
                    opacity: logoOpacity,
                    transform: [
                      { scale: Animated.multiply(logoScale, logoPulse) },
                    ],
                  },
                ]}
              >
                తె
              </Animated.Text>

              {/* App Name */}
              <Animated.Text
                style={[
                  styles.appName,
                  {
                    opacity: appNameOpacity,
                    transform: [{ translateY: appNameTranslateY }],
                  },
                ]}
              >
                Telugu Daily
              </Animated.Text>

              {/* Animated Divider */}
              <Animated.View
                style={[
                  styles.divider,
                  {
                    width: dividerWidth.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, SCREEN_WIDTH * 0.45],
                    }),
                  },
                ]}
              />

              {/* Main Telugu Text */}
              <Animated.View
                style={{
                  opacity: mainTextOpacity,
                  transform: [{ translateY: mainTextTranslateY }],
                  alignItems: 'center',
                }}
              >
                <Text style={styles.mainTeluguText}>
                  {'రోజూ కొంచెం.'}
                </Text>
                <Text style={styles.mainTeluguText}>
                  {'రేపు చాలా.'}
                </Text>
              </Animated.View>

              {/* Subtitle */}
              <Animated.Text
                style={[
                  styles.subtitle,
                  { opacity: subtitleOpacity },
                ]}
              >
                {'ఇంగ్లీష్ ప్రయాణం ఇక్కడే'}
              </Animated.Text>
            </View>

            {/* Loading dots at bottom */}
            <View style={styles.bottomSection}>
              <LoadingDots />
              <Text style={styles.versionText}>v1.0.0</Text>
            </View>
          </LinearGradient>
        </Animated.View>
      )}
    </ThemeProvider>
  );
}

export default function RootLayout() {
  useFrameworkReady();

  return (
    <AuthProvider>
      <InitialLayout />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  // Full-screen overlay — sits on top of everything
  splashOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    elevation: 999,
  },
  // Decorative background circles
  decorCircle1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    top: -80,
    right: -80,
  },
  decorCircle2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    bottom: 100,
    left: -60,
  },
  splashContent: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 24,
  },
  // Giant Text Logo
  logoText: {
    fontSize: 120,
    fontFamily: 'NotoSansTelugu-Regular',
    color: '#FFFFFF',
    marginBottom: 16,
    // Add a strong shadow so it mimics a 3D icon
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 0, height: 8 },
    textShadowRadius: 15,
  },
  // App name
  appName: {
    fontSize: 30,
    fontFamily: 'Poppins-SemiBold',
    color: '#FFFFFF',
    letterSpacing: 1.5,
    marginBottom: 14,
    textAlign: 'center',
  },
  // Divider line
  divider: {
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 1,
    marginBottom: 22,
    alignSelf: 'center',
  },
  // Main Telugu text
  mainTeluguText: {
    fontSize: 26,
    fontFamily: 'NotoSansTelugu-Regular',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 40,
  },
  // Subtitle
  subtitle: {
    fontSize: 15,
    fontFamily: 'NotoSansTelugu-Regular',
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginTop: 16,
    letterSpacing: 0.5,
  },
  // Bottom section
  bottomSection: {
    position: 'absolute',
    bottom: 40,
    alignItems: 'center',
  },
  // Loading dots
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 4,
  },
  // Version text
  versionText: {
    fontSize: 11,
    fontFamily: 'Poppins-Regular',
    color: 'rgba(255, 255, 255, 0.35)',
  },
});

