import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
import { StudentProvider } from '../src/contexts/StudentContext';
import { SessionProvider } from '../src/contexts/SessionContext';
import { SyncProvider } from '../src/contexts/SyncContext';

function RouteGuard() {
  const { session, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    const onAuthScreen = segments[0] === 'login' || segments[0] === 'onboarding';
    if (!session && !onAuthScreen) {
      router.replace('/login');
    }
  }, [session, isLoading, segments]);

  return null;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <SyncProvider>
        <StudentProvider>
          <SessionProvider>
            <StatusBar style="auto" />
            <RouteGuard />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="login" />
              <Stack.Screen name="onboarding" />
              <Stack.Screen name="(student)" />
              <Stack.Screen name="(teacher)" />
            </Stack>
          </SessionProvider>
        </StudentProvider>
      </SyncProvider>
    </AuthProvider>
  );
}
