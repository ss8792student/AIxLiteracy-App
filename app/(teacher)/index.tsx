import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { getAllStudents } from '../../src/services/db/students';
import { getSessionsByStudent } from '../../src/services/db/sessions';
import { Student } from '../../src/types/models';

interface StudentSummary {
  student: Student;
  sessionsThisWeek: number;
  averageScore: number;
  needsIntervention: boolean;
}

export default function TeacherDashboard() {
  const router = useRouter();
  const [summaries, setSummaries] = useState<StudentSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const students = await getAllStudents();
    const studentStudents = students.filter((s) => s.role === 'student');

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);

    const results = await Promise.all(
      studentStudents.map(async (student) => {
        const sessions = await getSessionsByStudent(student.id, 20);
        const recentSessions = sessions.filter(
          (s) => s.completedAt && new Date(s.completedAt) >= cutoff
        );
        const scores = sessions
          .filter((s) => s.assessment)
          .map((s) => s.assessment!.overallScore);
        const avg = scores.length > 0
          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
          : 0;

        return {
          student,
          sessionsThisWeek: recentSessions.length,
          averageScore: avg,
          needsIntervention: avg > 0 && avg < 60 || recentSessions.length === 0,
        };
      })
    );

    setSummaries(results.sort((a, b) => (a.needsIntervention ? -1 : 1)));
    setIsLoading(false);
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/(student)')} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Teacher Dashboard</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{summaries.length}</Text>
          <Text style={styles.statLabel}>Students</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: '#E74C3C' }]}>
            {summaries.filter((s) => s.needsIntervention).length}
          </Text>
          <Text style={styles.statLabel}>Need Help</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {summaries.filter((s) => s.sessionsThisWeek > 0).length}
          </Text>
          <Text style={styles.statLabel}>Active This Week</Text>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color="#4A90D9" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={summaries}
          keyExtractor={(item) => item.student.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.studentRow, item.needsIntervention && styles.studentRowAlert]}
              onPress={() => router.push(`/(teacher)/student/${item.student.id}`)}
            >
              <View style={styles.studentLeft}>
                {item.needsIntervention && (
                  <Text style={styles.alertDot}>⚠️</Text>
                )}
                <Text style={styles.studentName}>{item.student.name}</Text>
                <Text style={styles.studentGrade}>Grade {item.student.grade}</Text>
              </View>
              <View style={styles.studentRight}>
                <Text style={styles.sessionCount}>{item.sessionsThisWeek} sessions</Text>
                {item.averageScore > 0 && (
                  <Text style={[
                    styles.avgScore,
                    { color: item.averageScore >= 70 ? '#2ECC71' : item.averageScore >= 50 ? '#F39C12' : '#E74C3C' }
                  ]}>
                    {item.averageScore}% avg
                  </Text>
                )}
              </View>
              <Text style={styles.arrow}>▶</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No students yet.</Text>
              <Text style={styles.emptySubText}>Students will appear here once they sign up.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F7FF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  backBtn: { width: 40, padding: 8 },
  backText: { fontSize: 24, color: '#4A90D9' },
  title: { flex: 1, fontSize: 24, fontWeight: '800', color: '#1A3A5C', textAlign: 'center' },
  statsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginBottom: 12 },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  statNumber: { fontSize: 28, fontWeight: '900', color: '#1A3A5C' },
  statLabel: { fontSize: 12, color: '#7B8D9E', fontWeight: '600' },
  list: { padding: 20, gap: 10 },
  studentRow: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  studentRowAlert: { borderLeftWidth: 4, borderLeftColor: '#E74C3C' },
  studentLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  alertDot: { fontSize: 16 },
  studentName: { fontSize: 16, fontWeight: '700', color: '#1A3A5C' },
  studentGrade: { fontSize: 12, color: '#7B8D9E' },
  studentRight: { alignItems: 'flex-end', marginRight: 12 },
  sessionCount: { fontSize: 13, color: '#5A7A9C' },
  avgScore: { fontSize: 15, fontWeight: '700' },
  arrow: { fontSize: 16, color: '#C5D5E5' },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 18, fontWeight: '700', color: '#1A3A5C' },
  emptySubText: { fontSize: 14, color: '#7B8D9E', marginTop: 8 },
});
