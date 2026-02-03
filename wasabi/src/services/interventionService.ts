import { db, type Intervention, type StudentGoal } from '../lib/db';
import { auditService } from './auditService';

class InterventionService {
  // ==================== INTERVENTIONS ====================

  async createIntervention(data: Omit<Intervention, 'id' | 'createdAt' | 'updatedAt' | 'notes'>): Promise<number> {
    const intervention: Omit<Intervention, 'id'> = {
      ...data,
      notes: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const id = await db.interventions.add(intervention);
    await auditService.log('create', 'student', data.studentId, `Created intervention: ${data.title}`);
    return id;
  }

  async updateIntervention(id: number, data: Partial<Intervention>): Promise<void> {
    await db.interventions.update(id, {
      ...data,
      updatedAt: new Date(),
    });
    await auditService.log('update', 'student', undefined, `Updated intervention #${id}`);
  }

  async addInterventionNote(id: number, note: string): Promise<void> {
    const intervention = await db.interventions.get(id);
    if (!intervention) throw new Error('Intervention not found');

    const notes = [...intervention.notes, note];
    await db.interventions.update(id, { notes, updatedAt: new Date() });
  }

  async completeIntervention(id: number, outcomes: Intervention['outcomes']): Promise<void> {
    await db.interventions.update(id, {
      status: 'completed',
      endDate: new Date(),
      outcomes,
      updatedAt: new Date(),
    });
    await auditService.log('update', 'student', undefined, `Completed intervention #${id}`);
  }

  async getInterventionsByStudent(studentId: string): Promise<Intervention[]> {
    return db.interventions.where('studentId').equals(studentId).toArray();
  }

  async getActiveInterventions(): Promise<Intervention[]> {
    return db.interventions.where('status').equals('active').toArray();
  }

  async getAllInterventions(): Promise<Intervention[]> {
    return db.interventions.orderBy('startDate').reverse().toArray();
  }

  async getInterventionById(id: number): Promise<Intervention | undefined> {
    return db.interventions.get(id);
  }

  async deleteIntervention(id: number): Promise<void> {
    await db.interventions.delete(id);
    await auditService.log('delete', 'student', undefined, `Deleted intervention #${id}`);
  }

  // ==================== STUDENT GOALS ====================

  async createGoal(data: Omit<StudentGoal, 'id' | 'createdAt' | 'updatedAt' | 'progressNotes' | 'currentValue'>): Promise<number> {
    const goal: Omit<StudentGoal, 'id'> = {
      ...data,
      currentValue: data.baselineValue,
      progressNotes: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const id = await db.studentGoals.add(goal);
    await auditService.log('create', 'student', data.studentId, `Created goal: ${data.title}`);
    return id;
  }

  async updateGoal(id: number, data: Partial<StudentGoal>): Promise<void> {
    await db.studentGoals.update(id, {
      ...data,
      updatedAt: new Date(),
    });
    await auditService.log('update', 'student', undefined, `Updated goal #${id}`);
  }

  async recordProgress(id: number, value: number, note: string): Promise<void> {
    const goal = await db.studentGoals.get(id);
    if (!goal) throw new Error('Goal not found');

    const progressNotes = [
      ...goal.progressNotes,
      { date: new Date(), value, note },
    ];

    // Auto-update status if target achieved
    let status = goal.status;
    if (value >= goal.targetValue && status === 'in_progress') {
      status = 'achieved';
    }

    await db.studentGoals.update(id, {
      currentValue: value,
      progressNotes,
      status,
      updatedAt: new Date(),
    });
  }

  async getGoalsByStudent(studentId: string): Promise<StudentGoal[]> {
    return db.studentGoals.where('studentId').equals(studentId).toArray();
  }

  async getActiveGoals(): Promise<StudentGoal[]> {
    return db.studentGoals.where('status').equals('in_progress').toArray();
  }

  async getAllGoals(): Promise<StudentGoal[]> {
    return db.studentGoals.orderBy('targetDate').toArray();
  }

  async getGoalById(id: number): Promise<StudentGoal | undefined> {
    return db.studentGoals.get(id);
  }

  async deleteGoal(id: number): Promise<void> {
    await db.studentGoals.delete(id);
    await auditService.log('delete', 'student', undefined, `Deleted goal #${id}`);
  }

  // ==================== SUMMARY STATS ====================

  async getStudentInterventionSummary(studentId: string): Promise<{
    activeInterventions: number;
    completedInterventions: number;
    successfulOutcomes: number;
    activeGoals: number;
    achievedGoals: number;
  }> {
    const interventions = await this.getInterventionsByStudent(studentId);
    const goals = await this.getGoalsByStudent(studentId);

    return {
      activeInterventions: interventions.filter(i => i.status === 'active').length,
      completedInterventions: interventions.filter(i => i.status === 'completed').length,
      successfulOutcomes: interventions.filter(i => i.outcomes?.successful).length,
      activeGoals: goals.filter(g => g.status === 'in_progress').length,
      achievedGoals: goals.filter(g => g.status === 'achieved').length,
    };
  }

  async getSchoolWideSummary(): Promise<{
    totalActiveInterventions: number;
    totalStudentsWithInterventions: number;
    interventionsByType: Record<string, number>;
    totalActiveGoals: number;
    goalsByCategory: Record<string, number>;
  }> {
    const interventions = await this.getAllInterventions();
    const goals = await this.getAllGoals();

    const activeInterventions = interventions.filter(i => i.status === 'active');
    const activeGoals = goals.filter(g => g.status === 'in_progress');

    const studentIdsWithInterventions = new Set(activeInterventions.map(i => i.studentId));

    const interventionsByType: Record<string, number> = {};
    activeInterventions.forEach(i => {
      interventionsByType[i.type] = (interventionsByType[i.type] || 0) + 1;
    });

    const goalsByCategory: Record<string, number> = {};
    activeGoals.forEach(g => {
      goalsByCategory[g.category] = (goalsByCategory[g.category] || 0) + 1;
    });

    return {
      totalActiveInterventions: activeInterventions.length,
      totalStudentsWithInterventions: studentIdsWithInterventions.size,
      interventionsByType,
      totalActiveGoals: activeGoals.length,
      goalsByCategory,
    };
  }
}

export const interventionService = new InterventionService();
