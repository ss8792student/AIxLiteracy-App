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

function validateUsername(u: string): string | null {
  if (u.length < 3) return 'Username must be at least 3 characters.';
  if (u.length > 20) return 'Username must be 20 characters or less.';
  if (!/^[a-z0-9_]+$/.test(u)) return 'Only letters, numbers, and underscores allowed.';
  return null;
}

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, signUp } = useAuth();
  const { selectStudent, refreshStudents } = useStudent();

  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  function handleUsernameChange(text: string) {
    // Enforce lowercase + allowed chars as the user types
    setUsername(text.toLowerCase().replace(/[^a-z0-9_]/g, ''));
  }

  async function handleSignIn() {
    const usernameErr = validateUsername(username);
    if (usernameErr) { setError(usernameErr); return; }
    if (!password) { setError('Please enter your password.'); return; }

    setIsLoading(true);
    setError('');
    const err = await signIn(username, password);
    if (err) {
      setError(friendlyError(err));
      setIsLoading(false);
      return;
    }
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
    const usernameErr = validateUsername(username);
    if (usernameErr) { setError(usernameErr); return; }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);
    setError('');
    const err = await signUp(username, password);
    if (err) {
      setError(friendlyError(err));
      setIsLoading(false);
      return;
    }
    router.replace('/onboarding');
    setIsLoading(false);
  }

  function friendlyError(msg: string): string {
    if (msg.includes('Invalid login credentials')) return 'Wrong username or password. Try again!';
    if (msg.includes('User already registered')) return 'That username is taken. Try a different one!';
    if (msg.includes('Password should be')) return 'Password must be at least 6 characters.';
    return 'Something went wrong. Please try again.';
  }

  function switchTab(t: 'signin' | 'signup') {
    setTab(t);
    setError('');
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
                onPress={() => switchTab('signin')}
              >
                <Text style={[styles.tabText, tab === 'signin' && styles.tabTextActive]}>
                  Sign In
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, tab === 'signup' && styles.tabActive]}
                onPress={() => switchTab('signup')}
              >
                <Text style={[styles.tabText, tab === 'signup' && styles.tabTextActive]}>
                  Create Account
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.form}>
              <Text style={styles.inputLabel}>Username</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={handleUsernameChange}
                placeholder="e.g. reading_star"
                placeholderTextColor="#9BB5CC"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="username"
                maxLength={20}
                returnKeyType="next"
              />
              {tab === 'signup' && (
                <Text style={styles.inputHint}>Letters, numbers, and underscores only</Text>
              )}

              <Text style={styles.inputLabel}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder={tab === 'signup' ? 'At least 6 characters' : '••••••••'}
                placeholderTextColor="#9BB5CC"
                secureTextEntry
                autoComplete={tab === 'signup' ? 'new-password' : 'current-password'}
                returnKeyType="done"
                onSubmitEditing={tab === 'signin' ? handleSignIn : handleSignUp}
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

              {tab === 'signin' ? (
                <Text style={styles.switchHint}>
                  No account yet?{' '}
                  <Text style={styles.switchLink} onPress={() => switchTab('signup')}>
                    Create one
                  </Text>
                </Text>
              ) : (
                <Text style={styles.switchHint}>
                  Already have an account?{' '}
                  <Text style={styles.switchLink} onPress={() => switchTab('signin')}>
                    Sign in
                  </Text>
                </Text>
              )}
            </View>
          </View>

          <Text style={styles.privacyNote}>
            🔒 No email needed · Your data stays private
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
  inputHint: { fontSize: 12, color: '#9BB5CC', marginTop: 4 },
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
