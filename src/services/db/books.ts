import { getDb } from './schema';
import { Book } from '../../types/models';

function rowToBook(row: Record<string, unknown>): Book {
  return {
    id: row.id as string,
    title: row.title as string,
    author: row.author as string,
    coverUri: row.cover_uri as string | undefined,
    readingLevel: row.reading_level as number,
    language: row.language as Book['language'],
    estimatedMinutes: row.estimated_minutes as number,
    pagesPath: row.pages_path as string | undefined,
    isDownloaded: Boolean(row.is_downloaded),
    isAssigned: Boolean(row.is_assigned),
    assignedBy: row.assigned_by as string | undefined,
    curriculumAlignment: row.curriculum_alignment as string | undefined,
    wordCount: row.word_count as number,
  };
}

export async function getAllBooks(): Promise<Book[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM books ORDER BY title ASC'
  );
  return rows.map(rowToBook);
}

export async function getBookById(id: string): Promise<Book | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM books WHERE id = ?',
    [id]
  );
  return row ? rowToBook(row) : null;
}

export async function getAssignedBooks(): Promise<Book[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM books WHERE is_assigned = 1 ORDER BY title ASC'
  );
  return rows.map(rowToBook);
}

export async function upsertBook(book: Book): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO books (id, title, author, cover_uri, reading_level, language,
       estimated_minutes, pages_path, is_downloaded, is_assigned, assigned_by,
       curriculum_alignment, word_count)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       title = excluded.title,
       author = excluded.author,
       cover_uri = excluded.cover_uri,
       reading_level = excluded.reading_level,
       is_downloaded = excluded.is_downloaded,
       is_assigned = excluded.is_assigned,
       assigned_by = excluded.assigned_by,
       pages_path = excluded.pages_path`,
    [
      book.id,
      book.title,
      book.author,
      book.coverUri ?? null,
      book.readingLevel,
      book.language,
      book.estimatedMinutes,
      book.pagesPath ?? null,
      book.isDownloaded ? 1 : 0,
      book.isAssigned ? 1 : 0,
      book.assignedBy ?? null,
      book.curriculumAlignment ?? null,
      book.wordCount,
    ]
  );
}

export async function markBookDownloaded(id: string, pagesPath: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE books SET is_downloaded = 1, pages_path = ? WHERE id = ?',
    [pagesPath, id]
  );
}
