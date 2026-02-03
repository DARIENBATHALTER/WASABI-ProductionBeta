import { db, type AuditLog } from '../lib/db';
import { useStore } from '../store';

type AuditAction = AuditLog['action'];
type AuditEntityType = AuditLog['entityType'];

class AuditService {
  /**
   * Log an action to the audit trail
   */
  async log(
    action: AuditAction,
    entityType: AuditEntityType,
    entityId?: string,
    details?: string
  ): Promise<void> {
    try {
      const { currentUser } = useStore.getState();

      const logEntry: Omit<AuditLog, 'id'> = {
        timestamp: new Date(),
        userId: currentUser?.id || 'anonymous',
        userName: currentUser?.name || 'Anonymous',
        action,
        entityType,
        entityId,
        details,
      };

      await db.auditLogs.add(logEntry);
    } catch (error) {
      // Don't let audit logging failures break the app
      console.error('Failed to log audit entry:', error);
    }
  }

  /**
   * Log a student view
   */
  async logStudentView(studentId: string, studentName?: string): Promise<void> {
    await this.log('view', 'student', studentId, studentName ? `Viewed ${studentName}` : undefined);
  }

  /**
   * Log a report generation
   */
  async logReportGenerated(reportType: string, studentIds?: string[]): Promise<void> {
    const details = studentIds?.length
      ? `Generated ${reportType} for ${studentIds.length} student(s)`
      : `Generated ${reportType}`;
    await this.log('export', 'report', undefined, details);
  }

  /**
   * Log a data import
   */
  async logDataImport(dataType: string, recordCount: number): Promise<void> {
    await this.log('import', 'data', undefined, `Imported ${recordCount} ${dataType} records`);
  }

  /**
   * Log a data export
   */
  async logDataExport(dataType: string, recordCount?: number): Promise<void> {
    const details = recordCount
      ? `Exported ${recordCount} ${dataType} records`
      : `Exported ${dataType}`;
    await this.log('export', 'data', undefined, details);
  }

  /**
   * Log user login
   */
  async logLogin(userId: string, userName: string): Promise<void> {
    const logEntry: Omit<AuditLog, 'id'> = {
      timestamp: new Date(),
      userId,
      userName,
      action: 'login',
      entityType: 'user',
      entityId: userId,
      details: `${userName} logged in`,
    };
    await db.auditLogs.add(logEntry);
  }

  /**
   * Log user logout
   */
  async logLogout(): Promise<void> {
    await this.log('logout', 'user', undefined, 'User logged out');
  }

  /**
   * Log settings change
   */
  async logSettingsChange(settingName: string, oldValue?: string, newValue?: string): Promise<void> {
    let details = `Changed ${settingName}`;
    if (oldValue !== undefined && newValue !== undefined) {
      details += ` from "${oldValue}" to "${newValue}"`;
    }
    await this.log('update', 'settings', settingName, details);
  }

  /**
   * Log observation created/updated
   */
  async logObservation(action: 'create' | 'update', observationId: string, teacherName?: string): Promise<void> {
    const details = teacherName
      ? `${action === 'create' ? 'Created' : 'Updated'} observation for ${teacherName}`
      : undefined;
    await this.log(action, 'observation', observationId, details);
  }

  /**
   * Get audit logs with pagination
   */
  async getLogs(options?: {
    limit?: number;
    offset?: number;
    action?: AuditAction;
    entityType?: AuditEntityType;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{ logs: AuditLog[]; total: number }> {
    let collection = db.auditLogs.orderBy('timestamp').reverse();

    // Get total count before filtering
    let total = await db.auditLogs.count();

    // Apply filters
    let logs = await collection.toArray();

    if (options?.action) {
      logs = logs.filter(log => log.action === options.action);
    }

    if (options?.entityType) {
      logs = logs.filter(log => log.entityType === options.entityType);
    }

    if (options?.userId) {
      logs = logs.filter(log => log.userId === options.userId);
    }

    if (options?.startDate) {
      logs = logs.filter(log => log.timestamp >= options.startDate!);
    }

    if (options?.endDate) {
      logs = logs.filter(log => log.timestamp <= options.endDate!);
    }

    total = logs.length;

    // Apply pagination
    const offset = options?.offset || 0;
    const limit = options?.limit || 50;
    logs = logs.slice(offset, offset + limit);

    return { logs, total };
  }

  /**
   * Get recent activity summary
   */
  async getRecentActivity(days: number = 7): Promise<{
    totalActions: number;
    actionCounts: Record<AuditAction, number>;
    uniqueUsers: number;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const logs = await db.auditLogs
      .where('timestamp')
      .above(startDate)
      .toArray();

    const actionCounts: Record<string, number> = {};
    const uniqueUserIds = new Set<string>();

    logs.forEach(log => {
      actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
      uniqueUserIds.add(log.userId);
    });

    return {
      totalActions: logs.length,
      actionCounts: actionCounts as Record<AuditAction, number>,
      uniqueUsers: uniqueUserIds.size,
    };
  }

  /**
   * Clear old audit logs (retention policy)
   */
  async clearOldLogs(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const oldLogs = await db.auditLogs
      .where('timestamp')
      .below(cutoffDate)
      .toArray();

    const idsToDelete = oldLogs.map(log => log.id!);
    await db.auditLogs.bulkDelete(idsToDelete);

    return idsToDelete.length;
  }
}

export const auditService = new AuditService();
