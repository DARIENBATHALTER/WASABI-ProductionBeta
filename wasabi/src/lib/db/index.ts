import Dexie, { type Table } from 'dexie';
import type { 
  Student, 
  DataSource, 
  AttendanceRecord, 
  GradeRecord, 
  AssessmentRecord,
  DisciplineRecord,
  MatchingReport
} from '../../shared/types';
import type { SOBAObservation, SOBAStudentNote } from '../../services/sobaService';

export interface User {
  id?: number;
  email: string;
  name: string;
  role: string;
  password: string;
  createdAt: Date;
  lastLogin?: Date;
  isActive: boolean;
}

export interface Settings {
  id?: number;
  key: string;
  value: any;
}

export interface AuditLog {
  id?: number;
  timestamp: Date;
  userId: string;
  userName: string;
  action: 'view' | 'create' | 'update' | 'delete' | 'export' | 'import' | 'login' | 'logout';
  entityType: 'student' | 'assessment' | 'observation' | 'report' | 'user' | 'settings' | 'data';
  entityId?: string;
  details?: string;
  ipAddress?: string;
}

export interface Intervention {
  id?: number;
  studentId: string;
  type: 'tutoring' | 'counseling' | 'parent_conference' | 'behavior_plan' | 'academic_support' | 'mentoring' | 'other';
  title: string;
  description: string;
  startDate: Date;
  endDate?: Date;
  frequency: string; // e.g., "Daily", "Weekly", "As needed"
  staffResponsible: string;
  status: 'active' | 'completed' | 'paused' | 'discontinued';
  notes: string[];
  createdAt: Date;
  updatedAt: Date;
  outcomes?: {
    successful: boolean;
    summary: string;
    measuredDate: Date;
  };
}

export interface StudentGoal {
  id?: number;
  studentId: string;
  category: 'reading' | 'math' | 'attendance' | 'behavior' | 'social_emotional' | 'other';
  title: string;
  description: string;
  metric: string;
  baselineValue: number;
  targetValue: number;
  currentValue: number;
  unit: string;
  startDate: Date;
  targetDate: Date;
  status: 'not_started' | 'in_progress' | 'achieved' | 'missed' | 'extended';
  progressNotes: Array<{
    date: Date;
    value: number;
    note: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommunicationLog {
  id?: number;
  studentId: string;
  type: 'phone_call' | 'email' | 'in_person' | 'text_message' | 'home_visit' | 'other';
  contactName: string;
  contactRelationship: string; // e.g., "Mother", "Father", "Guardian"
  direction: 'outgoing' | 'incoming';
  subject: string;
  summary: string;
  outcome?: string;
  followUpRequired: boolean;
  followUpDate?: Date;
  staffMember: string;
  communicationDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

class WasabiDatabase extends Dexie {
  // Declare tables
  users!: Table<User>;
  students!: Table<Student>;
  dataSources!: Table<DataSource>;
  attendance!: Table<AttendanceRecord>;
  grades!: Table<GradeRecord>;
  discipline!: Table<DisciplineRecord>;
  assessments!: Table<AssessmentRecord>;
  sobaObservations!: Table<SOBAObservation>;
  sobaStudentNotes!: Table<SOBAStudentNote>;
  matchingReports!: Table<MatchingReport>;
  settings!: Table<Settings>;
  auditLogs!: Table<AuditLog>;
  interventions!: Table<Intervention>;
  studentGoals!: Table<StudentGoal>;
  communications!: Table<CommunicationLog>;

  constructor() {
    super('wasabi-db');
    
    this.version(1).stores({
      users: '++id, username',
      students: 'id, studentNumber, firstName, lastName, grade',
      dataSources: 'id, type, uploadDate',
      attendance: '[studentId+date], studentId, date',
      grades: '[studentId+term], studentId, term',
      assessments: '++id, studentId, source, testDate, subject',
      settings: 'key'
    });

    // Version 2: Drop and recreate grades table with new schema
    this.version(2).stores({
      users: '++id, username',
      students: 'id, studentNumber, firstName, lastName, grade',
      dataSources: 'id, type, uploadDate',
      attendance: '[studentId+date], studentId, date',
      grades: null, // Drop the old grades table
      assessments: '++id, studentId, source, testDate, subject',
      settings: 'key'
    });

    // Version 3: Recreate grades table with new schema
    this.version(3).stores({
      users: '++id, username',
      students: 'id, studentNumber, firstName, lastName, grade',
      dataSources: 'id, type, uploadDate',
      attendance: '[studentId+date], studentId, date',
      grades: '++id, studentId, course',
      assessments: '++id, studentId, source, testDate, subject',
      settings: 'key'
    });

    // Version 4: Add matching system support
    this.version(4).stores({
      users: '++id, username',
      students: 'id, studentNumber, firstName, lastName, grade, dateOfBirth',
      dataSources: 'id, type, uploadDate',
      attendance: '[studentId+date], studentId, date, matchedBy, matchConfidence',
      grades: '++id, studentId, course, matchedBy, matchConfidence',
      assessments: '++id, studentId, source, testDate, subject, matchedBy, matchConfidence',
      matchingReports: '++id, datasetType, uploadDate',
      settings: 'key'
    });

    // Version 5: Add FL ID support
    this.version(5).stores({
      users: '++id, username',
      students: 'id, studentNumber, flId, firstName, lastName, grade, dateOfBirth',
      dataSources: 'id, type, uploadDate',
      attendance: '[studentId+date], studentId, date, matchedBy, matchConfidence',
      grades: '++id, studentId, course, matchedBy, matchConfidence',
      assessments: '++id, studentId, source, testDate, subject, matchedBy, matchConfidence',
      matchingReports: '++id, datasetType, uploadDate',
      settings: 'key'
    });

    // Version 6: Add discipline support
    this.version(6).stores({
      users: '++id, username',
      students: 'id, studentNumber, flId, firstName, lastName, grade, dateOfBirth',
      dataSources: 'id, type, uploadDate',
      attendance: '[studentId+date], studentId, date, matchedBy, matchConfidence',
      grades: '++id, studentId, course, matchedBy, matchConfidence',
      discipline: '++id, studentId, incidentDate, infractionCode, matchedBy, matchConfidence',
      assessments: '++id, studentId, source, testDate, subject, matchedBy, matchConfidence',
      matchingReports: '++id, datasetType, uploadDate',
      settings: 'key'
    });

    // Version 7: Add SOBA support
    this.version(7).stores({
      users: '++id, username',
      students: 'id, studentNumber, flId, firstName, lastName, grade, dateOfBirth',
      dataSources: 'id, type, uploadDate',
      attendance: '[studentId+date], studentId, date, matchedBy, matchConfidence',
      grades: '++id, studentId, course, matchedBy, matchConfidence',
      discipline: '++id, studentId, incidentDate, infractionCode, matchedBy, matchConfidence',
      assessments: '++id, studentId, source, testDate, subject, matchedBy, matchConfidence',
      sobaObservations: 'observationId, homeroom, observationTimestamp',
      sobaStudentNotes: 'noteId, observationId, studentId, homeroom, noteTimestamp',
      matchingReports: '++id, datasetType, uploadDate',
      settings: 'key'
    });

    // Version 8: Update users table for admin system
    this.version(8).stores({
      users: '++id, email, name, role, isActive',
      students: 'id, studentNumber, flId, firstName, lastName, grade, dateOfBirth',
      dataSources: 'id, type, uploadDate',
      attendance: '[studentId+date], studentId, date, matchedBy, matchConfidence',
      grades: '++id, studentId, course, matchedBy, matchConfidence',
      discipline: '++id, studentId, incidentDate, infractionCode, matchedBy, matchConfidence',
      assessments: '++id, studentId, source, testDate, subject, matchedBy, matchConfidence',
      sobaObservations: 'observationId, homeroom, observationTimestamp',
      sobaStudentNotes: 'noteId, observationId, studentId, homeroom, noteTimestamp',
      matchingReports: '++id, datasetType, uploadDate',
      settings: 'key'
    }).upgrade(trans => {
      // Initialize default admin user
      return trans.table('users').add({
        email: 'techsupport@wayman.org',
        name: 'Tech Support',
        role: 'Administrator',
        password: 'OOoo00))',
        createdAt: new Date(),
        isActive: true
      });
    });

    // Version 9: Add audit logging
    this.version(9).stores({
      users: '++id, email, name, role, isActive',
      students: 'id, studentNumber, flId, firstName, lastName, grade, dateOfBirth',
      dataSources: 'id, type, uploadDate',
      attendance: '[studentId+date], studentId, date, matchedBy, matchConfidence',
      grades: '++id, studentId, course, matchedBy, matchConfidence',
      discipline: '++id, studentId, incidentDate, infractionCode, matchedBy, matchConfidence',
      assessments: '++id, studentId, source, testDate, subject, matchedBy, matchConfidence',
      sobaObservations: 'observationId, homeroom, observationTimestamp',
      sobaStudentNotes: 'noteId, observationId, studentId, homeroom, noteTimestamp',
      matchingReports: '++id, datasetType, uploadDate',
      settings: 'key',
      auditLogs: '++id, timestamp, userId, action, entityType'
    });

    // Version 10: Add interventions and student goals
    this.version(10).stores({
      users: '++id, email, name, role, isActive',
      students: 'id, studentNumber, flId, firstName, lastName, grade, dateOfBirth',
      dataSources: 'id, type, uploadDate',
      attendance: '[studentId+date], studentId, date, matchedBy, matchConfidence',
      grades: '++id, studentId, course, matchedBy, matchConfidence',
      discipline: '++id, studentId, incidentDate, infractionCode, matchedBy, matchConfidence',
      assessments: '++id, studentId, source, testDate, subject, matchedBy, matchConfidence',
      sobaObservations: 'observationId, homeroom, observationTimestamp',
      sobaStudentNotes: 'noteId, observationId, studentId, homeroom, noteTimestamp',
      matchingReports: '++id, datasetType, uploadDate',
      settings: 'key',
      auditLogs: '++id, timestamp, userId, action, entityType',
      interventions: '++id, studentId, type, status, startDate',
      studentGoals: '++id, studentId, category, status, targetDate'
    });

    // Version 11: Add communication log
    this.version(11).stores({
      users: '++id, email, name, role, isActive',
      students: 'id, studentNumber, flId, firstName, lastName, grade, dateOfBirth',
      dataSources: 'id, type, uploadDate',
      attendance: '[studentId+date], studentId, date, matchedBy, matchConfidence',
      grades: '++id, studentId, course, matchedBy, matchConfidence',
      discipline: '++id, studentId, incidentDate, infractionCode, matchedBy, matchConfidence',
      assessments: '++id, studentId, source, testDate, subject, matchedBy, matchConfidence',
      sobaObservations: 'observationId, homeroom, observationTimestamp',
      sobaStudentNotes: 'noteId, observationId, studentId, homeroom, noteTimestamp',
      matchingReports: '++id, datasetType, uploadDate',
      settings: 'key',
      auditLogs: '++id, timestamp, userId, action, entityType',
      interventions: '++id, studentId, type, status, startDate',
      studentGoals: '++id, studentId, category, status, targetDate',
      communications: '++id, studentId, type, communicationDate, followUpRequired'
    });
  }
}

export const db = new WasabiDatabase();