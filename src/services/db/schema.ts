import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (db) return Promise.resolve(db);
  if (dbPromise) return dbPromise;
  dbPromise = SQLite.openDatabaseAsync('aixliteracy.db')
    .then(async (database) => {
      await runMigrations(database);
      db = database;
      return db;
    })
    .catch((err) => {
      dbPromise = null;
      throw err;
    });
  return dbPromise;
}

async function runMigrations(database: SQLite.SQLiteDatabase): Promise<void> {
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER NOT NULL
    );
  `);

  const row = await database.getFirstAsync<{ version: number }>(
    'SELECT version FROM schema_version ORDER BY version DESC LIMIT 1'
  );
  const currentVersion = row?.version ?? 0;

  if (currentVersion < 1) {
    await applyMigration1(database);
    await database.runAsync(
      'INSERT INTO schema_version (version) VALUES (?)',
      [1]
    );
  }

  if (currentVersion < 2) {
    await database.execAsync(
      'ALTER TABLE students ADD COLUMN last_read_date TEXT'
    );
    await database.runAsync(
      'INSERT INTO schema_version (version) VALUES (?)',
      [2]
    );
  }

  if (currentVersion < 3) {
    await database.execAsync(
      'ALTER TABLE students ADD COLUMN teacher_id TEXT'
    );
    await database.runAsync(
      'INSERT INTO schema_version (version) VALUES (?)',
      [3]
    );
  }
}

async function applyMigration1(database: SQLite.SQLiteDatabase): Promise<void> {
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      avatar_id INTEGER NOT NULL DEFAULT 1,
      grade INTEGER NOT NULL DEFAULT 1,
      language TEXT NOT NULL DEFAULT 'en',
      role TEXT NOT NULL DEFAULT 'student',
      streak INTEGER NOT NULL DEFAULT 0,
      total_minutes INTEGER NOT NULL DEFAULT 0,
      total_words INTEGER NOT NULL DEFAULT 0,
      total_books_completed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS books (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      cover_uri TEXT,
      reading_level INTEGER NOT NULL DEFAULT 1,
      language TEXT NOT NULL DEFAULT 'en',
      estimated_minutes INTEGER NOT NULL DEFAULT 10,
      pages_path TEXT,
      is_downloaded INTEGER NOT NULL DEFAULT 0,
      is_assigned INTEGER NOT NULL DEFAULT 0,
      assigned_by TEXT,
      curriculum_alignment TEXT,
      word_count INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS reading_sessions (
      id TEXT PRIMARY KEY NOT NULL,
      student_id TEXT NOT NULL,
      book_id TEXT NOT NULL,
      started_at TEXT NOT NULL,
      completed_at TEXT,
      audio_path TEXT,
      transcript TEXT,
      assessment_json TEXT,
      synced_at TEXT,
      FOREIGN KEY (student_id) REFERENCES students(id),
      FOREIGN KEY (book_id) REFERENCES books(id)
    );

    CREATE TABLE IF NOT EXISTS practice_sessions (
      id TEXT PRIMARY KEY NOT NULL,
      reading_session_id TEXT NOT NULL,
      activities_json TEXT NOT NULL,
      responses_json TEXT,
      score INTEGER NOT NULL DEFAULT 0,
      completed_at TEXT,
      synced_at TEXT,
      FOREIGN KEY (reading_session_id) REFERENCES reading_sessions(id)
    );

    CREATE TABLE IF NOT EXISTS vocabulary (
      id TEXT PRIMARY KEY NOT NULL,
      student_id TEXT NOT NULL,
      word TEXT NOT NULL,
      definition TEXT NOT NULL,
      pronunciation TEXT,
      example_sentence TEXT,
      encountered_book_id TEXT NOT NULL,
      mastery_level INTEGER NOT NULL DEFAULT 0,
      last_practiced_at TEXT,
      added_at TEXT NOT NULL,
      FOREIGN KEY (student_id) REFERENCES students(id)
    );

    CREATE TABLE IF NOT EXISTS badges (
      id TEXT PRIMARY KEY NOT NULL,
      student_id TEXT NOT NULL,
      type TEXT NOT NULL,
      unlocked_at TEXT NOT NULL,
      FOREIGN KEY (student_id) REFERENCES students(id)
    );

    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      action TEXT NOT NULL,
      created_at TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_student ON reading_sessions(student_id);
    CREATE INDEX IF NOT EXISTS idx_practice_session ON practice_sessions(reading_session_id);
    CREATE INDEX IF NOT EXISTS idx_vocab_student ON vocabulary(student_id);
    CREATE INDEX IF NOT EXISTS idx_badges_student ON badges(student_id);
    CREATE INDEX IF NOT EXISTS idx_sync_queue_attempts ON sync_queue(attempts);
  `);
}
