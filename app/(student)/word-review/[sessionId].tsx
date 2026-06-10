import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { getSessionById } from '../../../src/services/db/sessions';
import { SAMPLE_PAGES } from '../../../src/constants/sampleBooks';

// ─── fuzzy match (same as feedback screen) ──────────────────────────────────

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1];
      else dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function wordsMatch(spoken: string, target: string): boolean {
  if (spoken === target) return true;
  const variants = [target + 's', target + 'es', target + 'd', target + 'ed', target + 'ing'];
  if (variants.includes(spoken)) return true;
  if (spoken + 's' === target || spoken + 'es' === target) return true;
  if (spoken + 'd' === target || spoken + 'ed' === target) return true;
  if (spoken + 'ing' === target) return true;
  const maxDist = target.length >= 7 ? 2 : target.length >= 4 ? 1 : 0;
  return maxDist > 0 && levenshtein(spoken, target) <= maxDist;
}

function getMissedWords(transcript: string, bookText: string): string[] {
  const normalize = (w: string) => w.toLowerCase().replace(/[^a-z0-9']/g, '');
  const bookWords = bookText.split(/\s+/).map(normalize).filter(Boolean);
  const spokenWords = transcript.split(/\s+/).map(normalize).filter(Boolean);

  const missed: string[] = [];
  let bookPtr = 0;

  for (let ti = 0; ti < spokenWords.length && bookPtr < bookWords.length; ti++) {
    const sw = spokenWords[ti];
    if (!sw) continue;
    if (wordsMatch(sw, bookWords[bookPtr])) {
      bookPtr++;
    } else {
      let matchedAhead = false;
      for (let ahead = 1; ahead <= 3; ahead++) {
        if (bookPtr + ahead < bookWords.length && wordsMatch(sw, bookWords[bookPtr + ahead])) {
          for (let s = bookPtr; s < bookPtr + ahead; s++) {
            const w = bookWords[s];
            if (w.length > 2 && !missed.includes(w)) missed.push(w);
          }
          bookPtr = bookPtr + ahead + 1;
          matchedAhead = true;
          break;
        }
      }
      if (!matchedAhead) {
        const w = bookWords[bookPtr];
        if (w.length > 2 && !missed.includes(w)) missed.push(w);
        bookPtr++;
      }
    }
  }

  return missed;
}

// ─── screen ──────────────────────────────────────────────────────────────────

type CardState = 'idle' | 'listening' | 'correct' | 'tryAgain';

export default function WordReviewScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const router = useRouter();

  const [words, setWords] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [cardState, setCardState] = useState<CardState>('idle');
  const [isLoading, setIsLoading] = useState(true);
  const [attempts, setAttempts] = useState(0);

  const isListeningRef = useRef(false);
  const currentWordRef = useRef('');

  useSpeechRecognitionEvent('result', (event) => {
    if (!isListeningRef.current) return;
    const heard = (event.results[0]?.transcript ?? '')
      .toLowerCase()
      .replace(/[^a-z0-9'\s]/g, '')
      .trim();
    const target = currentWordRef.current;

    if (event.isFinal || heard.split(/\s+/).some((w) => wordsMatch(w, target))) {
      stopListening();
      const gotIt = heard.split(/\s+/).some((w) => wordsMatch(w, target));
      if (gotIt) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Speech.speak('Great job!', { language: 'en-US', rate: 1.0 });
        setCardState('correct');
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        setCardState('tryAgain');
        setAttempts((a) => a + 1);
      }
    }
  });

  useSpeechRecognitionEvent('end', () => {
    if (isListeningRef.current) {
      // Timeout — treat as try-again
      isListeningRef.current = false;
      setCardState('tryAgain');
      setAttempts((a) => a + 1);
    }
  });

  useSpeechRecognitionEvent('error', () => {
    if (isListeningRef.current) {
      isListeningRef.current = false;
      setCardState('tryAgain');
    }
  });

  useEffect(() => {
    load();
    return () => {
      stopListening();
    };
  }, [sessionId]);

  useEffect(() => {
    if (words[index]) {
      currentWordRef.current = words[index];
    }
  }, [index, words]);

  async function load() {
    const s = await getSessionById(sessionId);
    if (!s) { router.back(); return; }
    const bookPages = SAMPLE_PAGES[s.bookId] ?? [];
    const bookText = bookPages.map((p) => p.text).join(' ');
    const transcript = s.transcript ?? '';
    const missed = transcript.trim() ? getMissedWords(transcript, bookText) : [];
    if (missed.length === 0) { router.back(); return; }
    setWords(missed);
    currentWordRef.current = missed[0];
    setIsLoading(false);
    // Auto-speak first word
    setTimeout(() => Speech.speak(missed[0], { language: 'en-US', rate: 0.75 }), 500);
  }

  function stopListening() {
    if (isListeningRef.current) {
      isListeningRef.current = false;
      ExpoSpeechRecognitionModule.stop();
    }
  }

  async function handleHear() {
    Haptics.selectionAsync();
    stopListening();
    setCardState('idle');
    Speech.speak(currentWordRef.current, { language: 'en-US', rate: 0.75 });
  }

  async function handleSay() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    stopListening();
    setCardState('listening');
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!perm.granted) { setCardState('idle'); return; }
    isListeningRef.current = true;
    ExpoSpeechRecognitionModule.start({ lang: 'en-US', interimResults: true, continuous: false });
  }

  function handleNext() {
    Haptics.selectionAsync();
    stopListening();
    setAttempts(0);
    if (index + 1 >= words.length) {
      router.replace(`/(student)/feedback/${sessionId}`);
    } else {
      setIndex((i) => i + 1);
      setCardState('idle');
      setTimeout(() => Speech.speak(words[index + 1], { language: 'en-US', rate: 0.75 }), 300);
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#FF8C42" />
      </SafeAreaView>
    );
  }

  const word = words[index];
  const isDone = index >= words.length;

  if (isDone) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.doneEmoji}>🎉</Text>
        <Text style={styles.doneTitle}>All done!</Text>
        <TouchableOpacity style={styles.nextBtn} onPress={() => router.replace(`/(student)/feedback/${sessionId}`)}>
          <Text style={styles.nextBtnText}>Back to Results →</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Word Practice</Text>
        <Text style={styles.counter}>{index + 1} / {words.length}</Text>
      </View>

      <View style={styles.progressOuter}>
        <View style={[styles.progressInner, { width: `${((index) / words.length) * 100}%` }]} />
      </View>

      <View style={styles.cardArea}>
        <View style={[
          styles.wordCard,
          cardState === 'correct' && styles.wordCardCorrect,
          cardState === 'tryAgain' && styles.wordCardTryAgain,
          cardState === 'listening' && styles.wordCardListening,
        ]}>
          {cardState === 'correct' ? (
            <>
              <Text style={styles.resultEmoji}>✅</Text>
              <Text style={styles.wordText}>{word}</Text>
              <Text style={styles.resultLabel}>You got it!</Text>
            </>
          ) : cardState === 'tryAgain' ? (
            <>
              <Text style={styles.resultEmoji}>💪</Text>
              <Text style={styles.wordText}>{word}</Text>
              <Text style={styles.resultLabel}>
                {attempts >= 3 ? "That's a tricky one — keep going!" : 'Try again!'}
              </Text>
            </>
          ) : cardState === 'listening' ? (
            <>
              <Text style={styles.resultEmoji}>🎤</Text>
              <Text style={styles.wordText}>{word}</Text>
              <Text style={styles.resultLabel}>Listening…</Text>
            </>
          ) : (
            <>
              <Text style={styles.wordText}>{word}</Text>
              <Text style={styles.hintText}>Tap 🔊 to hear it, then 🎤 to say it</Text>
            </>
          )}
        </View>
      </View>

      <View style={styles.btnRow}>
        <TouchableOpacity style={styles.hearBtn} onPress={handleHear} disabled={cardState === 'listening'}>
          <Text style={styles.hearBtnText}>🔊 Hear it</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sayBtn, cardState === 'listening' && styles.sayBtnActive]}
          onPress={cardState === 'listening' ? stopListening : handleSay}
        >
          <Text style={styles.sayBtnText}>
            {cardState === 'listening' ? '⏹ Stop' : '🎤 Say it'}
          </Text>
        </TouchableOpacity>
      </View>

      {(cardState === 'correct' || cardState === 'tryAgain') && (
        <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
          <Text style={styles.nextBtnText}>
            {cardState === 'correct'
              ? index + 1 >= words.length ? '🎉 All done!' : 'Next Word →'
              : 'Skip for now →'}
          </Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8F0' },
  center: { flex: 1, backgroundColor: '#FFF8F0', alignItems: 'center', justifyContent: 'center', padding: 32 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#1A3A5C' },
  counter: { fontSize: 16, color: '#7B8D9E', fontWeight: '600' },
  progressOuter: {
    height: 6,
    backgroundColor: '#FFE0C0',
    marginHorizontal: 24,
    borderRadius: 3,
    marginBottom: 24,
    overflow: 'hidden',
  },
  progressInner: { height: '100%', backgroundColor: '#FF8C42', borderRadius: 3 },
  cardArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  wordCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    borderWidth: 3,
    borderColor: 'transparent',
  },
  wordCardCorrect: { borderColor: '#2ECC71', backgroundColor: '#F0FFF4' },
  wordCardTryAgain: { borderColor: '#FFB347', backgroundColor: '#FFFBF0' },
  wordCardListening: { borderColor: '#4A90D9', backgroundColor: '#F0F7FF' },
  wordText: {
    fontSize: 52,
    fontWeight: '900',
    color: '#1A3A5C',
    textAlign: 'center',
    letterSpacing: 1,
    marginBottom: 12,
  },
  hintText: { fontSize: 15, color: '#9BB5CC', textAlign: 'center' },
  resultEmoji: { fontSize: 48, marginBottom: 12 },
  resultLabel: { fontSize: 20, fontWeight: '700', color: '#1A3A5C', textAlign: 'center' },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  hearBtn: {
    flex: 1,
    backgroundColor: '#E8F4FD',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  hearBtnText: { fontSize: 18, fontWeight: '700', color: '#2980B9' },
  sayBtn: {
    flex: 1,
    backgroundColor: '#FF8C42',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  sayBtnActive: { backgroundColor: '#E74C3C' },
  sayBtnText: { fontSize: 18, fontWeight: '700', color: '#fff' },
  nextBtn: {
    marginHorizontal: 24,
    marginBottom: 24,
    backgroundColor: '#2ECC71',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  nextBtnText: { fontSize: 18, fontWeight: '800', color: '#fff' },
  doneEmoji: { fontSize: 72, marginBottom: 16 },
  doneTitle: { fontSize: 28, fontWeight: '900', color: '#1A3A5C', marginBottom: 32 },
});
