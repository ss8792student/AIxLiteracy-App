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
import { useSync } from '../../../src/contexts/SyncContext';
import { getSessionById } from '../../../src/services/db/sessions';
import { createPracticeSession } from '../../../src/services/db/sessions';
import { generateActivities, fallbackActivities } from '../../../src/services/ai/activities';
import { SAMPLE_PAGES } from '../../../src/constants/sampleBooks';
import { Activity, PracticeSession, ReadingSession } from '../../../src/types/models';
import { randomUUID } from 'expo-crypto';

export default function PracticeScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const router = useRouter();
  const { currentStudent } = useStudent();
  const { isOnline } = useSync();

  const [session, setSession] = useState<ReadingSession | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [showResult, setShowResult] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDone, setIsDone] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    loadActivities();
  }, [sessionId]);

  async function loadActivities() {
    const s = await getSessionById(sessionId);
    if (!s) return;
    setSession(s);

    if (!s.assessment) {
      setIsLoading(false);
      return;
    }

    const bookPages = SAMPLE_PAGES[s.bookId] ?? [];
    const bookText = bookPages.map((p) => p.text).join(' ');

    let acts: Activity[];
    if (isOnline) {
      try {
        acts = await generateActivities(bookText, s.assessment, currentStudent?.grade ?? 3);
      } catch {
        acts = fallbackActivities(bookText, s.assessment);
      }
    } else {
      acts = fallbackActivities(bookText, s.assessment);
    }

    setActivities(acts);
    setIsLoading(false);
  }

  function handleAnswer(activityId: string, answer: string) {
    setResponses((prev) => ({ ...prev, [activityId]: answer }));
    setShowResult(true);
  }

  async function handleNext() {
    setShowResult(false);
    if (currentIndex < activities.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      await finishPractice();
    }
  }

  async function finishPractice() {
    if (!session) return;

    const correct = activities.filter((a) => {
      const ans = responses[a.id];
      if (!ans) return false;
      const correct = Array.isArray(a.correctAnswer)
        ? a.correctAnswer[0]
        : a.correctAnswer;
      return ans.toLowerCase().trim() === correct.toLowerCase().trim();
    }).length;

    const finalScore = Math.round((correct / activities.length) * 100);
    setScore(finalScore);

    const practice: PracticeSession = {
      id: randomUUID(),
      readingSessionId: session.id,
      activities,
      responses,
      score: finalScore,
      completedAt: new Date().toISOString(),
    };

    await createPracticeSession(practice);
    setIsDone(true);
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.loadingEmoji}>✨</Text>
        <Text style={styles.loadingTitle}>Preparing your practice...</Text>
        <ActivityIndicator size="large" color="#4A90D9" style={{ marginTop: 24 }} />
      </SafeAreaView>
    );
  }

  if (isDone) {
    const nextMilestoneWords = currentStudent
      ? Math.ceil(currentStudent.totalWords / 100 + 1) * 100
      : 100;

    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.doneContent}>
          <Text style={styles.doneEmoji}>🎉</Text>
          <Text style={styles.doneTitle}>Amazing work!</Text>
          <Text style={styles.doneScore}>{score}% correct</Text>
          <Text style={styles.doneMessage}>
            You completed today's reading and practice. Your skills are growing every day!
          </Text>
          <View style={styles.nextHintCard}>
            <Text style={styles.nextHintText}>
              📚 Come back tomorrow to keep your reading streak going!
            </Text>
          </View>
          <TouchableOpacity
            style={styles.progressBtn}
            onPress={() => router.replace('/(student)/progress')}
          >
            <Text style={styles.progressBtnText}>See My Progress 📊</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.libraryBtn}
            onPress={() => router.replace('/(student)/library')}
          >
            <Text style={styles.libraryBtnText}>Read Another Book</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (activities.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.noActivitiesEmoji}>📚</Text>
          <Text style={styles.noActivitiesText}>Great job reading!</Text>
          <TouchableOpacity
            style={styles.progressBtn}
            onPress={() => router.replace('/(student)/progress')}
          >
            <Text style={styles.progressBtnText}>See My Progress 📊</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const activity = activities[currentIndex];
  const selectedAnswer = responses[activity.id];
  const isCorrect =
    selectedAnswer?.toLowerCase().trim() ===
    (Array.isArray(activity.correctAnswer)
      ? activity.correctAnswer[0]
      : activity.correctAnswer
    ).toLowerCase().trim();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.progressBarOuter}>
          <View
            style={[
              styles.progressBarInner,
              { width: `${((currentIndex + (showResult ? 1 : 0)) / activities.length) * 100}%` },
            ]}
          />
        </View>
        <Text style={styles.progressText}>{currentIndex + 1} / {activities.length}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.questionLabel}>Question {currentIndex + 1}</Text>
        <Text style={styles.question}>{activity.question}</Text>

        {activity.type === 'multiple_choice' && activity.options && (
          <View style={styles.optionsContainer}>
            {activity.options.map((option, i) => {
              const isSelected = selectedAnswer === option;
              const isCorrectOption = option.toLowerCase().trim() ===
                (Array.isArray(activity.correctAnswer)
                  ? activity.correctAnswer[0]
                  : activity.correctAnswer
                ).toLowerCase().trim();

              let optionStyle = styles.option;
              if (showResult && isCorrectOption) optionStyle = { ...styles.option, ...styles.optionCorrect };
              if (showResult && isSelected && !isCorrectOption) optionStyle = { ...styles.option, ...styles.optionWrong };

              return (
                <TouchableOpacity
                  key={i}
                  style={optionStyle}
                  onPress={() => !showResult && handleAnswer(activity.id, option)}
                  disabled={showResult}
                >
                  <Text style={styles.optionText}>{option}</Text>
                  {showResult && isCorrectOption && <Text style={styles.checkmark}>✓</Text>}
                  {showResult && isSelected && !isCorrectOption && <Text style={styles.xmark}>✗</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {showResult && (
          <View style={[styles.resultBanner, isCorrect ? styles.resultCorrect : styles.resultWrong]}>
            <Text style={styles.resultText}>
              {isCorrect ? '🌟 Correct! Well done!' : `💪 The answer is: ${Array.isArray(activity.correctAnswer) ? activity.correctAnswer[0] : activity.correctAnswer}`}
            </Text>
          </View>
        )}

        {activity.hint && !showResult && (
          <Text style={styles.hintText}>💡 Hint: {activity.hint}</Text>
        )}
      </ScrollView>

      {showResult && (
        <View style={styles.nextRow}>
          <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
            <Text style={styles.nextBtnText}>
              {currentIndex < activities.length - 1 ? 'Next Question →' : 'Finish Practice ✓'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 12,
  },
  progressBarOuter: {
    flex: 1,
    height: 10,
    backgroundColor: '#E3F2FD',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarInner: { height: '100%', backgroundColor: '#4A90D9', borderRadius: 5 },
  progressText: { fontSize: 13, color: '#7B8D9E' },
  content: { padding: 24, paddingBottom: 40 },
  questionLabel: { fontSize: 13, fontWeight: '600', color: '#7B8D9E', marginBottom: 8 },
  question: { fontSize: 20, fontWeight: '700', color: '#1A3A5C', marginBottom: 24, lineHeight: 30 },
  optionsContainer: { gap: 12 },
  option: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: '#E3F2FD',
  },
  optionCorrect: { backgroundColor: '#E8F5E9', borderColor: '#2ECC71' },
  optionWrong: { backgroundColor: '#FFEBEE', borderColor: '#E74C3C' },
  optionText: { fontSize: 16, color: '#1A3A5C', flex: 1 },
  checkmark: { fontSize: 20, color: '#2ECC71' },
  xmark: { fontSize: 20, color: '#E74C3C' },
  resultBanner: { borderRadius: 14, padding: 16, marginTop: 20 },
  resultCorrect: { backgroundColor: '#E8F5E9' },
  resultWrong: { backgroundColor: '#FFF3E0' },
  resultText: { fontSize: 16, fontWeight: '600', color: '#1A3A5C', textAlign: 'center' },
  hintText: { fontSize: 14, color: '#7B8D9E', marginTop: 16, fontStyle: 'italic' },
  nextRow: { padding: 16, borderTopWidth: 1, borderTopColor: '#E3F2FD' },
  nextBtn: {
    backgroundColor: '#4A90D9',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  nextBtnText: { fontSize: 18, fontWeight: '800', color: '#fff' },
  doneContent: { padding: 32, alignItems: 'center' },
  doneEmoji: { fontSize: 80, marginBottom: 16, marginTop: 32 },
  doneTitle: { fontSize: 32, fontWeight: '900', color: '#1A3A5C', marginBottom: 8 },
  doneScore: { fontSize: 48, fontWeight: '900', color: '#2ECC71', marginBottom: 16 },
  doneMessage: {
    fontSize: 18,
    color: '#5A7A9C',
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 24,
  },
  nextHintCard: {
    backgroundColor: '#FFF9C4',
    borderRadius: 16,
    padding: 16,
    marginBottom: 32,
  },
  nextHintText: { fontSize: 16, color: '#7B6000', textAlign: 'center' },
  progressBtn: {
    backgroundColor: '#4A90D9',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignItems: 'center',
    marginBottom: 12,
    width: '100%',
  },
  progressBtnText: { fontSize: 18, fontWeight: '800', color: '#fff' },
  libraryBtn: { paddingVertical: 16, alignItems: 'center' },
  libraryBtnText: { fontSize: 16, color: '#5A7A9C' },
  noActivitiesEmoji: { fontSize: 64, marginBottom: 16 },
  noActivitiesText: { fontSize: 22, fontWeight: '700', color: '#1A3A5C', marginBottom: 32 },
});
