import { getDb } from './schema';
import { VocabularyEntry, Badge, BadgeType } from '../../types/models';

function rowToVocab(row: Record<string, unknown>): VocabularyEntry {
  return {
    id: row.id as string,
    studentId: row.student_id as string,
    word: row.word as string,
    definition: row.definition as string,
    pronunciation: row.pronunciation as string | undefined,
    exampleSentence: row.example_sentence as string | undefined,
    encounteredBookId: row.encountered_book_id as string,
    masteryLevel: row.mastery_level as number,
    lastPracticedAt: row.last_practiced_at as string | undefined,
    addedAt: row.added_at as string,
  };
}

export async function getVocabularyForStudent(studentId: string): Promise<VocabularyEntry[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM vocabulary WHERE student_id = ? ORDER BY added_at DESC',
    [studentId]
  );
  return rows.map(rowToVocab);
}

export async function upsertVocabularyEntry(entry: VocabularyEntry): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO vocabulary (id, student_id, word, definition, pronunciation,
       example_sentence, encountered_book_id, mastery_level, added_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       mastery_level = excluded.mastery_level,
       last_practiced_at = excluded.last_practiced_at`,
    [
      entry.id,
      entry.studentId,
      entry.word,
      entry.definition,
      entry.pronunciation ?? null,
      entry.exampleSentence ?? null,
      entry.encounteredBookId,
      entry.masteryLevel,
      entry.addedAt,
    ]
  );
}

export async function getVocabularyCount(studentId: string): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM vocabulary WHERE student_id = ?',
    [studentId]
  );
  return row?.count ?? 0;
}

export async function getBadgesForStudent(studentId: string): Promise<Badge[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM badges WHERE student_id = ? ORDER BY unlocked_at DESC',
    [studentId]
  );
  return rows.map((row) => ({
    id: row.id as string,
    studentId: row.student_id as string,
    type: row.type as BadgeType,
    unlockedAt: row.unlocked_at as string,
  }));
}

export async function awardBadge(badge: Badge): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT OR IGNORE INTO badges (id, student_id, type, unlocked_at) VALUES (?, ?, ?, ?)',
    [badge.id, badge.studentId, badge.type, badge.unlockedAt]
  );
}
