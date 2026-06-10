import { supabase } from './client';
import { Student } from '../../types/models';

interface TeacherStudentRow {
  id: string;
  teacher_id: string;
  name: string;
  avatar_id: number;
  grade: number;
  language: string;
  streak: number;
  last_read_date: string | null;
  total_minutes: number;
  total_words: number;
  total_books_completed: number;
  created_at: string;
}

function rowToStudent(row: TeacherStudentRow): Student {
  return {
    id: row.id,
    name: row.name,
    avatarId: row.avatar_id,
    grade: row.grade,
    language: row.language as Student['language'],
    role: 'student',
    streak: row.streak,
    lastReadDate: row.last_read_date ?? undefined,
    totalMinutes: row.total_minutes,
    totalWords: row.total_words,
    totalBooksCompleted: row.total_books_completed,
    createdAt: row.created_at,
    teacherId: row.teacher_id,
  };
}

export async function getTeacherStudents(teacherId: string): Promise<Student[]> {
  const { data, error } = await supabase
    .from('teacher_students')
    .select('*')
    .eq('teacher_id', teacherId)
    .order('name', { ascending: true });
  if (error || !data) return [];
  return (data as TeacherStudentRow[]).map(rowToStudent);
}

export async function createTeacherStudent(
  teacherId: string,
  info: { name: string; avatarId: number; grade: number }
): Promise<Student | null> {
  const { data, error } = await supabase
    .from('teacher_students')
    .insert({
      teacher_id: teacherId,
      name: info.name,
      avatar_id: info.avatarId,
      grade: info.grade,
    })
    .select()
    .single();
  if (error || !data) return null;
  return rowToStudent(data as TeacherStudentRow);
}

export async function updateTeacherStudentProgress(
  id: string,
  updates: {
    streak?: number;
    lastReadDate?: string;
    totalMinutes?: number;
    totalWords?: number;
    totalBooksCompleted?: number;
  }
): Promise<void> {
  const row: Record<string, unknown> = {};
  if (updates.streak !== undefined) row.streak = updates.streak;
  if (updates.lastReadDate !== undefined) row.last_read_date = updates.lastReadDate;
  if (updates.totalMinutes !== undefined) row.total_minutes = updates.totalMinutes;
  if (updates.totalWords !== undefined) row.total_words = updates.totalWords;
  if (updates.totalBooksCompleted !== undefined) row.total_books_completed = updates.totalBooksCompleted;
  if (Object.keys(row).length === 0) return;
  await supabase.from('teacher_students').update(row).eq('id', id);
}
