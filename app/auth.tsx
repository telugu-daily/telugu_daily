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
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as Crypto from 'expo-crypto';
import GoogleLogo from '@/components/GoogleLogo';

// Required for expo-auth-session to close the browser after auth
WebBrowser.maybeCompleteAuthSession();

// Google OAuth Web Client ID (from Google Cloud Console)
const GOOGLE_CLIENT_ID = '157699822144-ajgirotosgjm814sg2re8lrc8jnp3jap.apps.googleusercontent.com';

export default function AuthScreen() {
  const [isSignInLoading, setIsSignInLoading] = useState(false);
  const [isSignUpLoading, setIsSignUpLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  const handleGoogleOAuth = async (setter: (v: boolean) => void) => {
    setter(true);
    setError(null);
    try {
      if (Platform.OS === 'web') {
        // Web flow: use Supabase OAuth directly (full page redirect)
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: window.location.origin },
        });
        if (error) throw error;
        if (data?.url) window.location.href = data.url;
        return;
      }

      // ─── Native: Google OAuth directly via expo-auth-session ────────────
      // This shows "Telugu Daily" on the consent screen (not Supabase URL)
      // and auto-closes the Custom Tab after auth completes.

      // Generate PKCE code verifier & challenge using expo-crypto
      const randomBytes = await Crypto.getRandomBytesAsync(32);
      const codeVerifier = btoa(String.fromCharCode(...randomBytes))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
      const digest = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        codeVerifier,
        { encoding: Crypto.CryptoEncoding.BASE64 }
      );
      const codeChallenge = digest
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      // Build redirect URI for Google OAuth.
      // In standalone builds: uses 'myapp://auth/callback' (custom scheme)
      // In Expo Go: uses exp://... scheme automatically
      // openAuthSessionAsync detects this redirect and auto-closes the Custom Tab.
      const redirectUri = AuthSession.makeRedirectUri({
        scheme: 'myapp',
        path: 'auth/callback',
        native: 'myapp://auth/callback',
      });
      console.log('OAuth redirect URI:', redirectUri);

      // Build Google OAuth URL manually with PKCE
      const authUrl =
        'https://accounts.google.com/o/oauth2/v2/auth?' +
        new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          redirect_uri: redirectUri,
          response_type: 'code',
          scope: 'openid email profile',
          code_challenge: codeChallenge,
          code_challenge_method: 'S256',
          prompt: 'select_account',
        }).toString();

      // Open in Custom Tab — auto-closes when redirect matches myapp://
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
      console.log('Auth result type:', result.type);

      if (result.type === 'success' && result.url) {
        // Extract the authorization code from the redirect URL
        const url = new URL(result.url);
        const code = url.searchParams.get('code');

        if (!code) throw new Error('No authorization code received');

        // Exchange code for tokens with Google
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID,
            code,
            code_verifier: codeVerifier,
            grant_type: 'authorization_code',
            redirect_uri: redirectUri,
          }).toString(),
        });

        const tokens = await tokenResponse.json();
        console.log('Token exchange status:', tokenResponse.status);

        if (!tokens.id_token) {
          throw new Error(tokens.error_description || 'Failed to get ID token from Google');
        }

        // Sign in to Supabase using the Google ID token
        const { error: supaError } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: tokens.id_token,
          access_token: tokens.access_token,
        });

        if (supaError) throw supaError;
        setter(false);
      } else if (result.type === 'cancel' || result.type === 'dismiss') {
        setter(false);
      } else {
        throw new Error('Authentication was not completed');
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
