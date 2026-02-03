/**
 * AnonymizerService - Deterministic fictional name generation for demo mode
 *
 * Uses hash-based mapping to ensure consistent fake identities:
 * - Same student/teacher always gets the same fictional name (per seed)
 * - Changing the seed regenerates all fictional names
 * - Supports both student and teacher anonymization
 */

// Gender-neutral first names for students
const STUDENT_FIRST_NAMES = [
  'Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Quinn', 'Avery',
  'Drew', 'Skyler', 'Dakota', 'Reese', 'Cameron', 'Sage', 'Finley', 'Emerson',
  'Parker', 'Hayden', 'Rowan', 'Charlie', 'Blake', 'Peyton', 'Jamie', 'Logan',
  'River', 'Phoenix', 'Eden', 'Kendall', 'Marley', 'Oakley', 'Remy', 'Shiloh',
  'Tatum', 'Teagan', 'Wren', 'Aspen', 'Blair', 'Briar', 'Ellis', 'Frankie',
  'Gray', 'Harbor', 'Indigo', 'Jules', 'Kit', 'Lake', 'Milan', 'Nico',
  'Ocean', 'Palmer', 'Scout', 'Sterling', 'True', 'Vale', 'Winter', 'Zion'
];

// Common last names
const LAST_NAMES = [
  'Anderson', 'Bennett', 'Chen', 'Davis', 'Edwards', 'Foster', 'Garcia',
  'Harris', 'Iverson', 'Jackson', 'Kim', 'Lopez', 'Martinez', 'Nelson',
  'Ortiz', 'Patel', 'Quinn', 'Rivera', 'Smith', 'Thompson', 'Upton',
  'Valdez', 'Williams', 'Xavier', 'Young', 'Zhang', 'Adams', 'Baker',
  'Carter', 'Diaz', 'Evans', 'Fisher', 'Green', 'Hill', 'Ingram',
  'Johnson', 'King', 'Lee', 'Moore', 'Nguyen', 'Olson', 'Peterson',
  'Roberts', 'Scott', 'Taylor', 'Walker', 'White', 'Wright', 'York'
];

// Teacher first names (more traditional)
const TEACHER_FIRST_NAMES = [
  'Michael', 'Jennifer', 'David', 'Sarah', 'Robert', 'Lisa', 'James',
  'Michelle', 'William', 'Elizabeth', 'Richard', 'Patricia', 'Thomas',
  'Linda', 'Christopher', 'Barbara', 'Daniel', 'Susan', 'Matthew', 'Karen',
  'Anthony', 'Nancy', 'Mark', 'Betty', 'Donald', 'Margaret', 'Steven',
  'Sandra', 'Paul', 'Ashley', 'Andrew', 'Dorothy', 'Joshua', 'Kimberly',
  'Kenneth', 'Emily', 'Kevin', 'Donna', 'Brian', 'Carol'
];

// Teacher title prefixes
const TEACHER_PREFIXES = ['Mr.', 'Ms.', 'Mrs.', 'Dr.'];

interface AnonymizedStudentIdentity {
  firstName: string;
  lastName: string;
  fullName: string;
  studentId: string;
  flId: string;
}

interface AnonymizedTeacherIdentity {
  name: string;
  fullName: string;
}

// Cache for performance
const studentCache = new Map<string, AnonymizedStudentIdentity>();
const teacherCache = new Map<string, AnonymizedTeacherIdentity>();
let currentSeed: string = '';

/**
 * Generate a deterministic hash code from a string
 */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Generate a secondary hash for more variation
 */
function hashCode2(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
}

/**
 * Clear caches when seed changes
 */
function clearCaches(): void {
  studentCache.clear();
  teacherCache.clear();
}

/**
 * Check if seed has changed and clear caches if needed
 */
function checkSeed(seed: string): void {
  if (seed !== currentSeed) {
    currentSeed = seed;
    clearCaches();
  }
}

/**
 * Generate an anonymized identity for a student
 */
export function anonymizeStudent(
  studentId: string,
  seed: string
): AnonymizedStudentIdentity {
  checkSeed(seed);

  const cacheKey = studentId;
  if (studentCache.has(cacheKey)) {
    return studentCache.get(cacheKey)!;
  }

  const combinedKey = `${studentId}_${seed}`;
  const hash1 = hashCode(combinedKey);
  const hash2 = hashCode2(combinedKey);

  const firstNameIndex = hash1 % STUDENT_FIRST_NAMES.length;
  const lastNameIndex = hash2 % LAST_NAMES.length;

  const firstName = STUDENT_FIRST_NAMES[firstNameIndex];
  const lastName = LAST_NAMES[lastNameIndex];

  // Generate fake IDs
  const fakeIdNum = (hash1 % 90000000) + 10000000; // 8-digit number
  const fakeFLNum = (hash2 % 900000000000) + 100000000000; // 12-digit number

  const identity: AnonymizedStudentIdentity = {
    firstName,
    lastName,
    fullName: `${lastName}, ${firstName}`,
    studentId: `DEMO${fakeIdNum.toString().slice(0, 4)}`,
    flId: `FLDEMO${fakeFLNum.toString().slice(0, 8)}`
  };

  studentCache.set(cacheKey, identity);
  return identity;
}

/**
 * Generate an anonymized identity for a teacher
 * Handles various input formats: "Last, First", "First Last", "Mr. Last", etc.
 */
export function anonymizeTeacher(
  teacherName: string,
  seed: string
): AnonymizedTeacherIdentity {
  checkSeed(seed);

  // Normalize the teacher name for consistent caching
  const normalizedName = teacherName.trim().toLowerCase();

  if (teacherCache.has(normalizedName)) {
    return teacherCache.get(normalizedName)!;
  }

  const combinedKey = `teacher_${normalizedName}_${seed}`;
  const hash1 = hashCode(combinedKey);
  const hash2 = hashCode2(combinedKey);

  const prefixIndex = hash1 % TEACHER_PREFIXES.length;
  const firstNameIndex = hash2 % TEACHER_FIRST_NAMES.length;
  const lastNameIndex = (hash1 + hash2) % LAST_NAMES.length;

  const prefix = TEACHER_PREFIXES[prefixIndex];
  const firstName = TEACHER_FIRST_NAMES[firstNameIndex];
  const lastName = LAST_NAMES[lastNameIndex];

  const identity: AnonymizedTeacherIdentity = {
    name: `${prefix} ${lastName}`,
    fullName: `${firstName} ${lastName}`
  };

  teacherCache.set(normalizedName, identity);
  return identity;
}

/**
 * Anonymize a student ID only (when you don't have full student info)
 */
export function anonymizeStudentId(
  realId: string,
  seed: string
): string {
  const identity = anonymizeStudent(realId, seed);
  return identity.studentId;
}

/**
 * Anonymize an FL ID only
 */
export function anonymizeFlId(
  realId: string,
  seed: string
): string {
  // Use the realId to generate a consistent fake FL ID
  const combinedKey = `flid_${realId}_${seed}`;
  const hash = hashCode(combinedKey);
  const fakeFLNum = (hash % 900000000000) + 100000000000;
  return `FLDEMO${fakeFLNum.toString().slice(0, 8)}`;
}

/**
 * Generate a new random seed
 */
export function generateSeed(): string {
  return Math.random().toString(36).substring(2, 10) +
         Math.random().toString(36).substring(2, 10);
}

/**
 * Get preview of anonymization for admin panel
 * Returns sample mappings to show the user
 */
export function getAnonymizationPreview(
  sampleStudents: Array<{ id: string; firstName: string; lastName: string }>,
  sampleTeachers: string[],
  seed: string
): {
  students: Array<{
    real: { firstName: string; lastName: string };
    anonymized: { firstName: string; lastName: string };
  }>;
  teachers: Array<{
    real: string;
    anonymized: string;
  }>;
} {
  return {
    students: sampleStudents.slice(0, 3).map(student => ({
      real: { firstName: student.firstName, lastName: student.lastName },
      anonymized: {
        firstName: anonymizeStudent(student.id, seed).firstName,
        lastName: anonymizeStudent(student.id, seed).lastName
      }
    })),
    teachers: sampleTeachers.slice(0, 3).map(teacher => ({
      real: teacher,
      anonymized: anonymizeTeacher(teacher, seed).name
    }))
  };
}

/**
 * Bulk anonymize student names in a text string
 * Useful for anonymizing AI responses that contain student names
 */
export function anonymizeTextContent(
  text: string,
  studentMappings: Map<string, { firstName: string; lastName: string; id: string }>,
  teacherMappings: Map<string, string>,
  seed: string
): string {
  let result = text;

  // Anonymize student names (try various formats)
  for (const [key, student] of studentMappings) {
    const anonymized = anonymizeStudent(student.id, seed);

    // Replace "First Last" format
    const firstLastPattern = new RegExp(
      `\\b${escapeRegex(student.firstName)}\\s+${escapeRegex(student.lastName)}\\b`,
      'gi'
    );
    result = result.replace(firstLastPattern, `${anonymized.firstName} ${anonymized.lastName}`);

    // Replace "Last, First" format
    const lastFirstPattern = new RegExp(
      `\\b${escapeRegex(student.lastName)},\\s*${escapeRegex(student.firstName)}\\b`,
      'gi'
    );
    result = result.replace(lastFirstPattern, `${anonymized.lastName}, ${anonymized.firstName}`);
  }

  // Anonymize teacher names
  for (const [key, teacherName] of teacherMappings) {
    const anonymized = anonymizeTeacher(teacherName, seed);
    const teacherPattern = new RegExp(`\\b${escapeRegex(teacherName)}\\b`, 'gi');
    result = result.replace(teacherPattern, anonymized.name);
  }

  return result;
}

/**
 * Escape special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Export types
export type { AnonymizedStudentIdentity, AnonymizedTeacherIdentity };
