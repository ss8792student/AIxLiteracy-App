import { Paths, Directory, File } from 'expo-file-system';
import { BookPage } from '../../types/models';

function getBooksDir(): Directory {
  return new Directory(Paths.document, 'books');
}

function getBookDir(bookId: string): Directory {
  return new Directory(getBooksDir(), bookId);
}

export function getBookPagesPath(bookId: string): string {
  return new File(getBookDir(bookId), 'pages.json').uri;
}

export async function saveBookPages(bookId: string, pages: BookPage[]): Promise<string> {
  const bookDir = getBookDir(bookId);
  if (!bookDir.exists) bookDir.create();

  const file = new File(bookDir, 'pages.json');
  await file.write(JSON.stringify(pages));
  return file.uri;
}

export async function loadBookPages(pagesPath: string): Promise<BookPage[]> {
  const file = new File(pagesPath);
  if (!file.exists) return [];
  const content = await file.text();
  return JSON.parse(content) as BookPage[];
}

export async function isBookDownloaded(bookId: string): Promise<boolean> {
  return new File(getBookDir(bookId), 'pages.json').exists;
}
