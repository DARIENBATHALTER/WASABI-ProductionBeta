import { db, type CommunicationLog } from '../lib/db';
import { auditService } from './auditService';

class CommunicationService {
  async createCommunication(data: Omit<CommunicationLog, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    const communication: Omit<CommunicationLog, 'id'> = {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const id = await db.communications.add(communication);
    await auditService.log('create', 'student', data.studentId, `Logged communication: ${data.type} with ${data.contactName}`);
    return id;
  }

  async updateCommunication(id: number, data: Partial<CommunicationLog>): Promise<void> {
    await db.communications.update(id, {
      ...data,
      updatedAt: new Date(),
    });
    await auditService.log('update', 'student', undefined, `Updated communication #${id}`);
  }

  async getCommunicationsByStudent(studentId: string): Promise<CommunicationLog[]> {
    return db.communications
      .where('studentId')
      .equals(studentId)
      .reverse()
      .sortBy('communicationDate');
  }

  async getAllCommunications(): Promise<CommunicationLog[]> {
    return db.communications.orderBy('communicationDate').reverse().toArray();
  }

  async getCommunicationById(id: number): Promise<CommunicationLog | undefined> {
    return db.communications.get(id);
  }

  async deleteCommunication(id: number): Promise<void> {
    await db.communications.delete(id);
    await auditService.log('delete', 'student', undefined, `Deleted communication #${id}`);
  }

  async getFollowUpsRequired(): Promise<CommunicationLog[]> {
    return db.communications
      .where('followUpRequired')
      .equals(1) // Dexie stores booleans as 0/1
      .toArray();
  }

  async getPendingFollowUps(): Promise<CommunicationLog[]> {
    const all = await this.getAllCommunications();
    const today = new Date();
    return all.filter(c =>
      c.followUpRequired &&
      c.followUpDate &&
      new Date(c.followUpDate) <= today
    );
  }

  async getRecentCommunications(days: number = 7): Promise<CommunicationLog[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const all = await this.getAllCommunications();
    return all.filter(c => new Date(c.communicationDate) >= cutoffDate);
  }

  async getCommunicationSummary(studentId: string): Promise<{
    totalCommunications: number;
    byType: Record<string, number>;
    pendingFollowUps: number;
    lastCommunication?: Date;
  }> {
    const communications = await this.getCommunicationsByStudent(studentId);

    const byType: Record<string, number> = {};
    communications.forEach(c => {
      byType[c.type] = (byType[c.type] || 0) + 1;
    });

    const pendingFollowUps = communications.filter(c =>
      c.followUpRequired && c.followUpDate && new Date(c.followUpDate) <= new Date()
    ).length;

    return {
      totalCommunications: communications.length,
      byType,
      pendingFollowUps,
      lastCommunication: communications[0]?.communicationDate,
    };
  }

  async getSchoolWideSummary(): Promise<{
    totalCommunications: number;
    totalStudentsContacted: number;
    pendingFollowUps: number;
    byType: Record<string, number>;
    recentCount: number;
  }> {
    const all = await this.getAllCommunications();
    const studentIds = new Set(all.map(c => c.studentId));

    const byType: Record<string, number> = {};
    all.forEach(c => {
      byType[c.type] = (byType[c.type] || 0) + 1;
    });

    const pendingFollowUps = all.filter(c =>
      c.followUpRequired && c.followUpDate && new Date(c.followUpDate) <= new Date()
    ).length;

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const recentCount = all.filter(c => new Date(c.communicationDate) >= weekAgo).length;

    return {
      totalCommunications: all.length,
      totalStudentsContacted: studentIds.size,
      pendingFollowUps,
      byType,
      recentCount,
    };
  }
}

export const communicationService = new CommunicationService();
