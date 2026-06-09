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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getStudentById } from '../../../src/services/db/students';
import { getSessionsByStudent } from '../../../src/services/db/sessions';
import { getBadgesForStudent } from '../../../src/services/db/vocabulary';
import { Student, ReadingSession, Badge } from '../../../src/types/models';
import { getAllBooks, upsertBook } from '../../../src/services/db/books';
import { Book } from '../../../src/types/models';

export default function StudentDetailScreen() {
  const { studentId } = useLocalSearchParams<{ studentId: string }>();
  const router = useRouter();
  const [student, setStudent] = useState<Student | null>(null);
  const [sessions, setSessions] = useState<ReadingSession[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [studentId]);

  async function loadData() {
    const [s, sess, b, allBooks] = await Promise.all([
      getStudentById(studentId),
      getSessionsByStudent(studentId, 20),
      getBadgesForStudent(studentId),
      getAllBooks(),
    ]);
    setStudent(s);
    setSessions(sess);
    setBadges(b);
    setBooks(allBooks);
    setIsLoading(false);
  }

  async function assignBook(book: Book) {
    await upsertBook({ ...book, isAssigned: true, assignedBy: 'teacher' });
    setBooks((prev) => prev.map((b) => b.id === book.id ? { ...b, isAssigned: true } : b));
  }

  if (isLoading || !student) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4A90D9" />
      </View>
    );
  }

  const scores = sessions.filter((s) => s.assessment).map((s) => s.assessment!.overallScore);
  const avgScore = scores.length > 0
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{student.name}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.summaryRow}>
          {[
            { label: 'Books', value: student.totalBooksCompleted },
            { label: 'Avg Score', value: avgScore > 0 ? `${avgScore}%` : '—' },
            { label: 'Streak', value: `${student.streak}🔥` },
            { label: 'Minutes', value: student.totalMinutes },
          ].map(({ label, value }) => (
            <View key={label} style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{value}</Text>
              <Text style={styles.summaryLabel}>{label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Assign a Book</Text>
          {books.map((book) => (
            <View key={book.id} style={styles.bookRow}>
              <View style={styles.bookInfo}>
                <Text style={styles.bookTitle}>{book.title}</Text>
                <Text style={styles.bookLevel}>Level {book.readingLevel}</Text>
              </View>
              {book.isAssigned ? (
                <Text style={styles.assignedTag}>✓ Assigned</Text>
              ) : (
                <TouchableOpacity
                  style={styles.assignBtn}
                  onPress={() => assignBook(book)}
                >
                  <Text style={styles.assignBtnText}>Assign</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Sessions</Text>
          {sessions.length === 0 ? (
            <Text style={styles.emptyText}>No sessions yet</Text>
          ) : (
            sessions.slice(0, 8).map((s) => (
              <View key={s.id} style={styles.sessionRow}>
                <Text style={styles.sessionDate}>
                  {new Date(s.completedAt ?? s.startedAt).toLocaleDateString()}
                </Text>
                <Text style={styles.sessionBook}>{s.bookId}</Text>
                {s.assessment && (
                  <Text style={[
                    styles.sessionScore,
                    { color: s.assessment.overallScore >= 70 ? '#2ECC71' : s.assessment.overallScore >= 50 ? '#F39C12' : '#E74C3C' }
                  ]}>
                    {s.assessment.overallScore}/100
                  </Text>
                )}
              </View>
            ))
          )}
        </View>

        {badges.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Badges Earned</Text>
            <View style={styles.badgeRow}>
              {badges.map((b) => (
                <Text key={b.id} style={styles.badgeEmoji}>🏅</Text>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
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
  title: { flex: 1, fontSize: 22, fontWeight: '800', color: '#1A3A5C', textAlign: 'center' },
  content: { padding: 20, paddingBottom: 40 },
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 16, flexWrap: 'wrap' },
  summaryCard: {
    flex: 1,
    minWidth: '20%',
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
  summaryValue: { fontSize: 22, fontWeight: '900', color: '#1A3A5C' },
  summaryLabel: { fontSize: 11, color: '#7B8D9E', fontWeight: '600', marginTop: 2 },
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
  bookRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0F7FF' },
  bookInfo: { flex: 1 },
  bookTitle: { fontSize: 14, fontWeight: '600', color: '#1A3A5C' },
  bookLevel: { fontSize: 12, color: '#7B8D9E' },
  assignedTag: { fontSize: 13, color: '#2ECC71', fontWeight: '700' },
  assignBtn: { backgroundColor: '#4A90D9', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7 },
  assignBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  sessionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0F7FF' },
  sessionDate: { fontSize: 13, color: '#7B8D9E', minWidth: 90 },
  sessionBook: { flex: 1, fontSize: 13, color: '#5A7A9C' },
  sessionScore: { fontSize: 14, fontWeight: '700', minWidth: 50, textAlign: 'right' },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badgeEmoji: { fontSize: 28 },
  emptyText: { fontSize: 14, color: '#7B8D9E', textAlign: 'center', paddingVertical: 12 },
});
