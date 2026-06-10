import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';
import { useStudent } from '../src/contexts/StudentContext';
import { getProfile, profileToStudent } from '../src/services/supabase/profile';
import { upsertStudent } from '../src/services/db/students';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, signUp } = useAuth();
  const { selectStudent, refreshStudents } = useStudent();

  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSignIn() {
    if (!email.trim() || !password) return;
    setIsLoading(true);
    setError('');
    const err = await signIn(email.trim().toLowerCase(), password);
    if (err) {
      setError(friendlyError(err));
      setIsLoading(false);
      return;
    }
    // Auth state change will re-trigger layout redirect, but we also
    // proactively load the profile to warm the local DB.
    try {
      const { supabase } = await import('../src/services/supabase/client');
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (user) {
        const profile = await getProfile(user.id);
        if (profile) {
          const student = profileToStudent(profile);
          await upsertStudent(student);
          await refreshStudents();
          await selectStudent(student.id);
          router.replace('/(student)/library');
        } else {
          router.replace('/onboarding');
        }
      }
    } catch {
      router.replace('/onboarding');
    }
    setIsLoading(false);
  }

  async function handleSignUp() {
    if (!email.trim() || !password) return;
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setIsLoading(true);
    setError('');
    const err = await signUp(email.trim().toLowerCase(), password);
    if (err) {
      setError(friendlyError(err));
      setIsLoading(false);
      return;
    }
    // After signup, go to onboarding to set name/grade/avatar
    router.replace('/onboarding');
    setIsLoading(false);
  }

  function friendlyError(msg: string): string {
    if (msg.includes('Invalid login credentials')) return 'Wrong email or password. Try again!';
    if (msg.includes('Email not confirmed')) return 'Check your email to confirm your account first.';
    if (msg.includes('User already registered')) return 'An account with that email already exists. Try signing in!';
    if (msg.includes('Password should be')) return 'Password must be at least 6 characters.';
    return msg;
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <Text style={styles.logoEmoji}>📚</Text>
            <Text style={styles.appName}>AIxLiteracy</Text>
            <Text style={styles.tagline}>Your personal reading coach</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.tabs}>
              <TouchableOpacity
                style={[styles.tab, tab === 'signin' && styles.tabActive]}
                onPress={() => { setTab('signin'); setError(''); }}
              >
                <Text style={[styles.tabText, tab === 'signin' && styles.tabTextActive]}>
                  Sign In
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, tab === 'signup' && styles.tabActive]}
                onPress={() => { setTab('signup'); setError(''); }}
              >
                <Text style={[styles.tabText, tab === 'signup' && styles.tabTextActive]}>
                  Create Account
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.form}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="your@email.com"
                placeholderTextColor="#9BB5CC"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
              />

              <Text style={styles.inputLabel}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder={tab === 'signup' ? 'At least 6 characters' : '••••••••'}
                placeholderTextColor="#9BB5CC"
                secureTextEntry
                autoComplete={tab === 'signup' ? 'new-password' : 'current-password'}
              />

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <TouchableOpacity
                style={[styles.btn, isLoading && styles.btnDisabled]}
                onPress={tab === 'signin' ? handleSignIn : handleSignUp}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnText}>
                    {tab === 'signin' ? 'Sign In →' : "Let's Go! →"}
                  </Text>
                )}
              </TouchableOpacity>

              {tab === 'signin' && (
                <Text style={styles.switchHint}>
                  No account yet?{' '}
                  <Text style={styles.switchLink} onPress={() => { setTab('signup'); setError(''); }}>
                    Create one
                  </Text>
                </Text>
              )}
              {tab === 'signup' && (
                <Text style={styles.switchHint}>
                  Already have an account?{' '}
                  <Text style={styles.switchLink} onPress={() => { setTab('signin'); setError(''); }}>
                    Sign in
                  </Text>
                </Text>
              )}
            </View>
          </View>

          <Text style={styles.privacyNote}>
            🔒 Your reading data is private and secure.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F7FF' },
  scroll: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  hero: { alignItems: 'center', marginBottom: 32 },
  logoEmoji: { fontSize: 72, marginBottom: 8 },
  appName: { fontSize: 36, fontWeight: '900', color: '#1A3A5C', letterSpacing: -0.5 },
  tagline: { fontSize: 16, color: '#5A7A9C', marginTop: 4 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    marginBottom: 20,
  },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E3F2FD' },
  tab: { flex: 1, paddingVertical: 16, alignItems: 'center' },
  tabActive: { borderBottomWidth: 3, borderBottomColor: '#4A90D9' },
  tabText: { fontSize: 15, fontWeight: '600', color: '#7B8D9E' },
  tabTextActive: { color: '#4A90D9' },
  form: { padding: 24, gap: 4 },
  inputLabel: { fontSize: 13, fontWeight: '700', color: '#5A7A9C', marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: '#F4F8FF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1A3A5C',
    borderWidth: 1.5,
    borderColor: '#D6E8FF',
  },
  errorText: {
    color: '#E74C3C',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 10,
    textAlign: 'center',
  },
  btn: {
    backgroundColor: '#4A90D9',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 20,
  },
  btnDisabled: { backgroundColor: '#A0C4E8' },
  btnText: { fontSize: 18, fontWeight: '800', color: '#fff' },
  switchHint: { fontSize: 14, color: '#7B8D9E', textAlign: 'center', marginTop: 14 },
  switchLink: { color: '#4A90D9', fontWeight: '700' },
  privacyNote: { fontSize: 13, color: '#9BB5CC', textAlign: 'center' },
});
