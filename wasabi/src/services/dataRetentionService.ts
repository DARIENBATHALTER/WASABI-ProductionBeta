import { db } from '../lib/db';
import { auditService } from './auditService';

interface RetentionPolicy {
  assessments: number; // days to keep assessment data
  attendance: number; // days to keep attendance records
  auditLogs: number; // days to keep audit logs
  communications: number; // days to keep communication logs
}

const DEFAULT_RETENTION_POLICY: RetentionPolicy = {
  assessments: 365 * 3, // 3 years
  attendance: 365 * 3, // 3 years
  auditLogs: 365, // 1 year
  communications: 365 * 2, // 2 years
};

interface StorageStats {
  totalRecords: number;
  byTable: Record<string, number>;
  estimatedSizeMB: number;
}

class DataRetentionService {
  private policy: RetentionPolicy;

  constructor() {
    this.policy = this.loadPolicy();
  }

  private loadPolicy(): RetentionPolicy {
    try {
      const saved = localStorage.getItem('wasabi-retention-policy');
      if (saved) {
        return { ...DEFAULT_RETENTION_POLICY, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error('Failed to load retention policy:', e);
    }
    return DEFAULT_RETENTION_POLICY;
  }

  savePolicy(policy: Partial<RetentionPolicy>): void {
    this.policy = { ...this.policy, ...policy };
    localStorage.setItem('wasabi-retention-policy', JSON.stringify(this.policy));
  }

  getPolicy(): RetentionPolicy {
    return { ...this.policy };
  }

  // Get storage statistics
  async getStorageStats(): Promise<StorageStats> {
    const [
      students,
      attendance,
      grades,
      assessments,
      interventions,
      communications,
      auditLogs,
      sobaObservations,
      sobaStudentNotes,
    ] = await Promise.all([
      db.students.count(),
      db.attendance.count(),
      db.grades.count(),
      db.assessments.count(),
      db.interventions.count(),
      db.communications.count(),
      db.auditLogs.count(),
      db.sobaObservations.count(),
      db.sobaStudentNotes.count(),
    ]);

    const byTable = {
      students,
      attendance,
      grades,
      assessments,
      interventions,
      communications,
      auditLogs,
      sobaObservations,
      sobaStudentNotes,
    };

    const totalRecords = Object.values(byTable).reduce((a, b) => a + b, 0);

    // Estimate size (rough approximation: 500 bytes per record average)
    const estimatedSizeMB = (totalRecords * 500) / (1024 * 1024);

    return {
      totalRecords,
      byTable,
      estimatedSizeMB,
    };
  }

  // Get actual IndexedDB storage usage (if available)
  async getActualStorageUsage(): Promise<{ usage: number; quota: number } | null> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        return {
          usage: estimate.usage || 0,
          quota: estimate.quota || 0,
        };
      } catch (e) {
        console.error('Failed to estimate storage:', e);
      }
    }
    return null;
  }

  // Clean up old data based on retention policy
  async cleanupOldData(dryRun: boolean = false): Promise<{
    assessments: number;
    attendance: number;
    auditLogs: number;
    communications: number;
    total: number;
  }> {
    const now = new Date();
    const results = {
      assessments: 0,
      attendance: 0,
      auditLogs: 0,
      communications: 0,
      total: 0,
    };

    // Calculate cutoff dates
    const assessmentCutoff = new Date(now);
    assessmentCutoff.setDate(assessmentCutoff.getDate() - this.policy.assessments);

    const attendanceCutoff = new Date(now);
    attendanceCutoff.setDate(attendanceCutoff.getDate() - this.policy.attendance);

    const auditLogCutoff = new Date(now);
    auditLogCutoff.setDate(auditLogCutoff.getDate() - this.policy.auditLogs);

    const communicationsCutoff = new Date(now);
    communicationsCutoff.setDate(communicationsCutoff.getDate() - this.policy.communications);

    // Count/delete old assessments
    const oldAssessments = await db.assessments
      .filter(a => a.testDate && new Date(a.testDate) < assessmentCutoff)
      .toArray();
    results.assessments = oldAssessments.length;

    if (!dryRun && results.assessments > 0) {
      await db.assessments.bulkDelete(oldAssessments.map(a => a.id!));
    }

    // Count/delete old attendance
    const oldAttendance = await db.attendance
      .filter(a => new Date(a.date) < attendanceCutoff)
      .toArray();
    results.attendance = oldAttendance.length;

    if (!dryRun && results.attendance > 0) {
      // Attendance has compound key, delete individually
      for (const record of oldAttendance) {
        await db.attendance.delete([record.studentId, record.date]);
      }
    }

    // Count/delete old audit logs
    const oldAuditLogs = await db.auditLogs
      .filter(a => new Date(a.timestamp) < auditLogCutoff)
      .toArray();
    results.auditLogs = oldAuditLogs.length;

    if (!dryRun && results.auditLogs > 0) {
      await db.auditLogs.bulkDelete(oldAuditLogs.map(a => a.id!));
    }

    // Count/delete old communications
    const oldCommunications = await db.communications
      .filter(c => new Date(c.communicationDate) < communicationsCutoff)
      .toArray();
    results.communications = oldCommunications.length;

    if (!dryRun && results.communications > 0) {
      await db.communications.bulkDelete(oldCommunications.map(c => c.id!));
    }

    results.total = results.assessments + results.attendance + results.auditLogs + results.communications;

    if (!dryRun && results.total > 0) {
      await auditService.log('delete', 'data', undefined, `Data retention cleanup: removed ${results.total} old records`);
    }

    return results;
  }

  // Archive data to a downloadable backup before deletion
  async exportDataForArchive(cutoffDays: number): Promise<{
    assessments: any[];
    attendance: any[];
    communications: any[];
  }> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - cutoffDays);

    const [assessments, attendance, communications] = await Promise.all([
      db.assessments.filter(a => a.testDate && new Date(a.testDate) < cutoff).toArray(),
      db.attendance.filter(a => new Date(a.date) < cutoff).toArray(),
      db.communications.filter(c => new Date(c.communicationDate) < cutoff).toArray(),
    ]);

    return { assessments, attendance, communications };
  }

  // Clear all data (dangerous - for testing/reset)
  async clearAllData(): Promise<void> {
    await Promise.all([
      db.students.clear(),
      db.attendance.clear(),
      db.grades.clear(),
      db.assessments.clear(),
      db.interventions.clear(),
      db.studentGoals.clear(),
      db.communications.clear(),
      db.sobaObservations.clear(),
      db.sobaStudentNotes.clear(),
      db.dataSources.clear(),
      db.matchingReports.clear(),
    ]);

    await auditService.log('delete', 'data', undefined, 'All student data cleared');
  }

  // Delete data for a specific student (for data privacy requests)
  async deleteStudentData(studentId: string): Promise<{
    deleted: Record<string, number>;
  }> {
    const deleted: Record<string, number> = {};

    // Delete from each table
    const tables = [
      { name: 'attendance', query: () => db.attendance.where('studentId').equals(studentId) },
      { name: 'grades', query: () => db.grades.where('studentId').equals(studentId) },
      { name: 'assessments', query: () => db.assessments.where('studentId').equals(studentId) },
      { name: 'interventions', query: () => db.interventions.where('studentId').equals(studentId) },
      { name: 'goals', query: () => db.studentGoals.where('studentId').equals(studentId) },
      { name: 'communications', query: () => db.communications.where('studentId').equals(studentId) },
      { name: 'sobaStudentNotes', query: () => db.sobaStudentNotes.where('studentId').equals(studentId) },
    ];

    for (const table of tables) {
      const count = await table.query().count();
      if (count > 0) {
        await table.query().delete();
        deleted[table.name] = count;
      }
    }

    // Finally delete the student record
    const studentDeleted = await db.students.delete(studentId);
    if (studentDeleted) {
      deleted.student = 1;
    }

    await auditService.log('delete', 'student', studentId, `Deleted all data for student (privacy request)`);

    return { deleted };
  }
}

export const dataRetentionService = new DataRetentionService();
