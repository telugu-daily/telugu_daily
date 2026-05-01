import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/utils/supabase';
import { makeRedirectUri } from 'expo-auth-session';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import GoogleLogo from '@/components/GoogleLogo';

// Required so the in-app browser closes properly after auth completes
WebBrowser.maybeCompleteAuthSession();

export default function AuthScreen() {
  const [isSignInLoading, setIsSignInLoading] = useState(false);
  const [isSignUpLoading, setIsSignUpLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  const handleGoogleOAuth = async (setter: (v: boolean) => void) => {
    setter(true);
    setError(null);
    try {
      // Build a deep link that works in BOTH Expo Go (exp://...) and production (myapp://...).
      const appReturnUrl = Linking.createURL('/auth/callback');
      console.log('App return URL:', appReturnUrl);

      // Vercel callback page reads ?app_redirect= and forwards tokens/code to it.
      const redirectUrl =
        'https://api.vidhyaly.com/auth/callback?app_redirect=' +
        encodeURIComponent(appReturnUrl);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;
      if (!data?.url) throw new Error('No OAuth URL returned from Supabase');

      // Open Google sign-in inside an in-app browser (Custom Tab on Android, SFSafariViewController on iOS).
      // It auto-closes when the URL matches `appReturnUrl` and returns control to the app.
      const result = await WebBrowser.openAuthSessionAsync(data.url, appReturnUrl, {
        showInRecents: false,
        toolbarColor: '#4ECDC4',
        secondaryToolbarColor: '#3BB8B0',
        enableBarCollapsing: false,
        showTitle: false,
      });
      console.log('WebBrowser result:', result);

      if (result.type === 'success' && result.url) {
        // Extract code/tokens from the returned URL and create the Supabase session
        const returnedUrl = result.url;
        const hash = returnedUrl.split('#')[1];
        const query = returnedUrl.split('?')[1]?.split('#')[0];

        if (hash) {
          const params = new URLSearchParams(hash);
          const access_token = params.get('access_token');
          const refresh_token = params.get('refresh_token');
          if (access_token && refresh_token) {
            await supabase.auth.setSession({ access_token, refresh_token });
            return;
          }
        }
        if (query) {
          const params = new URLSearchParams(query);
          const code = params.get('code');
          if (code) {
            await supabase.auth.exchangeCodeForSession(code);
            return;
          }
        }
        throw new Error('No auth tokens found in redirect URL');
      } else if (result.type === 'cancel' || result.type === 'dismiss') {
        // User closed the browser
        setter(false);
        return;
      } else {
        throw new Error('Authentication failed');
      }
    } catch (e: any) {
      console.error('Auth Error:', e);
      setError(e.message || 'Google Sign-In failed. Please try again.');
      setter(false);
    }
  };

  const handleSignIn = () => handleGoogleOAuth(setIsSignInLoading);
  const handleSignUp = () => handleGoogleOAuth(setIsSignUpLoading);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <LinearGradient colors={['#4ECDC4', '#3BB8B0', '#45B7AA']} style={styles.header}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>తె</Text>
        </View>
        <Text style={styles.title}>Telugu Daily</Text>
        <Text style={styles.subtitle}>రోజూ కొంచెం. రేపు చాలా.</Text>
      </LinearGradient>

      {/* Card */}
      <View style={styles.card}>
        {/* Mode Toggle */}
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeTab, mode === 'signin' && styles.modeTabActive]}
            onPress={() => { setMode('signin'); setError(null); }}
          >
            <Text style={[styles.modeTabText, mode === 'signin' && styles.modeTabTextActive]}>Sign In</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeTab, mode === 'signup' && styles.modeTabActive]}
            onPress={() => { setMode('signup'); setError(null); }}
          >
            <Text style={[styles.modeTabText, mode === 'signup' && styles.modeTabTextActive]}>Sign Up</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.cardSubtitle}>
          {mode === 'signin'
            ? 'Welcome back! Sign in to continue your journey.'
            : 'Your progress is saved to the cloud — never lose your streak!'}
        </Text>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {mode === 'signin' ? (
          <TouchableOpacity
            style={[styles.primaryButton, isSignInLoading && styles.disabledButton]}
            onPress={handleSignIn}
            disabled={isSignInLoading}
            activeOpacity={0.85}
          >
            {isSignInLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <View style={styles.googleIconBadge}>
                  <GoogleLogo size={18} />
                </View>
                <Text style={styles.primaryButtonText}>Sign in with Google</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.primaryButton, isSignUpLoading && styles.disabledButton]}
            onPress={handleSignUp}
            disabled={isSignUpLoading}
            activeOpacity={0.85}
          >
            {isSignUpLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <View style={styles.googleIconBadge}>
                  <GoogleLogo size={18} />
                </View>
                <Text style={styles.primaryButtonText}>Sign up with Google</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        <Text style={styles.footnote}>
          By continuing, you agree to our Terms of Service
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    paddingTop: 90,
    paddingBottom: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoText: {
    fontSize: 50,
    fontFamily: 'NotoSansTelugu-Regular',
    color: '#FFFFFF',
    lineHeight: 68,
  },
  title: {
    fontSize: 26,
    fontFamily: 'Poppins-SemiBold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    marginHorizontal: 20,
    marginTop: -36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  modeTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  modeTabText: {
    fontSize: 15,
    fontFamily: 'Poppins-Medium',
    color: '#8E8E93',
  },
  modeTabTextActive: {
    color: '#4ECDC4',
    fontFamily: 'Poppins-SemiBold',
  },
  cardSubtitle: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 19,
  },
  errorContainer: {
    backgroundColor: '#FDECEA',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  errorText: {
    color: '#E74C3C',
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    textAlign: 'center',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4ECDC4',
    height: 52,
    borderRadius: 12,
    gap: 10,
    marginBottom: 16,
    shadowColor: '#4ECDC4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 15,
  },
  googleIconBadge: {
    backgroundColor: '#FFFFFF',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    height: 52,
    borderRadius: 12,
    gap: 10,
    borderWidth: 1.5,
    borderColor: '#4ECDC4',
  },
  secondaryButtonText: {
    color: '#4ECDC4',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 15,
  },
  disabledButton: {
    opacity: 0.65,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E8E8EC',
  },
  dividerText: {
    fontSize: 11,
    fontFamily: 'Poppins-Regular',
    color: '#B0B0B8',
  },
  footnote: {
    fontSize: 11,
    fontFamily: 'Poppins-Regular',
    color: '#C0C0C8',
    textAlign: 'center',
    marginTop: 20,
  },
});
