import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useStudent } from '../../src/contexts/StudentContext';
import { useAuth } from '../../src/contexts/AuthContext';
import { getSessionsByStudent } from '../../src/services/db/sessions';
import { getBadgesForStudent, getVocabularyCount } from '../../src/services/db/vocabulary';
import { Badge, ReadingSession } from '../../src/types/models';
import { BADGE_DEFINITIONS } from '../../src/constants/badgeTypes';

export default function ProgressScreen() {
  const router = useRouter();
  const { currentStudent, refreshStudents } = useStudent();
  const { signOut } = useAuth();
  const [sessions, setSessions] = useState<ReadingSession[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [vocabCount, setVocabCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProgress();
  }, []);

  async function loadProgress() {
    if (!currentStudent) return;
    setIsLoading(true);
    try {
      const [s, b, v] = await Promise.all([
        getSessionsByStudent(currentStudent.id, 10),
        getBadgesForStudent(currentStudent.id),
        getVocabularyCount(currentStudent.id),
      ]);
      setSessions(s);
      setBadges(b);
      setVocabCount(v);
    } finally {
      setIsLoading(false);
    }
  }

  if (!currentStudent) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4A90D9" />
      </View>
    );
  }

  const fluencyScores = sessions
    .filter((s) => s.assessment)
    .map((s) => s.assessment!.fluencyScore);

  const averageFluency =
    fluencyScores.length > 0
      ? Math.round(fluencyScores.reduce((a, b) => a + b, 0) / fluencyScores.length)
      : 0;

  const nextMilestone = getNextMilestone(currentStudent);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/(student)/library')} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>My Progress</Text>
        <TouchableOpacity
          style={styles.signOutBtn}
          onPress={async () => { await signOut(); router.replace('/login'); }}
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.streakCard}>
          <Text style={styles.streakEmoji}>🔥</Text>
          <Text style={styles.streakNumber}>{currentStudent.streak}</Text>
          <Text style={styles.streakLabel}>day streak</Text>
        </View>

        <View style={styles.statsRow}>
          {[
            { emoji: '📖', value: currentStudent.totalBooksCompleted, label: 'Books' },
            { emoji: '⏱️', value: currentStudent.totalMinutes, label: 'Minutes' },
            { emoji: '📝', value: vocabCount, label: 'Words' },
          ].map(({ emoji, value, label }) => (
            <View key={label} style={styles.statCard}>
              <Text style={styles.statEmoji}>{emoji}</Text>
              <Text style={styles.statValue}>{value}</Text>
              <Text style={styles.statLabel}>{label}</Text>
            </View>
          ))}
        </View>

        {nextMilestone && (
          <View style={styles.milestoneCard}>
            <Text style={styles.milestoneTitle}>Next milestone</Text>
            <Text style={styles.milestoneText}>{nextMilestone.label}</Text>
            <View style={styles.milestoneBarOuter}>
              <View
                style={[
                  styles.milestoneBarInner,
                  { width: `${Math.min(100, (nextMilestone.current / nextMilestone.target) * 100)}%` },
                ]}
              />
            </View>
            <Text style={styles.milestoneProgress}>
              {nextMilestone.current} / {nextMilestone.target}
            </Text>
          </View>
        )}

        {averageFluency > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Average Fluency Score</Text>
            <View style={styles.fluencyRow}>
              <View style={styles.fluencyBarOuter}>
                <View style={[styles.fluencyBarInner, { width: `${averageFluency}%` }]} />
              </View>
              <Text style={styles.fluencyScore}>{averageFluency}</Text>
            </View>
          </View>
        )}

        {badges.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Badges</Text>
            <View style={styles.badgeGrid}>
              {badges.map((b) => {
                const def = BADGE_DEFINITIONS[b.type];
                return (
                  <View key={b.id} style={styles.badgeCard}>
                    <Text style={styles.badgeEmoji}>{def?.emoji ?? '🏅'}</Text>
                    <Text style={styles.badgeLabel}>{def?.label ?? b.type}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {sessions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Reading Sessions</Text>
            {sessions.slice(0, 5).map((s) => (
              <View key={s.id} style={styles.sessionRow}>
                <Text style={styles.sessionDate}>
                  {new Date(s.completedAt ?? s.startedAt).toLocaleDateString()}
                </Text>
                {s.assessment && (
                  <Text style={styles.sessionScore}>
                    {s.assessment.overallScore}/100
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={styles.readMoreBtn}
          onPress={() => router.replace('/(student)/library')}
        >
          <Text style={styles.readMoreBtnText}>Keep Reading 📖</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function getNextMilestone(student: {
  totalBooksCompleted: number;
  streak: number;
  totalMinutes: number;
}): { current: number; target: number; label: string } | null {
  if (student.totalBooksCompleted < 5) {
    return {
      current: student.totalBooksCompleted,
      target: 5,
      label: `Read ${5 - student.totalBooksCompleted} more book${5 - student.totalBooksCompleted === 1 ? '' : 's'} to unlock Bookworm badge!`,
    };
  }
  if (student.streak < 7) {
    return {
      current: student.streak,
      target: 7,
      label: `Read ${7 - student.streak} more day${7 - student.streak === 1 ? '' : 's'} in a row to unlock Week Reader badge!`,
    };
  }
  if (student.totalMinutes < 60) {
    return {
      current: student.totalMinutes,
      target: 60,
      label: `${60 - student.totalMinutes} more minutes to unlock 1 Hour Reader badge!`,
    };
  }
  return null;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F7FF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  backBtn: { width: 40, padding: 8 },
  backText: { fontSize: 24, color: '#4A90D9' },
  title: { flex: 1, fontSize: 26, fontWeight: '800', color: '#1A3A5C', textAlign: 'center' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  streakCard: {
    backgroundColor: '#FF6B35',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  streakEmoji: { fontSize: 48 },
  streakNumber: { fontSize: 56, fontWeight: '900', color: '#fff' },
  streakLabel: { fontSize: 18, color: '#FFE0D5', fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  statEmoji: { fontSize: 28, marginBottom: 4 },
  statValue: { fontSize: 26, fontWeight: '900', color: '#1A3A5C' },
  statLabel: { fontSize: 12, color: '#7B8D9E', fontWeight: '600' },
  milestoneCard: {
    backgroundColor: '#FFF9C4',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  milestoneTitle: { fontSize: 13, fontWeight: '600', color: '#7B6000', marginBottom: 4 },
  milestoneText: { fontSize: 15, color: '#1A3A5C', marginBottom: 12, lineHeight: 22 },
  milestoneBarOuter: {
    height: 10,
    backgroundColor: '#FFF3CD',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 6,
  },
  milestoneBarInner: { height: '100%', backgroundColor: '#F39C12', borderRadius: 5 },
  milestoneProgress: { fontSize: 13, color: '#7B6000', textAlign: 'right' },
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1A3A5C', marginBottom: 12 },
  fluencyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  fluencyBarOuter: {
    flex: 1,
    height: 14,
    backgroundColor: '#E3F2FD',
    borderRadius: 7,
    overflow: 'hidden',
  },
  fluencyBarInner: { height: '100%', backgroundColor: '#4A90D9', borderRadius: 7 },
  fluencyScore: { fontSize: 20, fontWeight: '800', color: '#4A90D9', minWidth: 36 },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  badgeCard: {
    backgroundColor: '#F0F7FF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    minWidth: 80,
  },
  badgeEmoji: { fontSize: 28, marginBottom: 4 },
  badgeLabel: { fontSize: 11, fontWeight: '600', color: '#1A3A5C', textAlign: 'center' },
  sessionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F7FF',
  },
  sessionDate: { fontSize: 14, color: '#5A7A9C' },
  sessionScore: { fontSize: 14, fontWeight: '700', color: '#4A90D9' },
  readMoreBtn: {
    backgroundColor: '#4A90D9',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 8,
  },
  readMoreBtnText: { fontSize: 18, fontWeight: '800', color: '#fff' },
  signOutBtn: { padding: 8 },
  signOutText: { fontSize: 13, color: '#E74C3C', fontWeight: '600' },
});
