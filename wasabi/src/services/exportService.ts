import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { db } from '../lib/db';
import type { Student } from '../shared/types';

export type ExportFormat = 'csv' | 'xlsx';

interface ExportOptions {
  format: ExportFormat;
  filename: string;
  includeHeaders?: boolean;
}

class ExportService {
  // Generic data export
  exportData<T extends Record<string, any>>(
    data: T[],
    columns: { key: keyof T; label: string }[],
    options: ExportOptions
  ): void {
    const { format, filename, includeHeaders = true } = options;

    // Prepare data with selected columns
    const exportData = data.map(item =>
      columns.reduce((acc, col) => {
        acc[col.label] = item[col.key] ?? '';
        return acc;
      }, {} as Record<string, any>)
    );

    if (format === 'csv') {
      this.exportCSV(exportData, filename, includeHeaders);
    } else {
      this.exportExcel(exportData, filename);
    }
  }

  private exportCSV(data: Record<string, any>[], filename: string, includeHeaders: boolean): void {
    if (data.length === 0) {
      console.warn('No data to export');
      return;
    }

    const headers = Object.keys(data[0]);
    const csvRows: string[] = [];

    if (includeHeaders) {
      csvRows.push(headers.map(h => `"${h}"`).join(','));
    }

    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header];
        // Escape quotes and wrap in quotes
        if (value === null || value === undefined) return '""';
        const stringValue = String(value).replace(/"/g, '""');
        return `"${stringValue}"`;
      });
      csvRows.push(values.join(','));
    }

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${filename}.csv`);
  }

  private exportExcel(data: Record<string, any>[], filename: string): void {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');

    // Auto-size columns
    const maxWidths = this.calculateColumnWidths(data);
    worksheet['!cols'] = maxWidths.map(w => ({ wch: Math.min(w + 2, 50) }));

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `${filename}.xlsx`);
  }

  private calculateColumnWidths(data: Record<string, any>[]): number[] {
    if (data.length === 0) return [];
    const headers = Object.keys(data[0]);

    return headers.map(header => {
      const headerLength = header.length;
      const maxDataLength = Math.max(
        ...data.map(row => String(row[header] ?? '').length)
      );
      return Math.max(headerLength, maxDataLength);
    });
  }

  // Predefined student export
  async exportStudents(
    students: Student[] | 'all',
    options: Partial<ExportOptions> & { fields?: string[] } = {}
  ): Promise<void> {
    const studentData = students === 'all'
      ? await db.students.toArray()
      : students;

    const defaultFields: { key: keyof Student; label: string }[] = [
      { key: 'studentNumber', label: 'Student ID' },
      { key: 'firstName', label: 'First Name' },
      { key: 'lastName', label: 'Last Name' },
      { key: 'grade', label: 'Grade' },
      { key: 'gender', label: 'Gender' },
      { key: 'dateOfBirth', label: 'Date of Birth' },
      { key: 'className', label: 'Homeroom' },
    ];

    const selectedFields = options.fields
      ? defaultFields.filter(f => options.fields?.includes(f.key as string))
      : defaultFields;

    this.exportData(studentData, selectedFields, {
      format: options.format || 'xlsx',
      filename: options.filename || `students_export_${this.getDateString()}`,
      includeHeaders: options.includeHeaders,
    });
  }

  // Export attendance data
  async exportAttendance(
    studentIds: string[] | 'all',
    dateRange?: { start: Date; end: Date },
    options: Partial<ExportOptions> = {}
  ): Promise<void> {
    let query = db.attendance.toCollection();

    if (studentIds !== 'all') {
      query = db.attendance.where('studentId').anyOf(studentIds);
    }

    let records = await query.toArray();

    if (dateRange) {
      records = records.filter(r => {
        const date = new Date(r.date);
        return date >= dateRange.start && date <= dateRange.end;
      });
    }

    // Get student names for export
    const students = await db.students.toArray();
    const studentMap = new Map(students.map(s => [s.id, s]));

    const exportData = records.map(r => {
      const student = studentMap.get(r.studentId);
      return {
        'Student ID': r.studentId,
        'Student Name': student ? `${student.firstName} ${student.lastName}` : 'Unknown',
        'Date': new Date(r.date).toLocaleDateString(),
        'Status': r.status,
        'Periods Absent': r.periodsAbsent || 0,
      };
    });

    const format = options.format || 'xlsx';
    const filename = options.filename || `attendance_export_${this.getDateString()}`;

    if (format === 'csv') {
      this.exportCSV(exportData, filename, true);
    } else {
      this.exportExcel(exportData, filename);
    }
  }

  // Export assessment data
  async exportAssessments(
    source: string | 'all',
    studentIds: string[] | 'all',
    options: Partial<ExportOptions> = {}
  ): Promise<void> {
    let query = db.assessments.toCollection();

    if (source !== 'all') {
      query = db.assessments.where('source').equals(source);
    }

    let records = await query.toArray();

    if (studentIds !== 'all') {
      const studentIdSet = new Set(studentIds);
      records = records.filter(r => studentIdSet.has(r.studentId));
    }

    // Get student names for export
    const students = await db.students.toArray();
    const studentMap = new Map(students.map(s => [s.id, s]));

    const exportData = records.map(r => {
      const student = studentMap.get(r.studentId);
      return {
        'Student ID': r.studentId,
        'Student Name': student ? `${student.firstName} ${student.lastName}` : 'Unknown',
        'Source': r.source,
        'Subject': r.subject,
        'Test Date': r.testDate ? new Date(r.testDate).toLocaleDateString() : '',
        'Score': r.score ?? '',
        'Percentile': r.percentile ?? '',
        'Performance Level': r.performanceLevel ?? '',
      };
    });

    const format = options.format || 'xlsx';
    const filename = options.filename || `assessments_${source}_${this.getDateString()}`;

    if (format === 'csv') {
      this.exportCSV(exportData, filename, true);
    } else {
      this.exportExcel(exportData, filename);
    }
  }

  // Export interventions
  async exportInterventions(
    studentIds: string[] | 'all',
    options: Partial<ExportOptions> = {}
  ): Promise<void> {
    let records = await db.interventions.toArray();

    if (studentIds !== 'all') {
      const studentIdSet = new Set(studentIds);
      records = records.filter(r => studentIdSet.has(r.studentId));
    }

    const students = await db.students.toArray();
    const studentMap = new Map(students.map(s => [s.id, s]));

    const exportData = records.map(r => {
      const student = studentMap.get(r.studentId);
      return {
        'Student ID': r.studentId,
        'Student Name': student ? `${student.firstName} ${student.lastName}` : 'Unknown',
        'Title': r.title,
        'Type': r.type,
        'Status': r.status,
        'Start Date': new Date(r.startDate).toLocaleDateString(),
        'End Date': r.endDate ? new Date(r.endDate).toLocaleDateString() : '',
        'Staff Responsible': r.staffResponsible,
        'Frequency': r.frequency,
      };
    });

    const format = options.format || 'xlsx';
    const filename = options.filename || `interventions_${this.getDateString()}`;

    if (format === 'csv') {
      this.exportCSV(exportData, filename, true);
    } else {
      this.exportExcel(exportData, filename);
    }
  }

  // Export communications
  async exportCommunications(
    studentIds: string[] | 'all',
    options: Partial<ExportOptions> = {}
  ): Promise<void> {
    let records = await db.communications.toArray();

    if (studentIds !== 'all') {
      const studentIdSet = new Set(studentIds);
      records = records.filter(r => studentIdSet.has(r.studentId));
    }

    const students = await db.students.toArray();
    const studentMap = new Map(students.map(s => [s.id, s]));

    const exportData = records.map(r => {
      const student = studentMap.get(r.studentId);
      return {
        'Student ID': r.studentId,
        'Student Name': student ? `${student.firstName} ${student.lastName}` : 'Unknown',
        'Date': new Date(r.communicationDate).toLocaleDateString(),
        'Type': r.type,
        'Direction': r.direction,
        'Contact Name': r.contactName,
        'Relationship': r.contactRelationship,
        'Subject': r.subject,
        'Summary': r.summary,
        'Outcome': r.outcome || '',
        'Staff Member': r.staffMember,
        'Follow-up Required': r.followUpRequired ? 'Yes' : 'No',
        'Follow-up Date': r.followUpDate ? new Date(r.followUpDate).toLocaleDateString() : '',
      };
    });

    const format = options.format || 'xlsx';
    const filename = options.filename || `communications_${this.getDateString()}`;

    if (format === 'csv') {
      this.exportCSV(exportData, filename, true);
    } else {
      this.exportExcel(exportData, filename);
    }
  }

  // Export multi-sheet Excel workbook with all student data
  async exportStudentPortfolio(studentId: string): Promise<void> {
    const student = await db.students.get(studentId);
    if (!student) throw new Error('Student not found');

    const [attendance, grades, assessments, interventions, communications] = await Promise.all([
      db.attendance.where('studentId').equals(studentId).toArray(),
      db.grades.where('studentId').equals(studentId).toArray(),
      db.assessments.where('studentId').equals(studentId).toArray(),
      db.interventions.where('studentId').equals(studentId).toArray(),
      db.communications.where('studentId').equals(studentId).toArray(),
    ]);

    const workbook = XLSX.utils.book_new();

    // Student Info sheet
    const studentInfo = [{
      'Field': 'Student ID', 'Value': student.studentNumber
    }, {
      'Field': 'Name', 'Value': `${student.firstName} ${student.lastName}`
    }, {
      'Field': 'Grade', 'Value': student.grade
    }, {
      'Field': 'Homeroom', 'Value': student.className
    }, {
      'Field': 'Date of Birth', 'Value': student.dateOfBirth
    }];
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(studentInfo), 'Student Info');

    // Attendance sheet
    if (attendance.length > 0) {
      const attendanceData = attendance.map(a => ({
        'Date': new Date(a.date).toLocaleDateString(),
        'Status': a.status,
        'Periods Absent': a.periodsAbsent || 0,
      }));
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(attendanceData), 'Attendance');
    }

    // Grades sheet
    if (grades.length > 0) {
      const gradesData = grades.map(g => ({
        'Course': g.course,
        'Grade': g.grade,
        'Term': g.term || '',
      }));
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(gradesData), 'Grades');
    }

    // Assessments sheet
    if (assessments.length > 0) {
      const assessData = assessments.map(a => ({
        'Source': a.source,
        'Subject': a.subject,
        'Date': a.testDate ? new Date(a.testDate).toLocaleDateString() : '',
        'Score': a.score ?? '',
        'Percentile': a.percentile ?? '',
        'Level': a.performanceLevel ?? '',
      }));
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(assessData), 'Assessments');
    }

    // Interventions sheet
    if (interventions.length > 0) {
      const intData = interventions.map(i => ({
        'Title': i.title,
        'Type': i.type,
        'Status': i.status,
        'Start Date': new Date(i.startDate).toLocaleDateString(),
        'Staff': i.staffResponsible,
      }));
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(intData), 'Interventions');
    }

    // Communications sheet
    if (communications.length > 0) {
      const commData = communications.map(c => ({
        'Date': new Date(c.communicationDate).toLocaleDateString(),
        'Type': c.type,
        'Contact': c.contactName,
        'Subject': c.subject,
        'Staff': c.staffMember,
      }));
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(commData), 'Communications');
    }

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `${student.firstName}_${student.lastName}_portfolio_${this.getDateString()}.xlsx`);
  }

  private getDateString(): string {
    return new Date().toISOString().split('T')[0];
  }
}

export const exportService = new ExportService();
