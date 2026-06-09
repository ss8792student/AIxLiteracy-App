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
import { useStudent } from '../../../src/contexts/StudentContext';
import { useSession } from '../../../src/contexts/SessionContext';
import { useSync } from '../../../src/contexts/SyncContext';
import { getSessionById } from '../../../src/services/db/sessions';
import { assessReading, fallbackLocalAssessment } from '../../../src/services/ai/assessment';
import { getBookById } from '../../../src/services/db/books';
import { completeReadingSession } from '../../../src/services/db/sessions';
import { SAMPLE_PAGES } from '../../../src/constants/sampleBooks';
import { ReadingAssessment, ReadingSession, Book } from '../../../src/types/models';

export default function FeedbackScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const router = useRouter();
  const { currentStudent } = useStudent();
  const { isOnline } = useSync();

  const [session, setSession] = useState<ReadingSession | null>(null);
  const [book, setBook] = useState<Book | null>(null);
  const [assessment, setAssessment] = useState<ReadingAssessment | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(true);

  useEffect(() => {
    loadAndAnalyze();
  }, [sessionId]);

  async function loadAndAnalyze() {
    const s = await getSessionById(sessionId);
    if (!s) return;
    setSession(s);

    const b = await getBookById(s.bookId);
    setBook(b);

    if (s.assessment) {
      setAssessment(s.assessment);
      setIsAnalyzing(false);
      return;
    }

    const bookPages = SAMPLE_PAGES[s.bookId] ?? [];
    const bookText = bookPages.map((p) => p.text).join(' ');
    const transcript = s.transcript ?? '';

    // No transcript means no real reading was captured — give honest feedback
    if (!transcript.trim()) {
      const noReadingResult: ReadingAssessment = {
        overallScore: 0,
        fluencyScore: 0,
        pronunciationScore: 0,
        vocabularyScore: 0,
        strengths: ['You opened the book and gave it a try!'],
        improvements: ['Make sure to read aloud so the app can hear you.'],
        wordsToReview: [],
        encouragingMessage: "We couldn't hear your reading this time. Try again and speak clearly — you've got this!",
      };
      setAssessment(noReadingResult);
      setIsAnalyzing(false);
      return;
    }

    let result: ReadingAssessment;

    if (isOnline) {
      try {
        result = await assessReading(transcript, bookText, currentStudent?.grade ?? 3);
      } catch {
        result = fallbackLocalAssessment(transcript, bookText);
      }
    } else {
      result = fallbackLocalAssessment(transcript, bookText);
    }

    await completeReadingSession(s.id, {
      completedAt: s.completedAt ?? new Date().toISOString(),
      audioPath: s.audioPath,
      transcript,
      assessment: result,
    });

    setAssessment(result);
    setIsAnalyzing(false);
  }

  function getScoreColor(score: number): string {
    if (score >= 80) return '#2ECC71';
    if (score >= 60) return '#F39C12';
    return '#E74C3C';
  }

  function getScoreEmoji(score: number): string {
    if (score >= 80) return '🌟';
    if (score >= 60) return '👍';
    return '💪';
  }

  if (isAnalyzing) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.loadingEmoji}>🤔</Text>
        <Text style={styles.loadingTitle}>Analyzing your reading...</Text>
        <Text style={styles.loadingSubtitle}>
          {isOnline ? 'Getting your personalized feedback' : 'Working offline — saving your progress'}
        </Text>
        <ActivityIndicator size="large" color="#4A90D9" style={{ marginTop: 24 }} />
      </SafeAreaView>
    );
  }

  if (!assessment) return null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.encouragingMessage}>{assessment.encouragingMessage}</Text>

        <View style={styles.scoreRow}>
          {[
            { label: 'Overall', score: assessment.overallScore },
            { label: 'Fluency', score: assessment.fluencyScore },
            { label: 'Pronunciation', score: assessment.pronunciationScore },
          ].map(({ label, score }) => (
            <View key={label} style={styles.scoreCard}>
              <Text style={styles.scoreEmoji}>{getScoreEmoji(score)}</Text>
              <Text style={[styles.scoreNumber, { color: getScoreColor(score) }]}>{score}</Text>
              <Text style={styles.scoreLabel}>{label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What you did great 🌟</Text>
          {assessment.strengths.map((s, i) => (
            <View key={i} style={styles.bulletRow}>
              <Text style={styles.bulletDot}>✓</Text>
              <Text style={styles.bulletText}>{s}</Text>
            </View>
          ))}
        </View>

        {assessment.improvements.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Keep working on 💪</Text>
            {assessment.improvements.map((s, i) => (
              <View key={i} style={styles.bulletRow}>
                <Text style={styles.bulletDot}>→</Text>
                <Text style={styles.bulletText}>{s}</Text>
              </View>
            ))}
          </View>
        )}

        {assessment.wordsToReview.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Practice these words 📝</Text>
            <View style={styles.wordChips}>
              {assessment.wordsToReview.map((w, i) => (
                <View key={i} style={styles.wordChip}>
                  <Text style={styles.wordChipText}>{w}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {!isOnline && (
          <View style={styles.offlineBanner}>
            <Text style={styles.offlineBannerText}>
              📡 Full feedback will be ready when you're back online
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.practiceBtn}
          onPress={() => router.replace(`/(student)/practice/${sessionId}`)}
        >
          <Text style={styles.practiceBtnText}>Start Practice Activities →</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.libraryBtn}
          onPress={() => router.replace('/(student)/library')}
        >
          <Text style={styles.libraryBtnText}>Back to Library</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F7FF' },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F0F7FF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingEmoji: { fontSize: 64, marginBottom: 16 },
  loadingTitle: { fontSize: 24, fontWeight: '800', color: '#1A3A5C', textAlign: 'center' },
  loadingSubtitle: { fontSize: 16, color: '#5A7A9C', textAlign: 'center', marginTop: 8 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  encouragingMessage: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A3A5C',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 32,
  },
  scoreRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  scoreCard: {
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
  scoreEmoji: { fontSize: 28, marginBottom: 6 },
  scoreNumber: { fontSize: 32, fontWeight: '900' },
  scoreLabel: { fontSize: 12, color: '#7B8D9E', marginTop: 4, fontWeight: '600' },
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1A3A5C', marginBottom: 12 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  bulletDot: { fontSize: 16, color: '#2ECC71', marginRight: 8, marginTop: 1 },
  bulletText: { flex: 1, fontSize: 15, color: '#2C3E50', lineHeight: 22 },
  wordChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  wordChip: {
    backgroundColor: '#E8F4FD',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  wordChipText: { fontSize: 15, fontWeight: '600', color: '#2980B9' },
  offlineBanner: {
    backgroundColor: '#FFF3CD',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  offlineBannerText: { fontSize: 14, color: '#856404', textAlign: 'center' },
  practiceBtn: {
    backgroundColor: '#4A90D9',
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
    marginBottom: 12,
  },
  practiceBtnText: { fontSize: 18, fontWeight: '800', color: '#fff' },
  libraryBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  libraryBtnText: { fontSize: 16, color: '#5A7A9C' },
});
