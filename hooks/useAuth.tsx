import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/utils/supabase';
import { pullProgressFromCloud, migrateLocalToCloud } from '@/utils/cloudSync';
import { backupToCloud } from '@/utils/progressBackup';
import * as Linking from 'expo-linking';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  isAuthenticated: false,
  isLoading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

// Helper: parse key=value pairs from a query/hash string
function parseParams(str: string): Record<string, string> {
  const params: Record<string, string> = {};
  str.split('&').forEach((pair) => {
    const [key, value] = pair.split('=');
    if (key && value) params[key] = decodeURIComponent(value.replace(/\+/g, ' '));
  });
  return params;
}

// Helper: extract and set Supabase session from an OAuth redirect URL
async function handleOAuthRedirectUrl(url: string) {
  try {
    console.log('Handling OAuth redirect URL:', url);

    // Case 1: Implicit flow — tokens are in the #hash
    const hash = url.split('#')[1];
    if (hash) {
      const params = parseParams(hash);
      if (params.access_token && params.refresh_token) {
        console.log('Setting session from hash tokens...');
        await supabase.auth.setSession({
          access_token: params.access_token,
          refresh_token: params.refresh_token,
        });
        return;
      }
    }

    // Case 2: PKCE flow — code is in the ?query
    const query = url.split('?')[1]?.split('#')[0];
    if (query) {
      const params = parseParams(query);
      if (params.code) {
        console.log('Exchanging PKCE code for session...');
        await supabase.auth.exchangeCodeForSession(params.code);
        return;
      }
    }
  } catch (err) {
    console.error('Error handling OAuth redirect:', err);
  }
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function handleAuthData(userId: string, email?: string) {
      try {
        await migrateLocalToCloud(userId, email);
        await pullProgressFromCloud(userId);
      } catch (e) {
        console.error('Data sync error:', e);
      }
    }

    // Initialize session from storage
    async function initializeAuth() {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        if (mounted) {
          setSession(initialSession);
          setUser(initialSession?.user || null);
          setIsLoading(false);
          if (initialSession?.user) {
            handleAuthData(initialSession.user.id, initialSession.user.email);
          }
        }
      } catch (error) {
        console.error('Error getting session:', error);
        if (mounted) setIsLoading(false);
      }
    }

    initializeAuth();

    // Listen for Supabase auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => {
        if (mounted) {
          setSession(currentSession);
          setUser(currentSession?.user || null);
          setIsLoading(false);
          if (currentSession?.user && _event === 'SIGNED_IN') {
            handleAuthData(currentSession.user.id, currentSession.user.email);
          }
        }
      }
    );

    // ✅ KEY FIX: Listen for deep link redirects from OAuth (Android Chrome Custom Tab)
    // When Google redirects → Supabase → exp://... Android routes it here at the OS level
    const urlSubscription = Linking.addEventListener('url', ({ url }) => {
      console.log('Deep link received:', url);
      if (
        url.includes('access_token') ||
        url.includes('refresh_token') ||
        url.includes('code=')
      ) {
        handleOAuthRedirectUrl(url);
      }
    });

    // Also check if app was opened from a deep link (cold start)
    Linking.getInitialURL().then((url) => {
      if (url && (url.includes('access_token') || url.includes('code='))) {
        console.log('App opened from OAuth URL:', url);
        handleOAuthRedirectUrl(url);
      }
    });

    // ✅ Backup AsyncStorage to cloud when app moves to background/inactive.
    // This is the single moment we sync — daily usage stays 100% local.
    const appStateSub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'background' || next === 'inactive') {
        backupToCloud().catch((e) => console.log('Background backup error:', e));
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      urlSubscription.remove();
      appStateSub.remove();
    };
  }, []);

  const signOut = async () => {
    try {
      // Force a final backup before signing out so the user's last session is saved
      await backupToCloud(true);
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const value = {
    session,
    user,
    isAuthenticated: !!user,
    isLoading,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
