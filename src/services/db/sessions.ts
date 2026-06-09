import { getDb } from './schema';
import { ReadingSession, PracticeSession, ReadingAssessment } from '../../types/models';

function rowToSession(row: Record<string, unknown>): ReadingSession {
  return {
    id: row.id as string,
    studentId: row.student_id as string,
    bookId: row.book_id as string,
    startedAt: row.started_at as string,
    completedAt: row.completed_at as string | undefined,
    audioPath: row.audio_path as string | undefined,
    transcript: row.transcript as string | undefined,
    assessment: row.assessment_json
      ? (JSON.parse(row.assessment_json as string) as ReadingAssessment)
      : undefined,
    syncedAt: row.synced_at as string | undefined,
  };
}

export async function createReadingSession(session: ReadingSession): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO reading_sessions (id, student_id, book_id, started_at)
     VALUES (?, ?, ?, ?)`,
    [session.id, session.studentId, session.bookId, session.startedAt]
  );
}

export async function completeReadingSession(
  id: string,
  updates: {
    completedAt: string;
    audioPath?: string;
    transcript?: string;
    assessment?: ReadingAssessment;
  }
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE reading_sessions
     SET completed_at = ?, audio_path = ?, transcript = ?, assessment_json = ?
     WHERE id = ?`,
    [
      updates.completedAt,
      updates.audioPath ?? null,
      updates.transcript ?? null,
      updates.assessment ? JSON.stringify(updates.assessment) : null,
      id,
    ]
  );
}

export async function getSessionsByStudent(
  studentId: string,
  limit = 20
): Promise<ReadingSession[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM reading_sessions
     WHERE student_id = ? AND completed_at IS NOT NULL
     ORDER BY completed_at DESC LIMIT ?`,
    [studentId, limit]
  );
  return rows.map(rowToSession);
}

export async function getSessionById(id: string): Promise<ReadingSession | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM reading_sessions WHERE id = ?',
    [id]
  );
  return row ? rowToSession(row) : null;
}

export async function createPracticeSession(session: PracticeSession): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO practice_sessions (id, reading_session_id, activities_json, responses_json, score, completed_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      session.id,
      session.readingSessionId,
      JSON.stringify(session.activities),
      session.responses ? JSON.stringify(session.responses) : null,
      session.score,
      session.completedAt ?? null,
    ]
  );
}

export async function getPracticeForSession(
  readingSessionId: string
): Promise<PracticeSession | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM practice_sessions WHERE reading_session_id = ?',
    [readingSessionId]
  );
  if (!row) return null;
  return {
    id: row.id as string,
    readingSessionId: row.reading_session_id as string,
    activities: JSON.parse(row.activities_json as string),
    responses: row.responses_json ? JSON.parse(row.responses_json as string) : {},
    score: row.score as number,
    completedAt: row.completed_at as string | undefined,
    syncedAt: row.synced_at as string | undefined,
  };
}
