import { useState, useEffect } from 'react';
import {
  Database,
  Trash2,
  Download,
  RefreshCw,
  AlertTriangle,
  HardDrive,
  Settings,
  Play
} from 'lucide-react';
import { dataRetentionService } from '../../services/dataRetentionService';
import { exportService } from '../../services/exportService';
import { ConfirmDialog } from '../../shared/components/Modal';
import { resetTour } from '../../shared/components/OnboardingTour';

interface StorageStats {
  totalRecords: number;
  byTable: Record<string, number>;
  estimatedSizeMB: number;
}

export default function StorageManagement() {
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [actualUsage, setActualUsage] = useState<{ usage: number; quota: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [cleanupPreview, setCleanupPreview] = useState<any>(null);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [policy, setPolicy] = useState(dataRetentionService.getPolicy());
  const [policyChanged, setPolicyChanged] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const [storageStats, usage] = await Promise.all([
        dataRetentionService.getStorageStats(),
        dataRetentionService.getActualStorageUsage(),
      ]);
      setStats(storageStats);
      setActualUsage(usage);
    } catch (error) {
      console.error('Failed to load storage stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewCleanup = async () => {
    const preview = await dataRetentionService.cleanupOldData(true);
    setCleanupPreview(preview);
  };

  const handleRunCleanup = async () => {
    setIsCleaningUp(true);
    try {
      await dataRetentionService.cleanupOldData(false);
      await loadStats();
      setCleanupPreview(null);
    } finally {
      setIsCleaningUp(false);
    }
  };

  const handleClearAllData = async () => {
    await dataRetentionService.clearAllData();
    await loadStats();
    setShowClearConfirm(false);
  };

  const handleSavePolicy = () => {
    dataRetentionService.savePolicy(policy);
    setPolicyChanged(false);
  };

  const handleRestartTour = () => {
    resetTour();
    window.location.reload();
  };

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-wasabi-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Storage Overview */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <HardDrive className="w-5 h-5 text-wasabi-500" />
            <h3 className="text-lg font-semibold text-white">Storage Overview</h3>
          </div>
          <button
            onClick={loadStats}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {actualUsage && (
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-400">Storage Used</span>
              <span className="text-white">
                {formatBytes(actualUsage.usage)} / {formatBytes(actualUsage.quota)}
              </span>
            </div>
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-wasabi-500 rounded-full"
                style={{ width: `${(actualUsage.usage / actualUsage.quota) * 100}%` }}
              />
            </div>
          </div>
        )}

        {stats && (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-700/50 rounded-lg p-3">
              <div className="text-2xl font-bold text-white">{stats.totalRecords.toLocaleString()}</div>
              <div className="text-sm text-gray-400">Total Records</div>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-3">
              <div className="text-2xl font-bold text-white">{stats.estimatedSizeMB.toFixed(1)} MB</div>
              <div className="text-sm text-gray-400">Estimated Size</div>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-3">
              <div className="text-2xl font-bold text-white">{Object.keys(stats.byTable).length}</div>
              <div className="text-sm text-gray-400">Data Tables</div>
            </div>
          </div>
        )}

        {/* Records by Table */}
        {stats && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <h4 className="text-sm font-medium text-gray-400 mb-2">Records by Table</h4>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(stats.byTable).map(([table, count]) => (
                <div key={table} className="flex justify-between text-sm">
                  <span className="text-gray-400 capitalize">{table}</span>
                  <span className="text-white">{count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Retention Policy */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div className="flex items-center gap-3 mb-4">
          <Settings className="w-5 h-5 text-wasabi-500" />
          <h3 className="text-lg font-semibold text-white">Retention Policy</h3>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Assessments (days)</label>
            <input
              type="number"
              value={policy.assessments}
              onChange={(e) => {
                setPolicy({ ...policy, assessments: parseInt(e.target.value) || 365 });
                setPolicyChanged(true);
              }}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Attendance (days)</label>
            <input
              type="number"
              value={policy.attendance}
              onChange={(e) => {
                setPolicy({ ...policy, attendance: parseInt(e.target.value) || 365 });
                setPolicyChanged(true);
              }}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Audit Logs (days)</label>
            <input
              type="number"
              value={policy.auditLogs}
              onChange={(e) => {
                setPolicy({ ...policy, auditLogs: parseInt(e.target.value) || 365 });
                setPolicyChanged(true);
              }}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Communications (days)</label>
            <input
              type="number"
              value={policy.communications}
              onChange={(e) => {
                setPolicy({ ...policy, communications: parseInt(e.target.value) || 365 });
                setPolicyChanged(true);
              }}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            />
          </div>
        </div>

        {policyChanged && (
          <button
            onClick={handleSavePolicy}
            className="px-4 py-2 bg-wasabi-500 hover:bg-wasabi-600 text-white rounded-lg transition"
          >
            Save Policy
          </button>
        )}
      </div>

      {/* Data Cleanup */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div className="flex items-center gap-3 mb-4">
          <Trash2 className="w-5 h-5 text-wasabi-500" />
          <h3 className="text-lg font-semibold text-white">Data Cleanup</h3>
        </div>

        <p className="text-gray-400 text-sm mb-4">
          Clean up old data based on your retention policy. This permanently removes records older than the specified days.
        </p>

        <div className="flex gap-3 mb-4">
          <button
            onClick={handlePreviewCleanup}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
          >
            <Database className="w-4 h-4" />
            Preview Cleanup
          </button>

          {cleanupPreview && cleanupPreview.total > 0 && (
            <button
              onClick={handleRunCleanup}
              disabled={isCleaningUp}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition disabled:opacity-50"
            >
              {isCleaningUp ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              Run Cleanup
            </button>
          )}
        </div>

        {cleanupPreview && (
          <div className="bg-gray-700/50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-white mb-2">Cleanup Preview</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Assessments:</span>
                <span className="text-white">{cleanupPreview.assessments}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Attendance:</span>
                <span className="text-white">{cleanupPreview.attendance}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Audit Logs:</span>
                <span className="text-white">{cleanupPreview.auditLogs}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Communications:</span>
                <span className="text-white">{cleanupPreview.communications}</span>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-gray-600 flex justify-between font-medium">
              <span className="text-gray-300">Total to remove:</span>
              <span className="text-white">{cleanupPreview.total}</span>
            </div>
          </div>
        )}
      </div>

      {/* Danger Zone */}
      <div className="bg-red-900/20 rounded-xl p-6 border border-red-800">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <h3 className="text-lg font-semibold text-red-400">Danger Zone</h3>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-white font-medium">Clear All Student Data</h4>
              <p className="text-gray-400 text-sm">Permanently remove all student records and related data.</p>
            </div>
            <button
              onClick={() => setShowClearConfirm(true)}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition"
            >
              Clear All Data
            </button>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-red-800/50">
            <div>
              <h4 className="text-white font-medium">Restart Onboarding Tour</h4>
              <p className="text-gray-400 text-sm">Show the welcome tour again on next page load.</p>
            </div>
            <button
              onClick={handleRestartTour}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
            >
              Restart Tour
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={handleClearAllData}
        title="Clear All Data?"
        message="This will permanently delete all student records, attendance, grades, assessments, interventions, and communications. This action cannot be undone."
        confirmText="Delete Everything"
        variant="danger"
      />
    </div>
  );
}
