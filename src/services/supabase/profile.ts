import { supabase } from './client';
import { Student } from '../../types/models';

export interface SupabaseProfile {
  id: string;
  name: string;
  avatar_id: number;
  grade: number;
  language: string;
  role: string;
  streak: number;
  last_read_date: string | null;
  total_minutes: number;
  total_words: number;
  total_books_completed: number;
  created_at: string;
}

export function profileToStudent(p: SupabaseProfile): Student {
  return {
    id: p.id,
    name: p.name,
    avatarId: p.avatar_id,
    grade: p.grade,
    language: p.language as Student['language'],
    role: p.role as Student['role'],
    streak: p.streak,
    lastReadDate: p.last_read_date ?? undefined,
    totalMinutes: p.total_minutes,
    totalWords: p.total_words,
    totalBooksCompleted: p.total_books_completed,
    createdAt: p.created_at,
  };
}

export async function getProfile(userId: string): Promise<SupabaseProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) return null;
  return data as SupabaseProfile;
}

export async function createProfile(profile: {
  id: string;
  name: string;
  avatarId: number;
  grade: number;
}): Promise<SupabaseProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: profile.id,
      name: profile.name,
      avatar_id: profile.avatarId,
      grade: profile.grade,
      language: 'en',
      role: 'student',
      streak: 0,
      total_minutes: 0,
      total_words: 0,
      total_books_completed: 0,
    })
    .select()
    .single();
  if (error) return null;
  return data as SupabaseProfile;
}

export async function updateProfile(
  userId: string,
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
  await supabase.from('profiles').update(row).eq('id', userId);
}
