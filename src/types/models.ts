export type Role = 'student' | 'teacher';
export type Language = 'en' | 'es' | 'fr' | 'pt';

export interface Student {
  id: string;
  name: string;
  avatarId: number;
  grade: number;
  language: Language;
  role: Role;
  streak: number;
  totalMinutes: number;
  totalWords: number;
  totalBooksCompleted: number;
  createdAt: string;
}

export interface BookPage {
  pageNumber: number;
  text: string;
  imageUri?: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  coverUri?: string;
  readingLevel: number;
  language: Language;
  estimatedMinutes: number;
  pagesPath?: string;
  isDownloaded: boolean;
  isAssigned: boolean;
  assignedBy?: string;
  curriculumAlignment?: string;
  wordCount: number;
}

export interface ReadingAssessment {
  overallScore: number;
  fluencyScore: number;
  pronunciationScore: number;
  vocabularyScore: number;
  strengths: string[];
  improvements: string[];
  wordsToReview: string[];
  encouragingMessage: string;
}

export interface ReadingSession {
  id: string;
  studentId: string;
  bookId: string;
  startedAt: string;
  completedAt?: string;
  audioPath?: string;
  transcript?: string;
  assessment?: ReadingAssessment;
  syncedAt?: string;
}

export type ActivityType =
  | 'multiple_choice'
  | 'fill_blank'
  | 'vocab_match'
  | 'sentence_order'
  | 'phonics'
  | 'short_answer';

export interface Activity {
  id: string;
  type: ActivityType;
  question: string;
  options?: string[];
  correctAnswer: string | string[];
  hint?: string;
  targetWord?: string;
}

export interface PracticeSession {
  id: string;
  readingSessionId: string;
  activities: Activity[];
  responses: Record<string, string | string[]>;
  score: number;
  completedAt?: string;
  syncedAt?: string;
}

export interface VocabularyEntry {
  id: string;
  studentId: string;
  word: string;
  definition: string;
  pronunciation?: string;
  exampleSentence?: string;
  encounteredBookId: string;
  masteryLevel: number;
  lastPracticedAt?: string;
  addedAt: string;
}

export type BadgeType =
  | 'first_book'
  | 'five_books'
  | 'ten_books'
  | 'streak_3'
  | 'streak_7'
  | 'streak_30'
  | 'words_100'
  | 'words_500'
  | 'words_1000'
  | 'minutes_60'
  | 'minutes_300'
  | 'fluency_level_2'
  | 'fluency_level_3'
  | 'fluency_level_4';

export interface Badge {
  id: string;
  studentId: string;
  type: BadgeType;
  unlockedAt: string;
}

export interface SyncQueueItem {
  id: string;
  entityType: 'reading_session' | 'practice_session' | 'vocabulary' | 'student';
  entityId: string;
  action: 'create' | 'update';
  createdAt: string;
  attempts: number;
}

export interface ProgressSnapshot {
  student: Student;
  recentSessions: ReadingSession[];
  badges: Badge[];
  vocabularyCount: number;
  nextMilestone: {
    type: string;
    current: number;
    target: number;
    label: string;
  } | null;
  recommendedBook?: Book;
}
