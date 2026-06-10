import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Student } from '../types/models';
import { getAllStudents, getStudentById } from '../services/db/students';
import { getDb } from '../services/db/schema';

interface StudentContextValue {
  currentStudent: Student | null;
  allStudents: Student[];
  isLoading: boolean;
  selectStudent: (id: string) => Promise<void>;
  refreshStudents: () => Promise<Student[]>;
}

const StudentContext = createContext<StudentContextValue | null>(null);

const CURRENT_STUDENT_KEY = 'currentStudentId';

export function StudentProvider({ children }: { children: React.ReactNode }) {
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshStudents = useCallback(async () => {
    await getDb();
    const students = await getAllStudents();
    setAllStudents(students);
    // Also sync currentStudent to the fresh DB row so progress stats update immediately
    setCurrentStudent((prev) => (prev ? (students.find((s) => s.id === prev.id) ?? prev) : prev));
    return students;
  }, []);

  useEffect(() => {
    async function init() {
      try {
        const students = await refreshStudents();
        const savedId = await AsyncStorage.getItem(CURRENT_STUDENT_KEY);
        if (savedId) {
          const saved = students.find((s) => s.id === savedId);
          if (saved) setCurrentStudent(saved);
        }
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, [refreshStudents]);

  const selectStudent = useCallback(async (id: string) => {
    const student = await getStudentById(id);
    if (student) {
      setCurrentStudent(student);
      await AsyncStorage.setItem(CURRENT_STUDENT_KEY, id);
    }
  }, []);

  return (
    <StudentContext.Provider
      value={{ currentStudent, allStudents, isLoading, selectStudent, refreshStudents }}
    >
      {children}
    </StudentContext.Provider>
  );
}

export function useStudent(): StudentContextValue {
  const ctx = useContext(StudentContext);
  if (!ctx) throw new Error('useStudent must be used within StudentProvider');
  return ctx;
}
