import { useState, useEffect } from 'react';
import {
  Shield,
  Eye,
  Download,
  Upload,
  LogIn,
  LogOut,
  Edit,
  Trash2,
  Plus,
  ChevronLeft,
  ChevronRight,
  Filter,
  Calendar
} from 'lucide-react';
import { auditService } from '../../services/auditService';
import type { AuditLog } from '../../lib/db';

const ACTION_ICONS: Record<AuditLog['action'], React.ReactNode> = {
  view: <Eye className="w-4 h-4" />,
  create: <Plus className="w-4 h-4" />,
  update: <Edit className="w-4 h-4" />,
  delete: <Trash2 className="w-4 h-4" />,
  export: <Download className="w-4 h-4" />,
  import: <Upload className="w-4 h-4" />,
  login: <LogIn className="w-4 h-4" />,
  logout: <LogOut className="w-4 h-4" />,
};

const ACTION_COLORS: Record<AuditLog['action'], string> = {
  view: 'text-blue-400 bg-blue-400/10',
  create: 'text-green-400 bg-green-400/10',
  update: 'text-yellow-400 bg-yellow-400/10',
  delete: 'text-red-400 bg-red-400/10',
  export: 'text-purple-400 bg-purple-400/10',
  import: 'text-cyan-400 bg-cyan-400/10',
  login: 'text-emerald-400 bg-emerald-400/10',
  logout: 'text-gray-400 bg-gray-400/10',
};

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState<AuditLog['action'] | ''>('');
  const [filterEntity, setFilterEntity] = useState<AuditLog['entityType'] | ''>('');
  const pageSize = 25;

  useEffect(() => {
    loadLogs();
  }, [page, filterAction, filterEntity]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const result = await auditService.getLogs({
        limit: pageSize,
        offset: page * pageSize,
        action: filterAction || undefined,
        entityType: filterEntity || undefined,
      });
      setLogs(result.logs);
      setTotal(result.total);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-wasabi-500/10 rounded-lg flex items-center justify-center">
          <Shield className="w-5 h-5 text-wasabi-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Audit Log</h1>
          <p className="text-gray-400 text-sm">Track all user activity and data access</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={filterAction}
            onChange={(e) => {
              setFilterAction(e.target.value as AuditLog['action'] | '');
              setPage(0);
            }}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-wasabi-500"
          >
            <option value="">All Actions</option>
            <option value="view">View</option>
            <option value="create">Create</option>
            <option value="update">Update</option>
            <option value="delete">Delete</option>
            <option value="export">Export</option>
            <option value="import">Import</option>
            <option value="login">Login</option>
            <option value="logout">Logout</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterEntity}
            onChange={(e) => {
              setFilterEntity(e.target.value as AuditLog['entityType'] | '');
              setPage(0);
            }}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-wasabi-500"
          >
            <option value="">All Entity Types</option>
            <option value="student">Student</option>
            <option value="assessment">Assessment</option>
            <option value="observation">Observation</option>
            <option value="report">Report</option>
            <option value="user">User</option>
            <option value="settings">Settings</option>
            <option value="data">Data</option>
          </select>
        </div>

        <div className="ml-auto text-sm text-gray-400">
          {total} total records
        </div>
      </div>

      {/* Log Table */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">
            <div className="animate-spin w-8 h-8 border-2 border-wasabi-500 border-t-transparent rounded-full mx-auto mb-4" />
            Loading audit logs...
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No audit logs found</p>
            <p className="text-sm mt-1">Activity will appear here as users interact with the system</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Timestamp</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">User</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Action</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Entity</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      {formatDate(log.timestamp)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-white">{log.userName}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${ACTION_COLORS[log.action]}`}>
                      {ACTION_ICONS[log.action]}
                      {log.action.charAt(0).toUpperCase() + log.action.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-300 capitalize">{log.entityType}</span>
                    {log.entityId && (
                      <span className="text-xs text-gray-500 ml-1">#{log.entityId.slice(0, 8)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-400">{log.details || '-'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700">
            <div className="text-sm text-gray-400">
              Page {page + 1} of {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-2 rounded-lg bg-gray-700 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-2 rounded-lg bg-gray-700 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
