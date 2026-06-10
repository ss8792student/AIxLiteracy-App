import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useStudent } from '../../src/contexts/StudentContext';
import { useSession } from '../../src/contexts/SessionContext';
import { getAllBooks, upsertBook } from '../../src/services/db/books';
import { getSessionsByStudent } from '../../src/services/db/sessions';
import { getLevelColor, getLevelLabel } from '../../src/constants/readingLevels';
import { Book } from '../../src/types/models';
import { SAMPLE_BOOKS } from '../../src/constants/sampleBooks';

export default function LibraryScreen() {
  const router = useRouter();
  const { currentStudent } = useStudent();
  const { startSession } = useSession();
  const [books, setBooks] = useState<Book[]>([]);
  const [completedBookIds, setCompletedBookIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'assigned' | 'recommended' | 'completed'>('all');

  useEffect(() => {
    loadBooks();
  }, []);

  async function loadBooks() {
    setIsLoading(true);
    try {
      let existing = await getAllBooks();
      if (existing.length === 0) {
        for (const book of SAMPLE_BOOKS) {
          await upsertBook(book);
        }
        existing = await getAllBooks();
      }
      setBooks(existing);

      if (currentStudent) {
        const sessions = await getSessionsByStudent(currentStudent.id, 100);
        setCompletedBookIds(new Set(sessions.map((s) => s.bookId)));
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleOpenBook(book: Book) {
    if (!currentStudent) return;
    const session = await startSession(currentStudent.id, book.id);
    router.push(`/(student)/reading/${book.id}`);
  }

  const filteredBooks = books.filter((b) => {
    if (filter === 'assigned') return b.isAssigned;
    if (filter === 'recommended') {
      return !currentStudent || Math.abs(b.readingLevel - currentStudent.grade) <= 1;
    }
    if (filter === 'completed') return completedBookIds.has(b.id);
    return true;
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/(student)')} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>My Library</Text>
        <TouchableOpacity onPress={() => router.push('/(student)/progress')} style={styles.progressBtn}>
          <Text style={styles.progressText}>📊</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterRow}>
        {(['all', 'assigned', 'recommended', 'completed'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'all' ? 'All' : f === 'assigned' ? 'Assigned' : f === 'recommended' ? 'For Me' : '✓ Done'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4A90D9" />
        </View>
      ) : filteredBooks.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>
            {filter === 'completed' ? 'No books read yet' : 'No books here yet'}
          </Text>
          <Text style={styles.emptySubText}>
            {filter === 'completed'
              ? 'Finish a book and it will appear here!'
              : 'Your teacher will assign books soon!'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredBooks}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.bookCard} onPress={() => handleOpenBook(item)}>
              <View style={[styles.coverPlaceholder, { backgroundColor: getLevelColor(item.readingLevel) }]}>
                <Text style={styles.coverEmoji}>📖</Text>
              </View>
              <View style={styles.bookInfo}>
                <Text style={styles.bookTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.bookAuthor}>{item.author}</Text>
                <View style={styles.bookMeta}>
                  <View style={[styles.levelBadge, { backgroundColor: getLevelColor(item.readingLevel) }]}>
                    <Text style={styles.levelText}>{getLevelLabel(item.readingLevel)}</Text>
                  </View>
                  <Text style={styles.timeText}>~{item.estimatedMinutes} min</Text>
                  {completedBookIds.has(item.id) && (
                    <View style={styles.completedBadge}>
                      <Text style={styles.completedBadgeText}>✓ Read</Text>
                    </View>
                  )}
                </View>
                {item.isAssigned && (
                  <Text style={styles.assignedTag}>📌 Assigned</Text>
                )}
              </View>
              <Text style={styles.arrow}>▶</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F7FF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  backBtn: { padding: 8 },
  backText: { fontSize: 24, color: '#4A90D9' },
  title: { flex: 1, fontSize: 26, fontWeight: '800', color: '#1A3A5C', textAlign: 'center' },
  progressBtn: { padding: 8 },
  progressText: { fontSize: 24 },
  filterRow: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 12, gap: 8 },
  filterBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
  },
  filterBtnActive: { backgroundColor: '#4A90D9' },
  filterText: { fontSize: 12, fontWeight: '600', color: '#5A7A9C' },
  filterTextActive: { color: '#fff' },
  completedBadge: {
    backgroundColor: '#2ECC71',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  completedBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  list: { padding: 16, gap: 12 },
  bookCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  coverPlaceholder: {
    width: 64,
    height: 80,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  coverEmoji: { fontSize: 32 },
  bookInfo: { flex: 1 },
  bookTitle: { fontSize: 16, fontWeight: '700', color: '#1A3A5C', marginBottom: 4 },
  bookAuthor: { fontSize: 13, color: '#5A7A9C', marginBottom: 8 },
  bookMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  levelBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  levelText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  timeText: { fontSize: 12, color: '#7B8D9E' },
  assignedTag: { fontSize: 12, color: '#FF6B35', marginTop: 4 },
  arrow: { fontSize: 18, color: '#C5D5E5', marginLeft: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 20, fontWeight: '700', color: '#1A3A5C' },
  emptySubText: { fontSize: 15, color: '#5A7A9C', marginTop: 8 },
});
