import React, { createContext, useContext, useCallback, useMemo } from 'react';
import { useStore } from '../store';
import {
  anonymizeStudent,
  anonymizeTeacher,
  anonymizeStudentId,
  anonymizeFlId,
  type AnonymizedStudentIdentity,
  type AnonymizedTeacherIdentity
} from '../services/anonymizerService';

interface AnonymizerContextValue {
  // State
  isAnonymized: boolean;
  seed: string;

  // Actions
  setAnonymized: (enabled: boolean) => void;
  regenerateSeed: () => void;

  // Anonymization functions
  getAnonymizedStudent: (studentId: string) => AnonymizedStudentIdentity;
  getAnonymizedTeacher: (teacherName: string) => AnonymizedTeacherIdentity;
  getAnonymizedStudentId: (realId: string) => string;
  getAnonymizedFlId: (realId: string) => string;

  // Convenience functions for display
  formatStudentName: (
    firstName: string,
    lastName: string,
    studentId: string,
    format?: 'first-last' | 'last-first' | 'last-only' | 'first-only'
  ) => string;
  formatTeacherName: (teacherName: string) => string;
  formatStudentId: (realId: string) => string;
}

const AnonymizerContext = createContext<AnonymizerContextValue | null>(null);

interface AnonymizerProviderProps {
  children: React.ReactNode;
}

export function AnonymizerProvider({ children }: AnonymizerProviderProps) {
  const {
    anonymizerEnabled,
    anonymizerSeed,
    setAnonymizerEnabled,
    regenerateAnonymizerSeed
  } = useStore();

  // Memoized anonymization functions
  const getAnonymizedStudent = useCallback(
    (studentId: string): AnonymizedStudentIdentity => {
      return anonymizeStudent(studentId, anonymizerSeed);
    },
    [anonymizerSeed]
  );

  const getAnonymizedTeacher = useCallback(
    (teacherName: string): AnonymizedTeacherIdentity => {
      return anonymizeTeacher(teacherName, anonymizerSeed);
    },
    [anonymizerSeed]
  );

  const getAnonymizedStudentId = useCallback(
    (realId: string): string => {
      return anonymizeStudentId(realId, anonymizerSeed);
    },
    [anonymizerSeed]
  );

  const getAnonymizedFlId = useCallback(
    (realId: string): string => {
      return anonymizeFlId(realId, anonymizerSeed);
    },
    [anonymizerSeed]
  );

  // Convenience formatting functions that respect anonymizer state
  const formatStudentName = useCallback(
    (
      firstName: string,
      lastName: string,
      studentId: string,
      format: 'first-last' | 'last-first' | 'last-only' | 'first-only' = 'first-last'
    ): string => {
      let displayFirst = firstName;
      let displayLast = lastName;

      if (anonymizerEnabled) {
        const anonymized = anonymizeStudent(studentId, anonymizerSeed);
        displayFirst = anonymized.firstName;
        displayLast = anonymized.lastName;
      }

      switch (format) {
        case 'first-last':
          return `${displayFirst} ${displayLast}`;
        case 'last-first':
          return `${displayLast}, ${displayFirst}`;
        case 'last-only':
          return displayLast;
        case 'first-only':
          return displayFirst;
        default:
          return `${displayFirst} ${displayLast}`;
      }
    },
    [anonymizerEnabled, anonymizerSeed]
  );

  const formatTeacherName = useCallback(
    (teacherName: string): string => {
      if (!anonymizerEnabled || !teacherName) {
        return teacherName;
      }
      return anonymizeTeacher(teacherName, anonymizerSeed).name;
    },
    [anonymizerEnabled, anonymizerSeed]
  );

  const formatStudentId = useCallback(
    (realId: string): string => {
      if (!anonymizerEnabled || !realId) {
        return realId;
      }
      return anonymizeStudentId(realId, anonymizerSeed);
    },
    [anonymizerEnabled, anonymizerSeed]
  );

  const value = useMemo<AnonymizerContextValue>(
    () => ({
      isAnonymized: anonymizerEnabled,
      seed: anonymizerSeed,
      setAnonymized: setAnonymizerEnabled,
      regenerateSeed: regenerateAnonymizerSeed,
      getAnonymizedStudent,
      getAnonymizedTeacher,
      getAnonymizedStudentId,
      getAnonymizedFlId,
      formatStudentName,
      formatTeacherName,
      formatStudentId
    }),
    [
      anonymizerEnabled,
      anonymizerSeed,
      setAnonymizerEnabled,
      regenerateAnonymizerSeed,
      getAnonymizedStudent,
      getAnonymizedTeacher,
      getAnonymizedStudentId,
      getAnonymizedFlId,
      formatStudentName,
      formatTeacherName,
      formatStudentId
    ]
  );

  return (
    <AnonymizerContext.Provider value={value}>
      {children}
    </AnonymizerContext.Provider>
  );
}

/**
 * Hook to access anonymizer context
 * Must be used within AnonymizerProvider
 */
export function useAnonymizer(): AnonymizerContextValue {
  const context = useContext(AnonymizerContext);
  if (!context) {
    throw new Error('useAnonymizer must be used within an AnonymizerProvider');
  }
  return context;
}

/**
 * Hook for components that may be rendered outside the provider
 * Returns null if not within provider instead of throwing
 */
export function useAnonymizerSafe(): AnonymizerContextValue | null {
  return useContext(AnonymizerContext);
}

/**
 * Direct access to anonymizer state from store (for non-React code)
 * Use this in services that need to check anonymizer state
 */
export function getAnonymizerState(): { enabled: boolean; seed: string } {
  const state = useStore.getState();
  return {
    enabled: state.anonymizerEnabled,
    seed: state.anonymizerSeed
  };
}
