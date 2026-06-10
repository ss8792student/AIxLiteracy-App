import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabase/client';
import { getProfile } from '../services/supabase/profile';

const ROLE_KEY = 'userRole';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  userRole: 'student' | 'teacher' | null;
  isLoading: boolean;
  signIn: (username: string, password: string) => Promise<string | null>;
  signUp: (username: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Converts a username to the internal fake email used for Supabase auth.
function toEmail(username: string): string {
  return `${username.toLowerCase().trim()}@aixliteracy.app`;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<'student' | 'teacher' | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function init() {
      // Read cached role immediately so routing doesn't flicker
      const cached = await AsyncStorage.getItem(ROLE_KEY);
      if (cached === 'student' || cached === 'teacher') setUserRole(cached);

      const { data } = await supabase.auth.getSession();
      setSession(data.session);

      if (data.session?.user) {
        await syncRole(data.session.user.id);
      }
      setIsLoading(false);
    }
    init();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (!newSession) {
        setUserRole(null);
        AsyncStorage.removeItem(ROLE_KEY);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function syncRole(userId: string) {
    try {
      const profile = await getProfile(userId);
      if (profile?.role) {
        const role = profile.role as 'student' | 'teacher';
        setUserRole(role);
        await AsyncStorage.setItem(ROLE_KEY, role);
      }
    } catch {
      // offline — cached role remains
    }
  }

  async function signIn(username: string, password: string): Promise<string | null> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: toEmail(username),
      password,
    });
    if (error) return error.message;
    if (data.user) await syncRole(data.user.id);
    return null;
  }

  async function signUp(username: string, password: string): Promise<string | null> {
    const { error } = await supabase.auth.signUp({
      email: toEmail(username),
      password,
    });
    return error ? error.message : null;
  }

  async function signOut(): Promise<void> {
    await supabase.auth.signOut();
    setUserRole(null);
    await AsyncStorage.removeItem(ROLE_KEY);
  }

  return (
    <AuthContext.Provider
      value={{ session, user: session?.user ?? null, userRole, isLoading, signIn, signUp, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
