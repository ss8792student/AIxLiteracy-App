import { getDb } from './schema';
import { Student } from '../../types/models';

function rowToStudent(row: Record<string, unknown>): Student {
  return {
    id: row.id as string,
    name: row.name as string,
    avatarId: row.avatar_id as number,
    grade: row.grade as number,
    language: row.language as Student['language'],
    role: row.role as Student['role'],
    streak: row.streak as number,
    lastReadDate: row.last_read_date as string | undefined,
    totalMinutes: row.total_minutes as number,
    totalWords: row.total_words as number,
    totalBooksCompleted: row.total_books_completed as number,
    createdAt: row.created_at as string,
  };
}

export async function getAllStudents(): Promise<Student[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM students ORDER BY name ASC'
  );
  return rows.map(rowToStudent);
}

export async function getStudentById(id: string): Promise<Student | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM students WHERE id = ?',
    [id]
  );
  return row ? rowToStudent(row) : null;
}

export async function createStudent(student: Student): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO students (id, name, avatar_id, grade, language, role, streak,
      total_minutes, total_words, total_books_completed, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      student.id,
      student.name,
      student.avatarId,
      student.grade,
      student.language,
      student.role,
      student.streak,
      student.totalMinutes,
      student.totalWords,
      student.totalBooksCompleted,
      student.createdAt,
    ]
  );
}

export async function upsertStudent(student: Student): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO students (id, name, avatar_id, grade, language, role, streak,
      last_read_date, total_minutes, total_words, total_books_completed, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       avatar_id = excluded.avatar_id,
       grade = excluded.grade,
       language = excluded.language,
       role = excluded.role,
       streak = excluded.streak,
       last_read_date = excluded.last_read_date,
       total_minutes = excluded.total_minutes,
       total_words = excluded.total_words,
       total_books_completed = excluded.total_books_completed`,
    [
      student.id,
      student.name,
      student.avatarId,
      student.grade,
      student.language,
      student.role,
      student.streak,
      student.lastReadDate ?? null,
      student.totalMinutes,
      student.totalWords,
      student.totalBooksCompleted,
      student.createdAt,
    ]
  );
}

export async function updateStudentProgress(
  id: string,
  updates: Partial<Pick<Student, 'streak' | 'lastReadDate' | 'totalMinutes' | 'totalWords' | 'totalBooksCompleted'>>
): Promise<void> {
  const db = await getDb();
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (updates.streak !== undefined) {
    fields.push('streak = ?');
    values.push(updates.streak);
  }
  if (updates.lastReadDate !== undefined) {
    fields.push('last_read_date = ?');
    values.push(updates.lastReadDate);
  }
  if (updates.totalMinutes !== undefined) {
    fields.push('total_minutes = ?');
    values.push(updates.totalMinutes);
  }
  if (updates.totalWords !== undefined) {
    fields.push('total_words = ?');
    values.push(updates.totalWords);
  }
  if (updates.totalBooksCompleted !== undefined) {
    fields.push('total_books_completed = ?');
    values.push(updates.totalBooksCompleted);
  }

  if (fields.length === 0) return;
  values.push(id);

  await db.runAsync(
    `UPDATE students SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
}
