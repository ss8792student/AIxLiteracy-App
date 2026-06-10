import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';
import { useStudent } from '../src/contexts/StudentContext';
import { createProfile, profileToStudent } from '../src/services/supabase/profile';
import { upsertStudent } from '../src/services/db/students';

const AVATARS = ['🦁', '🐯', '🐻', '🦊', '🐧', '🦋', '🐬', '🦅'];
const AVATAR_COLORS = ['#FFE0B2', '#F8BBD0', '#C8E6C9', '#B3E5FC', '#E1BEE7', '#FFF9C4', '#B2EBF2', '#FFCDD2'];
const GRADES = [1, 2, 3, 4, 5, 6, 7, 8];

export default function OnboardingScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { selectStudent, refreshStudents } = useStudent();

  const [step, setStep] = useState<'name' | 'grade' | 'avatar'>('name');
  const [name, setName] = useState('');
  const [grade, setGrade] = useState(3);
  const [avatar, setAvatar] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleFinish() {
    if (!user) return;
    setIsSaving(true);
    setError('');
    try {
      const profile = await createProfile({
        id: user.id,
        name: name.trim(),
        avatarId: avatar,
        grade,
      });
      if (!profile) {
        setError('Something went wrong. Please try again.');
        setIsSaving(false);
        return;
      }
      const student = profileToStudent(profile);
      await upsertStudent(student);
      await refreshStudents();
      await selectStudent(student.id);
      router.replace('/(student)/library');
    } catch {
      setError('Could not save your profile. Check your connection and try again.');
    }
    setIsSaving(false);
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* Step dots */}
          <View style={styles.stepDots}>
            {(['name', 'grade', 'avatar'] as const).map((s) => (
              <View
                key={s}
                style={[styles.dot, step === s && styles.dotActive]}
              />
            ))}
          </View>

          {step === 'name' && (
            <View style={styles.stepContent}>
              <Text style={styles.emoji}>👋</Text>
              <Text style={styles.heading}>What's your name?</Text>
              <Text style={styles.subheading}>This is how you'll appear in the app.</Text>
              <TextInput
                style={styles.nameInput}
                value={name}
                onChangeText={setName}
                placeholder="Your first name"
                placeholderTextColor="#9BB5CC"
                autoFocus
                maxLength={30}
                returnKeyType="next"
                onSubmitEditing={() => name.trim() && setStep('grade')}
              />
              <TouchableOpacity
                style={[styles.nextBtn, !name.trim() && styles.nextBtnDisabled]}
                onPress={() => name.trim() && setStep('grade')}
                disabled={!name.trim()}
              >
                <Text style={styles.nextBtnText}>Next →</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === 'grade' && (
            <View style={styles.stepContent}>
              <Text style={styles.emoji}>🎒</Text>
              <Text style={styles.heading}>What grade are you in?</Text>
              <Text style={styles.subheading}>We'll match books to your level.</Text>
              <View style={styles.gradeGrid}>
                {GRADES.map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[styles.gradeBtn, grade === g && styles.gradeBtnActive]}
                    onPress={() => setGrade(g)}
                  >
                    <Text style={[styles.gradeBtnText, grade === g && styles.gradeBtnTextActive]}>
                      {g}
                    </Text>
                    <Text style={[styles.gradeLabel, grade === g && styles.gradeLabelActive]}>
                      {g === 1 ? '1st' : g === 2 ? '2nd' : g === 3 ? '3rd' : `${g}th`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={styles.nextBtn} onPress={() => setStep('avatar')}>
                <Text style={styles.nextBtnText}>Next →</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.backBtn} onPress={() => setStep('name')}>
                <Text style={styles.backBtnText}>← Back</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === 'avatar' && (
            <View style={styles.stepContent}>
              <Text style={styles.emoji}>🎨</Text>
              <Text style={styles.heading}>Pick your avatar!</Text>
              <Text style={styles.subheading}>Choose your reading buddy.</Text>
              <View style={styles.avatarGrid}>
                {AVATARS.map((emoji, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[
                      styles.avatarBtn,
                      { backgroundColor: AVATAR_COLORS[i] },
                      avatar === i && styles.avatarBtnActive,
                    ]}
                    onPress={() => setAvatar(i)}
                  >
                    <Text style={styles.avatarEmoji}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Preview */}
              <View style={[styles.previewCard, { backgroundColor: AVATAR_COLORS[avatar] }]}>
                <Text style={styles.previewEmoji}>{AVATARS[avatar]}</Text>
                <View>
                  <Text style={styles.previewName}>{name}</Text>
                  <Text style={styles.previewGrade}>
                    Grade {grade} · Reading Level {grade}
                  </Text>
                </View>
              </View>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <TouchableOpacity
                style={[styles.finishBtn, isSaving && styles.finishBtnDisabled]}
                onPress={handleFinish}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.finishBtnText}>Start Reading! 📚</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.backBtn} onPress={() => setStep('grade')}>
                <Text style={styles.backBtnText}>← Back</Text>
              </TouchableOpacity>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F7FF' },
  scroll: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  stepDots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 32 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#D6E8FF' },
  dotActive: { backgroundColor: '#4A90D9', width: 28 },
  stepContent: { alignItems: 'center' },
  emoji: { fontSize: 64, marginBottom: 12 },
  heading: { fontSize: 28, fontWeight: '900', color: '#1A3A5C', textAlign: 'center', marginBottom: 8 },
  subheading: { fontSize: 16, color: '#5A7A9C', textAlign: 'center', marginBottom: 28 },
  nameInput: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    fontSize: 22,
    fontWeight: '700',
    color: '#1A3A5C',
    borderWidth: 2,
    borderColor: '#D6E8FF',
    textAlign: 'center',
    marginBottom: 20,
  },
  gradeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    marginBottom: 24,
  },
  gradeBtn: {
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#D6E8FF',
  },
  gradeBtnActive: { backgroundColor: '#4A90D9', borderColor: '#4A90D9' },
  gradeBtnText: { fontSize: 22, fontWeight: '900', color: '#1A3A5C' },
  gradeBtnTextActive: { color: '#fff' },
  gradeLabel: { fontSize: 10, color: '#7B8D9E', fontWeight: '600' },
  gradeLabelActive: { color: '#E8F4FD' },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    marginBottom: 24,
  },
  avatarBtn: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  avatarBtnActive: { borderColor: '#4A90D9', transform: [{ scale: 1.1 }] },
  avatarEmoji: { fontSize: 36 },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    width: '100%',
  },
  previewEmoji: { fontSize: 48 },
  previewName: { fontSize: 20, fontWeight: '800', color: '#1A3A5C' },
  previewGrade: { fontSize: 14, color: '#5A7A9C', marginTop: 2 },
  errorText: { color: '#E74C3C', fontSize: 14, fontWeight: '600', marginBottom: 12, textAlign: 'center' },
  nextBtn: {
    backgroundColor: '#4A90D9',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 48,
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
  },
  nextBtnDisabled: { backgroundColor: '#A0C4E8' },
  nextBtnText: { fontSize: 18, fontWeight: '800', color: '#fff' },
  finishBtn: {
    backgroundColor: '#2ECC71',
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
  },
  finishBtnDisabled: { backgroundColor: '#A8DFC0' },
  finishBtnText: { fontSize: 20, fontWeight: '900', color: '#fff' },
  backBtn: { paddingVertical: 12 },
  backBtnText: { fontSize: 15, color: '#7B8D9E' },
});
