import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { getProfile } from '../../src/services/supabase/profile';
import { getStudentsByTeacher, upsertStudent } from '../../src/services/db/students';
import { getTeacherStudents } from '../../src/services/supabase/teacherStudents';

export default function TeacherHomeScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [teacherName, setTeacherName] = useState('');
  const [studentCount, setStudentCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        const profile = await getProfile(user.id);
        if (profile) setTeacherName(profile.name);

        const remote = await getTeacherStudents(user.id);
        if (remote.length > 0) {
          for (const s of remote) await upsertStudent(s);
          setStudentCount(remote.length);
        } else {
          const local = await getStudentsByTeacher(user.id);
          setStudentCount(local.length);
        }
      } catch {
        const local = await getStudentsByTeacher(user?.id ?? '');
        setStudentCount(local.length);
      }
      setIsLoading(false);
    }
    load();
  }, [user]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#4A90D9" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.name}>{teacherName || 'Teacher'} 👩‍🏫</Text>
          </View>
          <TouchableOpacity
            style={styles.signOutBtn}
            onPress={async () => { await signOut(); router.replace('/login'); }}
          >
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{studentCount}</Text>
            <Text style={styles.statLabel}>Students</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.primaryCard}
          onPress={() => router.push('/(teacher)/who-is-reading')}
        >
          <Text style={styles.primaryEmoji}>📖</Text>
          <View style={styles.primaryText}>
            <Text style={styles.primaryTitle}>Who's Reading Today?</Text>
            <Text style={styles.primaryDesc}>
              Pick a student and start a reading session on this device
            </Text>
          </View>
          <Text style={styles.primaryArrow}>▶</Text>
        </TouchableOpacity>

        <Text style={styles.sectionLabel}>Management</Text>

        <TouchableOpacity
          style={styles.secondaryCard}
          onPress={() => router.push('/(teacher)/dashboard')}
        >
          <Text style={styles.secondaryEmoji}>📊</Text>
          <View style={styles.secondaryText}>
            <Text style={styles.secondaryTitle}>Student Dashboard</Text>
            <Text style={styles.secondaryDesc}>View progress, scores, and reading history</Text>
          </View>
          <Text style={styles.secondaryArrow}>▶</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryCard}
          onPress={() => router.push('/(teacher)/who-is-reading')}
        >
          <Text style={styles.secondaryEmoji}>👥</Text>
          <View style={styles.secondaryText}>
            <Text style={styles.secondaryTitle}>Manage Students</Text>
            <Text style={styles.secondaryDesc}>Add or remove students from your class</Text>
          </View>
          <Text style={styles.secondaryArrow}>▶</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F7FF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0F7FF' },
  scroll: { padding: 24 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 24,
  },
  greeting: { fontSize: 16, color: '#5A7A9C' },
  name: { fontSize: 26, fontWeight: '900', color: '#1A3A5C' },
  signOutBtn: { paddingTop: 4 },
  signOutText: { fontSize: 13, color: '#E74C3C', fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 16,
    padding: 16, alignItems: 'center',
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.07,
    shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
  },
  statNum: { fontSize: 32, fontWeight: '900', color: '#1A3A5C' },
  statLabel: { fontSize: 13, color: '#7B8D9E', fontWeight: '600' },
  primaryCard: {
    backgroundColor: '#4A90D9', borderRadius: 20,
    padding: 22, flexDirection: 'row', alignItems: 'center',
    marginBottom: 28, gap: 16,
    elevation: 4, shadowColor: '#4A90D9', shadowOpacity: 0.35,
    shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
  },
  primaryEmoji: { fontSize: 44 },
  primaryText: { flex: 1 },
  primaryTitle: { fontSize: 20, fontWeight: '900', color: '#fff', marginBottom: 4 },
  primaryDesc: { fontSize: 13, color: '#D6E8FF', lineHeight: 18 },
  primaryArrow: { fontSize: 18, color: '#B3D4F5' },
  sectionLabel: {
    fontSize: 13, fontWeight: '700', color: '#9BB5CC',
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12,
  },
  secondaryCard: {
    backgroundColor: '#fff', borderRadius: 16,
    padding: 18, flexDirection: 'row', alignItems: 'center',
    marginBottom: 12, gap: 14,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.07,
    shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
  },
  secondaryEmoji: { fontSize: 32 },
  secondaryText: { flex: 1 },
  secondaryTitle: { fontSize: 16, fontWeight: '800', color: '#1A3A5C', marginBottom: 2 },
  secondaryDesc: { fontSize: 13, color: '#7B8D9E' },
  secondaryArrow: { fontSize: 16, color: '#C5D5E5' },
});
