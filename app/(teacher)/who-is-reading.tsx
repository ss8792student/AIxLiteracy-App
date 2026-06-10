import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { useStudent } from '../../src/contexts/StudentContext';
import { getStudentsByTeacher, upsertStudent } from '../../src/services/db/students';
import { getTeacherStudents, createTeacherStudent } from '../../src/services/supabase/teacherStudents';
import { Student } from '../../src/types/models';
import { randomUUID } from 'expo-crypto';

const AVATARS = ['🦁', '🐯', '🐻', '🦊', '🐧', '🦋', '🐬', '🦅'];
const AVATAR_COLORS = ['#FFE0B2', '#F8BBD0', '#C8E6C9', '#B3E5FC', '#E1BEE7', '#FFF9C4', '#B2EBF2', '#FFCDD2'];
const GRADES = [1, 2, 3, 4, 5, 6, 7, 8];

export default function WhoIsReadingScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { selectStudent } = useStudent();

  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  // Add-student form state
  const [newName, setNewName] = useState('');
  const [newGrade, setNewGrade] = useState(3);
  const [newAvatar, setNewAvatar] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [addError, setAddError] = useState('');

  const loadStudents = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    // Try Supabase first, fall back to local SQLite
    try {
      const remote = await getTeacherStudents(user.id);
      if (remote.length > 0) {
        for (const s of remote) await upsertStudent(s);
        setStudents(remote);
      } else {
        const local = await getStudentsByTeacher(user.id);
        setStudents(local);
      }
    } catch {
      const local = await getStudentsByTeacher(user.id);
      setStudents(local);
    }
    setIsLoading(false);
  }, [user]);

  useEffect(() => { loadStudents(); }, [loadStudents]);

  async function handleAddStudent() {
    if (!newName.trim() || !user) return;
    setIsSaving(true);
    setAddError('');
    try {
      // Create in Supabase, fall back to local-only
      const remote = await createTeacherStudent(user.id, {
        name: newName.trim(),
        avatarId: newAvatar,
        grade: newGrade,
      });
      const student: Student = remote ?? {
        id: randomUUID(),
        name: newName.trim(),
        avatarId: newAvatar,
        grade: newGrade,
        language: 'en',
        role: 'student',
        streak: 0,
        totalMinutes: 0,
        totalWords: 0,
        totalBooksCompleted: 0,
        createdAt: new Date().toISOString(),
        teacherId: user.id,
      };
      await upsertStudent(student);
      setStudents((prev) => [...prev, student].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName('');
      setNewGrade(3);
      setNewAvatar(0);
      setShowAdd(false);
    } catch {
      setAddError('Could not add student. Try again.');
    }
    setIsSaving(false);
  }

  async function handleSelectStudent(student: Student) {
    await selectStudent(student.id);
    router.push('/(student)/library');
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/(teacher)')} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Who's Reading Today?</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(true)}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color="#4A90D9" style={{ marginTop: 60 }} />
      ) : students.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>👥</Text>
          <Text style={styles.emptyTitle}>No students yet</Text>
          <Text style={styles.emptySub}>Add your first student to get started!</Text>
          <TouchableOpacity style={styles.emptyAddBtn} onPress={() => setShowAdd(true)}>
            <Text style={styles.emptyAddBtnText}>+ Add First Student</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={students}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <Text style={styles.listHint}>Tap a name to start reading</Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.studentCard}
              onPress={() => handleSelectStudent(item)}
            >
              <View style={[styles.avatar, { backgroundColor: AVATAR_COLORS[item.avatarId % AVATAR_COLORS.length] }]}>
                <Text style={styles.avatarEmoji}>{AVATARS[item.avatarId % AVATARS.length]}</Text>
              </View>
              <View style={styles.studentInfo}>
                <Text style={styles.studentName}>{item.name}</Text>
                <Text style={styles.studentMeta}>
                  Grade {item.grade} · {item.streak} day streak
                </Text>
              </View>
              <View style={styles.studentStats}>
                <Text style={styles.statNum}>{item.totalBooksCompleted}</Text>
                <Text style={styles.statLabel}>books</Text>
              </View>
              <Text style={styles.arrow}>▶</Text>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Add Student Modal */}
      <Modal visible={showAdd} animationType="slide" transparent>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modal}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>Add a Student</Text>

              <Text style={styles.fieldLabel}>Name</Text>
              <TextInput
                style={styles.fieldInput}
                value={newName}
                onChangeText={setNewName}
                placeholder="Student's first name"
                placeholderTextColor="#9BB5CC"
                autoFocus
                maxLength={30}
              />

              <Text style={styles.fieldLabel}>Grade</Text>
              <View style={styles.gradeRow}>
                {GRADES.map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[styles.gradeBtn, newGrade === g && styles.gradeBtnActive]}
                    onPress={() => setNewGrade(g)}
                  >
                    <Text style={[styles.gradeBtnText, newGrade === g && styles.gradeBtnTextActive]}>{g}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Avatar</Text>
              <View style={styles.avatarRow}>
                {AVATARS.map((emoji, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[styles.avatarChip, { backgroundColor: AVATAR_COLORS[i] }, newAvatar === i && styles.avatarChipActive]}
                    onPress={() => setNewAvatar(i)}
                  >
                    <Text style={styles.avatarChipEmoji}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {addError ? <Text style={styles.errorText}>{addError}</Text> : null}

              <TouchableOpacity
                style={[styles.saveBtn, (!newName.trim() || isSaving) && styles.saveBtnDisabled]}
                onPress={handleAddStudent}
                disabled={!newName.trim() || isSaving}
              >
                {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Add Student ✓</Text>}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => { setShowAdd(false); setNewName(''); setAddError(''); }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F7FF' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
  },
  backBtn: { width: 40, padding: 8 },
  backText: { fontSize: 24, color: '#4A90D9' },
  title: { flex: 1, fontSize: 22, fontWeight: '800', color: '#1A3A5C', textAlign: 'center' },
  addBtn: {
    backgroundColor: '#4A90D9', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  addBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  list: { padding: 16, gap: 12 },
  listHint: { fontSize: 14, color: '#9BB5CC', textAlign: 'center', marginBottom: 8 },
  studentCard: {
    backgroundColor: '#fff', borderRadius: 18,
    padding: 16, flexDirection: 'row', alignItems: 'center',
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.08,
    shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
  avatar: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  avatarEmoji: { fontSize: 30 },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 18, fontWeight: '800', color: '#1A3A5C' },
  studentMeta: { fontSize: 13, color: '#7B8D9E', marginTop: 2 },
  studentStats: { alignItems: 'center', marginRight: 12 },
  statNum: { fontSize: 22, fontWeight: '900', color: '#4A90D9' },
  statLabel: { fontSize: 11, color: '#9BB5CC' },
  arrow: { fontSize: 18, color: '#C5D5E5' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyEmoji: { fontSize: 72, marginBottom: 16 },
  emptyTitle: { fontSize: 24, fontWeight: '800', color: '#1A3A5C', marginBottom: 8 },
  emptySub: { fontSize: 15, color: '#7B8D9E', textAlign: 'center', marginBottom: 28 },
  emptyAddBtn: { backgroundColor: '#4A90D9', borderRadius: 16, paddingVertical: 18, paddingHorizontal: 32 },
  emptyAddBtnText: { fontSize: 17, fontWeight: '800', color: '#fff' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modal: {
    backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 28, paddingBottom: 40,
  },
  modalTitle: { fontSize: 22, fontWeight: '900', color: '#1A3A5C', marginBottom: 20, textAlign: 'center' },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#5A7A9C', marginBottom: 8, marginTop: 16 },
  fieldInput: {
    backgroundColor: '#F4F8FF', borderRadius: 12, padding: 16,
    fontSize: 17, color: '#1A3A5C', borderWidth: 1.5, borderColor: '#D6E8FF',
  },
  gradeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  gradeBtn: {
    width: 44, height: 44, borderRadius: 10,
    backgroundColor: '#F4F8FF', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#D6E8FF',
  },
  gradeBtnActive: { backgroundColor: '#4A90D9', borderColor: '#4A90D9' },
  gradeBtnText: { fontSize: 16, fontWeight: '700', color: '#1A3A5C' },
  gradeBtnTextActive: { color: '#fff' },
  avatarRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  avatarChip: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 2.5, borderColor: 'transparent' },
  avatarChipActive: { borderColor: '#4A90D9' },
  avatarChipEmoji: { fontSize: 28 },
  errorText: { color: '#E74C3C', fontSize: 13, fontWeight: '600', marginTop: 10, textAlign: 'center' },
  saveBtn: { backgroundColor: '#4A90D9', borderRadius: 14, paddingVertical: 18, alignItems: 'center', marginTop: 24 },
  saveBtnDisabled: { backgroundColor: '#A0C4E8' },
  saveBtnText: { fontSize: 17, fontWeight: '800', color: '#fff' },
  cancelBtn: { paddingVertical: 14, alignItems: 'center' },
  cancelBtnText: { fontSize: 15, color: '#7B8D9E' },
});
