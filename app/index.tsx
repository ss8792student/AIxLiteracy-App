import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';

export default function RootIndex() {
  const { session, userRole, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!session) {
      router.replace('/login');
    } else if (userRole === 'teacher') {
      router.replace('/(teacher)');
    } else {
      router.replace('/(student)/library');
    }
  }, [session, userRole, isLoading]);

  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#4A90D9" />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0F7FF' },
});
