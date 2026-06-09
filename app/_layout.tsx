import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StudentProvider } from '../src/contexts/StudentContext';
import { SessionProvider } from '../src/contexts/SessionContext';
import { SyncProvider } from '../src/contexts/SyncContext';

export default function RootLayout() {
  return (
    <SyncProvider>
      <StudentProvider>
        <SessionProvider>
          <StatusBar style="auto" />
          <Stack screenOptions={{ headerShown: false }} />
        </SessionProvider>
      </StudentProvider>
    </SyncProvider>
  );
}
