import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { api, ApiUser, setAuthToken } from './api';
import { identify, logOut as purchasesLogOut } from './purchases';

const TOKEN_KEY = 'whit_auth_token';

type AuthState = {
  status: 'loading' | 'signedOut' | 'signedIn';
  user: ApiUser | null;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  logIn: (email: string, password: string) => Promise<void>;
  logOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthState['status']>('loading');
  const [user, setUser] = useState<ApiUser | null>(null);

  // On app launch: restore a saved session, if there is one.
  useEffect(() => {
    (async () => {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (!token) {
        setStatus('signedOut');
        return;
      }
      setAuthToken(token);
      try {
        const me = await api.me();
        setUser(me);
        await identify(me.id);
        setStatus('signedIn');
      } catch {
        // Token expired or invalid — fall back to signed-out.
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        setAuthToken(null);
        setStatus('signedOut');
      }
    })();
  }, []);

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    const { token, user: newUser } = await api.signup(email, password, name);
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    setAuthToken(token);
    // Ties RevenueCat's app_user_id to our backend user id — required so the
    // webhook (backend/src/routes/billing.js) knows which account to unlock.
    await identify(newUser.id);
    setUser(newUser);
    setStatus('signedIn');
  }, []);

  const logIn = useCallback(async (email: string, password: string) => {
    const { token, user: existingUser } = await api.login(email, password);
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    setAuthToken(token);
    await identify(existingUser.id);
    setUser(existingUser);
    setStatus('signedIn');
  }, []);

  const logOut = useCallback(async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    setAuthToken(null);
    await purchasesLogOut();
    setUser(null);
    setStatus('signedOut');
  }, []);

  const refreshUser = useCallback(async () => {
    if (status !== 'signedIn') return;
    const me = await api.me();
    setUser(me);
  }, [status]);

  const value = useMemo(
    () => ({ status, user, signUp, logIn, logOut, refreshUser }),
    [status, user, signUp, logIn, logOut, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
