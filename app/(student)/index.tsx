import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useStudent } from '../../src/contexts/StudentContext';
import { createStudent } from '../../src/services/db/students';
import { Student } from '../../src/types/models';
import { randomUUID } from 'expo-crypto';

const AVATARS = ['🦁', '🐯', '🐻', '🦊', '🐧', '🦋', '🐬', '🦅'];
const AVATAR_COLORS = ['#FFE0B2', '#F8BBD0', '#C8E6C9', '#B3E5FC', '#E1BEE7', '#FFF9C4', '#B2EBF2', '#FFCDD2'];

export default function WelcomeScreen() {
  const router = useRouter();
  const { allStudents, selectStudent, refreshStudents, isLoading } = useStudent();
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [newName, setNewName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(0);
  const [selectedGrade, setSelectedGrade] = useState(3);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSelectStudent(student: Student) {
    await selectStudent(student.id);
    if (student.role === 'teacher') {
      router.replace('/(teacher)');
    } else {
      router.replace('/(student)/library');
    }
  }

  async function handleCreateStudent() {
    if (!newName.trim()) return;
    setIsSaving(true);
    try {
      const student: Student = {
        id: randomUUID(),
        name: newName.trim(),
        avatarId: selectedAvatar,
        grade: selectedGrade,
        language: 'en',
        role: 'student',
        streak: 0,
        totalMinutes: 0,
        totalWords: 0,
        totalBooksCompleted: 0,
        createdAt: new Date().toISOString(),
      };
      await createStudent(student);
      await refreshStudents();
      setNewName('');
      setShowAddStudent(false);
      await handleSelectStudent(student);
    } catch (e) {
      Alert.alert('Error', 'Could not create student. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4A90D9" />
      </View>
    );
  }

  if (showAddStudent) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>Who are you?</Text>
        <Text style={styles.subtitle}>Tell us your name so we can save your progress</Text>

        <TextInput
          style={styles.nameInput}
          placeholder="Your name"
          value={newName}
          onChangeText={setNewName}
          autoFocus
          maxLength={30}
        />

        <Text style={styles.sectionLabel}>Pick your avatar</Text>
        <View style={styles.avatarRow}>
          {AVATARS.map((emoji, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.avatarBtn, { backgroundColor: AVATAR_COLORS[i] }, selectedAvatar === i && styles.avatarSelected]}
              onPress={() => setSelectedAvatar(i)}
            >
              <Text style={styles.avatarEmoji}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionLabel}>What grade are you in?</Text>
        <View style={styles.gradeRow}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((g) => (
            <TouchableOpacity
              key={g}
              style={[styles.gradeBtn, selectedGrade === g && styles.gradeBtnSelected]}
              onPress={() => setSelectedGrade(g)}
            >
              <Text style={[styles.gradeBtnText, selectedGrade === g && styles.gradeBtnTextSelected]}>
                {g}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.startBtn, (!newName.trim() || isSaving) && styles.startBtnDisabled]}
          onPress={handleCreateStudent}
          disabled={!newName.trim() || isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.startBtnText}>Start Reading! 📖</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.backBtn} onPress={() => setShowAddStudent(false)}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>AIxLiteracy</Text>
      <Text style={styles.subtitle}>
        {allStudents.length === 0 ? 'Welcome! Let\'s get started.' : 'Who is reading today?'}
      </Text>

      {allStudents.length > 0 && (
        <FlatList
          data={allStudents}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.profileGrid}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.profileCard, { backgroundColor: AVATAR_COLORS[item.avatarId] ?? '#E3F2FD' }]}
              onPress={() => handleSelectStudent(item)}
            >
              <Text style={styles.profileEmoji}>{AVATARS[item.avatarId] ?? '📖'}</Text>
              <Text style={styles.profileName}>{item.name}</Text>
              {item.streak > 0 && (
                <Text style={styles.profileStreak}>🔥 {item.streak} day streak</Text>
              )}
            </TouchableOpacity>
          )}
        />
      )}

      <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddStudent(true)}>
        <Text style={styles.addBtnText}>+ Add Reader</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F7FF', padding: 24 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0F7FF' },
  title: { fontSize: 36, fontWeight: '800', color: '#1A3A5C', textAlign: 'center', marginTop: 32, marginBottom: 8 },
  subtitle: { fontSize: 18, color: '#5A7A9C', textAlign: 'center', marginBottom: 32 },
  profileGrid: { paddingBottom: 16 },
  profileCard: {
    flex: 1,
    margin: 8,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  profileEmoji: { fontSize: 48, marginBottom: 8 },
  profileName: { fontSize: 18, fontWeight: '700', color: '#1A3A5C', textAlign: 'center' },
  profileStreak: { fontSize: 13, color: '#FF6B35', marginTop: 4 },
  addBtn: {
    backgroundColor: '#4A90D9',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginTop: 8,
  },
  addBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  nameInput: {
    borderWidth: 2,
    borderColor: '#4A90D9',
    borderRadius: 14,
    padding: 16,
    fontSize: 20,
    backgroundColor: '#fff',
    marginBottom: 24,
  },
  sectionLabel: { fontSize: 16, fontWeight: '600', color: '#1A3A5C', marginBottom: 12 },
  avatarRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 24, gap: 8 },
  avatarBtn: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  avatarSelected: { borderWidth: 3, borderColor: '#4A90D9' },
  avatarEmoji: { fontSize: 30 },
  gradeRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 32, gap: 8 },
  gradeBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradeBtnSelected: { backgroundColor: '#4A90D9' },
  gradeBtnText: { fontSize: 18, fontWeight: '700', color: '#1A3A5C' },
  gradeBtnTextSelected: { color: '#fff' },
  startBtn: {
    backgroundColor: '#2ECC71',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
  },
  startBtnDisabled: { backgroundColor: '#B0BEC5' },
  startBtnText: { color: '#fff', fontSize: 20, fontWeight: '800' },
  backBtn: { alignItems: 'center', padding: 12 },
  backBtnText: { color: '#4A90D9', fontSize: 16 },
});
