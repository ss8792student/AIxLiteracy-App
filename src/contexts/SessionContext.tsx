import React, { createContext, useContext, useState, useCallback } from 'react';
import { ReadingSession, PracticeSession } from '../types/models';
import { createReadingSession, completeReadingSession } from '../services/db/sessions';
import { randomUUID } from 'expo-crypto';

interface SessionContextValue {
  activeSession: ReadingSession | null;
  activePractice: PracticeSession | null;
  startSession: (studentId: string, bookId: string) => Promise<ReadingSession>;
  finishSession: (sessionId: string, updates: Parameters<typeof completeReadingSession>[1]) => Promise<void>;
  setPractice: (practice: PracticeSession) => void;
  clearSession: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [activeSession, setActiveSession] = useState<ReadingSession | null>(null);
  const [activePractice, setActivePractice] = useState<PracticeSession | null>(null);

  const startSession = useCallback(async (studentId: string, bookId: string) => {
    const session: ReadingSession = {
      id: randomUUID(),
      studentId,
      bookId,
      startedAt: new Date().toISOString(),
    };
    // Set state immediately (optimistic) so the reading screen has the ID right away
    setActiveSession(session);
    // Persist to SQLite in the background — don't block on it
    createReadingSession(session).catch(() => {});
    return session;
  }, []);

  const finishSession = useCallback(
    async (sessionId: string, updates: Parameters<typeof completeReadingSession>[1]) => {
      await completeReadingSession(sessionId, updates);
      setActiveSession((prev) => (prev?.id === sessionId ? { ...prev, ...updates } : prev));
    },
    []
  );

  const setPractice = useCallback((practice: PracticeSession) => {
    setActivePractice(practice);
  }, []);

  const clearSession = useCallback(() => {
    setActiveSession(null);
    setActivePractice(null);
  }, []);

  return (
    <SessionContext.Provider
      value={{ activeSession, activePractice, startSession, finishSession, setPractice, clearSession }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}
