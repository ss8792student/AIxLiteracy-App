import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAudioRecorder, RecordingPresets, AudioModule } from 'expo-audio';
import { Platform } from 'react-native';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { useStudent } from '../../../src/contexts/StudentContext';
import { useSession } from '../../../src/contexts/SessionContext';
import { getBookById } from '../../../src/services/db/books';
import { Book, BookPage } from '../../../src/types/models';
import { SAMPLE_PAGES } from '../../../src/constants/sampleBooks';
import { ensureRecordingDirectory, buildRecordingPath } from '../../../src/services/audio/recorder';

// ─── word state ─────────────────────────────────────────────────────────────

type WordHighlight = 'unread' | 'current' | 'correct' | 'struggled';

interface WordToken {
  raw: string;       // original text including trailing punctuation
  clean: string;     // lowercase, no punctuation — used for comparison
  globalIndex: number;
}

function tokenizePage(text: string, startGlobalIndex: number): { tokens: (WordToken | string)[]; wordCount: number } {
  // Split on whitespace, keeping spaces as separate string elements
  const parts = text.split(/(\s+)/);
  let wordCount = 0;
  const tokens: (WordToken | string)[] = parts.map((part) => {
    if (/^\s+$/.test(part) || part === '') return part;
    const token: WordToken = {
      raw: part,
      clean: part.toLowerCase().replace(/[^a-z0-9']/g, ''),
      globalIndex: startGlobalIndex + wordCount++,
    };
    return token;
  });
  return { tokens, wordCount };
}

function normalizeWord(w: string): string {
  return w.toLowerCase().replace(/[^a-z0-9']/g, '');
}

/** Match transcript words against book words from position 0, returning per-word states. */
function computeWordStates(
  transcriptWords: string[],
  allBookWords: string[], // normalized
): Map<number, Exclude<WordHighlight, 'unread'>> {
  const states = new Map<number, Exclude<WordHighlight, 'unread'>>();
  let bookPtr = 0;

  for (let ti = 0; ti < transcriptWords.length; ti++) {
    if (bookPtr >= allBookWords.length) break;
    const tw = transcriptWords[ti];
    if (!tw) continue;

    if (tw === allBookWords[bookPtr]) {
      states.set(bookPtr, 'correct');
      bookPtr++;
    } else {
      // Look ahead up to 2 positions for a match (skipped/stuttered word)
      let matched = false;
      for (let ahead = 1; ahead <= 2; ahead++) {
        if (bookPtr + ahead < allBookWords.length && tw === allBookWords[bookPtr + ahead]) {
          for (let s = bookPtr; s < bookPtr + ahead; s++) states.set(s, 'struggled');
          states.set(bookPtr + ahead, 'correct');
          bookPtr = bookPtr + ahead + 1;
          matched = true;
          break;
        }
      }
      if (!matched) {
        states.set(bookPtr, 'struggled');
        bookPtr++;
      }
    }
  }

  // Mark the word at the current pointer as 'current'
  if (bookPtr < allBookWords.length && !states.has(bookPtr)) {
    states.set(bookPtr, 'current');
  }

  return states;
}

// ─── HighlightedText component ───────────────────────────────────────────────

function HighlightedText({
  tokens,
  wordStates,
}: {
  tokens: (WordToken | string)[];
  wordStates: Map<number, Exclude<WordHighlight, 'unread'>>;
}) {
  return (
    <Text style={styles.pageText}>
      {tokens.map((token, i) => {
        if (typeof token === 'string') return token;
        const state = wordStates.get(token.globalIndex);
        return (
          <Text
            key={i}
            style={[
              styles.word,
              state === 'correct' && styles.wordCorrect,
              state === 'struggled' && styles.wordStruggled,
              state === 'current' && styles.wordCurrent,
            ]}
          >
            {token.raw}
          </Text>
        );
      })}
    </Text>
  );
}

// ─── Reading screen ──────────────────────────────────────────────────────────

export default function ReadingScreen() {
  const { bookId } = useLocalSearchParams<{ bookId: string }>();
  const router = useRouter();
  const { currentStudent } = useStudent();
  const { activeSession, startSession, finishSession } = useSession();

  const [book, setBook] = useState<Book | null>(null);
  const [pages, setPages] = useState<BookPage[]>([]);
  const [pageTokens, setPageTokens] = useState<(WordToken | string)[][]>([]);
  const [pageWordOffsets, setPageWordOffsets] = useState<number[]>([]);
  const [allBookWords, setAllBookWords] = useState<string[]>([]);

  const [currentPage, setCurrentPage] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [wordStates, setWordStates] = useState<Map<number, Exclude<WordHighlight, 'unread'>>>(new Map());

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingPathRef = useRef<string>('');
  const sessionIdRef = useRef<string>('');
  const isActiveRef = useRef(true);

  // Transcript accumulation across recognition segments
  const finalTranscriptRef = useRef<string>('');
  const interimTranscriptRef = useRef<string>('');
  const speechActiveRef = useRef(false);

  // ── speech recognition events (hooks must be unconditional) ──────────────

  useSpeechRecognitionEvent('result', (event) => {
    const latest = event.results[0]?.transcript ?? '';
    interimTranscriptRef.current = event.isFinal ? '' : latest;
    if (event.isFinal) {
      finalTranscriptRef.current = (finalTranscriptRef.current + ' ' + latest).trim();
    }

    const fullTranscript = (finalTranscriptRef.current + ' ' + interimTranscriptRef.current).trim();
    const spokenWords = fullTranscript
      .toLowerCase()
      .replace(/[^a-z0-9'\s]/g, '')
      .split(/\s+/)
      .filter(Boolean);

    setWordStates(computeWordStates(spokenWords, allBookWords));
  });

  useSpeechRecognitionEvent('end', () => {
    // Commit interim to final on end
    if (interimTranscriptRef.current) {
      finalTranscriptRef.current = (finalTranscriptRef.current + ' ' + interimTranscriptRef.current).trim();
      interimTranscriptRef.current = '';
    }
    // Auto-restart recognition if still reading
    if (isActiveRef.current && speechActiveRef.current && !isPaused) {
      ExpoSpeechRecognitionModule.start({ lang: 'en-US', interimResults: true, continuous: false });
    }
  });

  useSpeechRecognitionEvent('error', () => {
    // Restart on transient errors (e.g. no-speech timeout)
    if (isActiveRef.current && speechActiveRef.current && !isPaused) {
      ExpoSpeechRecognitionModule.start({ lang: 'en-US', interimResults: true, continuous: false });
    }
  });

  useEffect(() => {
    isActiveRef.current = true;
    loadBook();
    return () => {
      isActiveRef.current = false;
      speechActiveRef.current = false;
      ExpoSpeechRecognitionModule.stop();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [bookId]);

  // Recompute word states when allBookWords resolves
  useEffect(() => {
    if (allBookWords.length > 0) {
      setWordStates(computeWordStates([], allBookWords)); // mark word 0 as 'current'
    }
  }, [allBookWords]);

  async function loadBook() {
    const b = await getBookById(bookId);
    setBook(b);
    const bookPages = SAMPLE_PAGES[bookId] ?? [];
    setPages(bookPages);

    // Build per-page token arrays and global word index offsets
    const builtTokens: (WordToken | string)[][] = [];
    const offsets: number[] = [];
    const flatWords: string[] = [];
    let globalIdx = 0;

    for (const page of bookPages) {
      offsets.push(globalIdx);
      const { tokens, wordCount } = tokenizePage(page.text, globalIdx);
      builtTokens.push(tokens);
      for (const t of tokens) {
        if (typeof t !== 'string') flatWords.push(t.clean);
      }
      globalIdx += wordCount;
    }

    setPageTokens(builtTokens);
    setPageWordOffsets(offsets);
    setAllBookWords(flatWords);

    // Resolve session
    if (activeSession?.bookId === bookId) {
      sessionIdRef.current = activeSession.id;
    } else if (currentStudent) {
      const session = await startSession(currentStudent.id, bookId);
      sessionIdRef.current = session.id;
    }

    // Start timer
    timerRef.current = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    setIsRecording(true);

    // Start speech recognition (works on web via Web Speech API, and native)
    await startSpeechRecognition();

    // Also start audio recording on native
    if (Platform.OS !== 'web') {
      try {
        const perm = await AudioModule.requestRecordingPermissionsAsync();
        if (perm.granted) {
          await ensureRecordingDirectory();
          await startAudioRecording();
        }
      } catch {}
    }
  }

  async function startSpeechRecognition() {
    try {
      const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!perm.granted) return;
      speechActiveRef.current = true;
      ExpoSpeechRecognitionModule.start({ lang: 'en-US', interimResults: true, continuous: false });
    } catch {}
  }

  async function startAudioRecording() {
    try {
      const path = buildRecordingPath();
      recordingPathRef.current = path;
      await audioRecorder.prepareToRecordAsync(RecordingPresets.HIGH_QUALITY);
      audioRecorder.record();
    } catch {}
  }

  async function togglePause() {
    if (isPaused) {
      // Resume
      if (Platform.OS !== 'web') audioRecorder.record();
      speechActiveRef.current = true;
      ExpoSpeechRecognitionModule.start({ lang: 'en-US', interimResults: true, continuous: false });
      timerRef.current = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    } else {
      // Pause
      if (Platform.OS !== 'web') audioRecorder.pause();
      speechActiveRef.current = false;
      ExpoSpeechRecognitionModule.stop();
      if (timerRef.current) clearInterval(timerRef.current);
    }
    setIsPaused((p) => !p);
  }

  async function handleFinish() {
    if (isFinishing) return;

    // Ensure we have a session
    if (!sessionIdRef.current && currentStudent) {
      const session = await startSession(currentStudent.id, bookId);
      sessionIdRef.current = session.id;
    }
    if (!sessionIdRef.current) return;

    setIsFinishing(true);
    isActiveRef.current = false;
    speechActiveRef.current = false;
    if (timerRef.current) clearInterval(timerRef.current);

    // Stop speech recognition and commit final transcript
    ExpoSpeechRecognitionModule.stop();
    const fullTranscript = (finalTranscriptRef.current + ' ' + interimTranscriptRef.current).trim();

    let audioPath: string | undefined;
    if (Platform.OS !== 'web') {
      try {
        await audioRecorder.stop();
        audioPath = recordingPathRef.current || undefined;
      } catch {}
    }

    await finishSession(sessionIdRef.current, {
      completedAt: new Date().toISOString(),
      audioPath,
      transcript: fullTranscript || undefined,
    });

    router.replace(`/(student)/feedback/${sessionIdRef.current}`);
  }

  function formatTime(s: number): string {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    return `${m}:${(s % 60).toString().padStart(2, '0')}`;
  }

  if (!book || pages.length === 0 || pageTokens.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4A90D9" />
      </View>
    );
  }

  const progress = (currentPage + 1) / pages.length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.progressBarOuter}>
          <View style={[styles.progressBarInner, { width: `${progress * 100}%` }]} />
        </View>
        <Text style={styles.pageCounter}>{currentPage + 1} / {pages.length}</Text>
      </View>

      <View style={styles.micRow}>
        <View style={[styles.micIndicator, isRecording && !isPaused ? styles.micActive : styles.micInactive]}>
          <Text style={styles.micEmoji}>{isRecording && !isPaused ? '🎙️' : '⏸️'}</Text>
        </View>
        <Text style={styles.timer}>{formatTime(elapsedSeconds)}</Text>
      </View>

      <ScrollView style={styles.pageContent} contentContainerStyle={styles.pageContentInner}>
        {pageTokens[currentPage] ? (
          <HighlightedText tokens={pageTokens[currentPage]} wordStates={wordStates} />
        ) : null}
      </ScrollView>

      <View style={styles.navRow}>
        {currentPage > 0 && (
          <TouchableOpacity style={styles.navBtn} onPress={() => setCurrentPage((p) => p - 1)}>
            <Text style={styles.navBtnText}>◀ Back</Text>
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }} />
        {currentPage < pages.length - 1 && (
          <TouchableOpacity style={styles.navBtn} onPress={() => setCurrentPage((p) => p + 1)}>
            <Text style={styles.navBtnText}>Next ▶</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.pauseBtn} onPress={togglePause}>
          <Text style={styles.pauseBtnText}>{isPaused ? '▶ Resume' : '⏸ Pause'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.finishBtn, isFinishing && styles.finishBtnDisabled]}
          onPress={handleFinish}
          disabled={isFinishing}
        >
          {isFinishing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.finishBtnText}>✓ Finished Reading</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFEF7' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFEF7' },
  topBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBarOuter: {
    flex: 1,
    height: 8,
    backgroundColor: '#E3F2FD',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarInner: { height: '100%', backgroundColor: '#4A90D9', borderRadius: 4 },
  pageCounter: { fontSize: 13, color: '#7B8D9E', minWidth: 36, textAlign: 'right' },
  micRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  micIndicator: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micActive: { backgroundColor: '#FFE0B2' },
  micInactive: { backgroundColor: '#F5F5F5' },
  micEmoji: { fontSize: 24 },
  timer: { fontSize: 18, fontWeight: '700', color: '#1A3A5C' },
  pageContent: { flex: 1 },
  pageContentInner: {
    paddingHorizontal: 28,
    paddingVertical: 24,
  },
  pageText: {
    fontSize: 22,
    lineHeight: 42,
    color: '#1A3A5C',
    letterSpacing: 0.3,
  },
  word: {
    fontSize: 22,
    lineHeight: 42,
    color: '#1A3A5C',
    letterSpacing: 0.3,
  },
  wordCorrect: {
    backgroundColor: '#C8F7C5',
    color: '#1A5C25',
    borderRadius: 3,
  },
  wordStruggled: {
    backgroundColor: '#FFE0A0',
    color: '#7A4800',
    borderRadius: 3,
  },
  wordCurrent: {
    backgroundColor: '#BBDEFB',
    color: '#0D47A1',
    borderRadius: 3,
    fontWeight: '700',
  },
  navRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  navBtn: { paddingVertical: 10, paddingHorizontal: 16 },
  navBtnText: { fontSize: 16, color: '#4A90D9', fontWeight: '600' },
  bottomBar: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E3F2FD',
  },
  pauseBtn: {
    flex: 1,
    backgroundColor: '#E3F2FD',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  pauseBtnText: { fontSize: 16, fontWeight: '700', color: '#4A90D9' },
  finishBtn: {
    flex: 2,
    backgroundColor: '#2ECC71',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  finishBtnDisabled: { backgroundColor: '#B0BEC5' },
  finishBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },
});
