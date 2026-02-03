import { useState } from 'react';
import {
  X,
  Download,
  FileText,
  Flag,
  MessageSquare,
  Heart,
  CheckSquare,
  Users
} from 'lucide-react';
import { exportService } from '../../services/exportService';
import type { StudentSearchResult } from '../../hooks/useStudentSearch';

interface BulkActionsBarProps {
  selectedStudents: StudentSearchResult[];
  onClearSelection: () => void;
  onViewProfiles?: (students: StudentSearchResult[]) => void;
}

export default function BulkActionsBar({
  selectedStudents,
  onClearSelection,
  onViewProfiles
}: BulkActionsBarProps) {
  const [exporting, setExporting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  if (selectedStudents.length === 0) return null;

  const handleExport = async (format: 'csv' | 'xlsx') => {
    setExporting(true);
    try {
      // Map search results to student format for export
      const studentData = selectedStudents.map(s => ({
        studentNumber: s.studentNumber,
        firstName: s.firstName,
        lastName: s.lastName,
        grade: s.grade,
        gender: s.gender,
        className: s.className,
        dateOfBirth: '',
      }));

      exportService.exportData(
        studentData,
        [
          { key: 'studentNumber', label: 'Student ID' },
          { key: 'firstName', label: 'First Name' },
          { key: 'lastName', label: 'Last Name' },
          { key: 'grade', label: 'Grade' },
          { key: 'gender', label: 'Gender' },
          { key: 'className', label: 'Homeroom' },
        ],
        {
          format,
          filename: `selected_students_${new Date().toISOString().split('T')[0]}`,
        }
      );
    } finally {
      setExporting(false);
      setShowExportMenu(false);
    }
  };

  const handleExportPortfolios = async () => {
    setExporting(true);
    try {
      // Export each student's portfolio
      for (const student of selectedStudents) {
        await exportService.exportStudentPortfolio(student.id);
      }
    } catch (error) {
      console.error('Failed to export portfolios:', error);
    } finally {
      setExporting(false);
      setShowExportMenu(false);
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="bg-gray-800 border border-gray-600 rounded-xl shadow-2xl px-4 py-3 flex items-center gap-4">
        {/* Selection count */}
        <div className="flex items-center gap-2 text-white border-r border-gray-600 pr-4">
          <CheckSquare className="w-5 h-5 text-wasabi-500" />
          <span className="font-medium">{selectedStudents.length} selected</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* View Profiles */}
          {onViewProfiles && (
            <button
              onClick={() => onViewProfiles(selectedStudents)}
              className="flex items-center gap-2 px-3 py-2 bg-wasabi-500 hover:bg-wasabi-600 text-white rounded-lg transition text-sm font-medium"
            >
              <Users className="w-4 h-4" />
              View Profiles
            </button>
          )}

          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={exporting}
              className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition text-sm font-medium disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {exporting ? 'Exporting...' : 'Export'}
            </button>

            {showExportMenu && (
              <div className="absolute bottom-full mb-2 left-0 bg-gray-700 border border-gray-600 rounded-lg shadow-xl overflow-hidden min-w-[180px]">
                <button
                  onClick={() => handleExport('xlsx')}
                  className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-600 flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Export to Excel
                </button>
                <button
                  onClick={() => handleExport('csv')}
                  className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-600 flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Export to CSV
                </button>
                <div className="border-t border-gray-600" />
                <button
                  onClick={handleExportPortfolios}
                  className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-600 flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export Portfolios
                </button>
              </div>
            )}
          </div>

          {/* Generate Reports */}
          <button
            onClick={() => {
              // Navigate to reports with selected students
              window.location.href = `/reports?students=${selectedStudents.map(s => s.id).join(',')}`;
            }}
            className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition text-sm font-medium"
          >
            <FileText className="w-4 h-4" />
            Reports
          </button>
        </div>

        {/* Clear selection */}
        <button
          onClick={onClearSelection}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition"
          title="Clear selection"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
