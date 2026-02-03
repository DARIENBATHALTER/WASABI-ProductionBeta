import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  Phone,
  Mail,
  User,
  Home,
  Plus,
  Search,
  Filter,
  ChevronRight,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { communicationService } from '../services/communicationService';
import { db } from '../lib/db';
import type { CommunicationLog } from '../lib/db';
import { useAnonymizer } from '../contexts/AnonymizerContext';

const COMMUNICATION_TYPES = {
  phone_call: { label: 'Phone Call', icon: Phone, color: 'bg-blue-500' },
  email: { label: 'Email', icon: Mail, color: 'bg-purple-500' },
  in_person: { label: 'In Person', icon: User, color: 'bg-green-500' },
  text_message: { label: 'Text Message', icon: MessageSquare, color: 'bg-cyan-500' },
  home_visit: { label: 'Home Visit', icon: Home, color: 'bg-orange-500' },
  other: { label: 'Other', icon: MessageSquare, color: 'bg-gray-500' },
};

export default function CommunicationsPage() {
  const navigate = useNavigate();
  const { formatStudentName } = useAnonymizer();
  const [communications, setCommunications] = useState<CommunicationLog[]>([]);
  const [students, setStudents] = useState<Map<string, any>>(new Map());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterFollowUp, setFilterFollowUp] = useState<boolean | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    studentId: '',
    type: 'phone_call' as CommunicationLog['type'],
    contactName: '',
    contactRelationship: '',
    direction: 'outgoing' as 'outgoing' | 'incoming',
    subject: '',
    summary: '',
    outcome: '',
    followUpRequired: false,
    followUpDate: '',
    staffMember: '',
    communicationDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [commsData, studentsData, summaryData] = await Promise.all([
        communicationService.getAllCommunications(),
        db.students.toArray(),
        communicationService.getSchoolWideSummary(),
      ]);

      setCommunications(commsData);
      setSummary(summaryData);

      const studentMap = new Map();
      studentsData.forEach(s => studentMap.set(s.id, s));
      setStudents(studentMap);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStudentName = (studentId: string) => {
    const student = students.get(studentId);
    if (!student) return 'Unknown Student';
    return formatStudentName(student.firstName, student.lastName, studentId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await communicationService.createCommunication({
        ...formData,
        communicationDate: new Date(formData.communicationDate),
        followUpDate: formData.followUpDate ? new Date(formData.followUpDate) : undefined,
      });
      setShowForm(false);
      setFormData({
        studentId: '',
        type: 'phone_call',
        contactName: '',
        contactRelationship: '',
        direction: 'outgoing',
        subject: '',
        summary: '',
        outcome: '',
        followUpRequired: false,
        followUpDate: '',
        staffMember: '',
        communicationDate: new Date().toISOString().split('T')[0],
      });
      loadData();
    } catch (error) {
      console.error('Failed to create communication:', error);
    }
  };

  const filteredCommunications = communications.filter(c => {
    if (filterType && c.type !== filterType) return false;
    if (filterFollowUp !== null && c.followUpRequired !== filterFollowUp) return false;
    if (searchQuery) {
      const studentName = getStudentName(c.studentId).toLowerCase();
      const contactName = c.contactName.toLowerCase();
      const subject = c.subject.toLowerCase();
      const query = searchQuery.toLowerCase();
      return studentName.includes(query) || contactName.includes(query) || subject.includes(query);
    }
    return true;
  });

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin w-8 h-8 border-2 border-wasabi-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-wasabi-500/10 rounded-lg flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-wasabi-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Communication Log</h1>
            <p className="text-gray-400 text-sm">Track parent and guardian communications</p>
          </div>
        </div>

        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-wasabi-500 hover:bg-wasabi-600 text-white rounded-lg transition"
        >
          <Plus className="w-4 h-4" />
          Log Communication
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{summary.totalCommunications}</div>
                <div className="text-sm text-gray-400">Total Communications</div>
              </div>
            </div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                <User className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{summary.totalStudentsContacted}</div>
                <div className="text-sm text-gray-400">Families Contacted</div>
              </div>
            </div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{summary.recentCount}</div>
                <div className="text-sm text-gray-400">This Week</div>
              </div>
            </div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{summary.pendingFollowUps}</div>
                <div className="text-sm text-gray-400">Pending Follow-ups</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by student, contact, or subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-wasabi-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-wasabi-500"
          >
            <option value="">All Types</option>
            {Object.entries(COMMUNICATION_TYPES).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <select
            value={filterFollowUp === null ? '' : filterFollowUp ? 'yes' : 'no'}
            onChange={(e) => setFilterFollowUp(e.target.value === '' ? null : e.target.value === 'yes')}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-wasabi-500"
          >
            <option value="">All Follow-ups</option>
            <option value="yes">Needs Follow-up</option>
            <option value="no">No Follow-up</option>
          </select>
        </div>
      </div>

      {/* Communications List */}
      <div className="space-y-3">
        {filteredCommunications.length === 0 ? (
          <div className="bg-gray-800 rounded-xl p-8 text-center border border-gray-700">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-600" />
            <p className="text-gray-400">No communications found</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 px-4 py-2 bg-wasabi-500 hover:bg-wasabi-600 text-white rounded-lg transition"
            >
              Log First Communication
            </button>
          </div>
        ) : (
          filteredCommunications.map((comm) => {
            const typeInfo = COMMUNICATION_TYPES[comm.type];
            const TypeIcon = typeInfo.icon;

            return (
              <div
                key={comm.id}
                className="bg-gray-800 rounded-xl p-4 border border-gray-700 hover:border-gray-600 transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${typeInfo.color}`}>
                      <TypeIcon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-white">{comm.subject}</h3>
                        {comm.followUpRequired && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium text-orange-400 bg-orange-400/10">
                            Follow-up needed
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400">
                        {getStudentName(comm.studentId)} • {comm.contactName} ({comm.contactRelationship})
                      </p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(comm.communicationDate).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {comm.staffMember}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-xs ${
                          comm.direction === 'outgoing' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
                        }`}>
                          {comm.direction === 'outgoing' ? 'Outgoing' : 'Incoming'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-sm text-gray-400">
                    <p className="line-clamp-2 max-w-xs">{comm.summary}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* New Communication Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-700">
            <h2 className="text-xl font-bold text-white mb-4">Log New Communication</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Student</label>
                  <select
                    value={formData.studentId}
                    onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-wasabi-500"
                  >
                    <option value="">Select student...</option>
                    {Array.from(students.entries()).map(([id, student]) => (
                      <option key={id} value={id}>
                        {formatStudentName(student.firstName, student.lastName, id)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as CommunicationLog['type'] })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-wasabi-500"
                  >
                    {Object.entries(COMMUNICATION_TYPES).map(([key, { label }]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Contact Name</label>
                  <input
                    type="text"
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                    required
                    placeholder="e.g., Maria Garcia"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-wasabi-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Relationship</label>
                  <input
                    type="text"
                    value={formData.contactRelationship}
                    onChange={(e) => setFormData({ ...formData, contactRelationship: e.target.value })}
                    required
                    placeholder="e.g., Mother, Father, Guardian"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-wasabi-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Direction</label>
                  <select
                    value={formData.direction}
                    onChange={(e) => setFormData({ ...formData, direction: e.target.value as 'outgoing' | 'incoming' })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-wasabi-500"
                  >
                    <option value="outgoing">Outgoing (we contacted them)</option>
                    <option value="incoming">Incoming (they contacted us)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Date</label>
                  <input
                    type="date"
                    value={formData.communicationDate}
                    onChange={(e) => setFormData({ ...formData, communicationDate: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-wasabi-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Subject</label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  required
                  placeholder="Brief subject of communication"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-wasabi-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Summary</label>
                <textarea
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  required
                  rows={3}
                  placeholder="Details of what was discussed..."
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-wasabi-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Outcome/Result</label>
                <input
                  type="text"
                  value={formData.outcome}
                  onChange={(e) => setFormData({ ...formData, outcome: e.target.value })}
                  placeholder="What was the result of this communication?"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-wasabi-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Staff Member</label>
                <input
                  type="text"
                  value={formData.staffMember}
                  onChange={(e) => setFormData({ ...formData, staffMember: e.target.value })}
                  required
                  placeholder="Who made/received this communication?"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-wasabi-500"
                />
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.followUpRequired}
                    onChange={(e) => setFormData({ ...formData, followUpRequired: e.target.checked })}
                    className="rounded border-gray-600 text-wasabi-500 focus:ring-wasabi-500"
                  />
                  <span className="text-sm text-gray-300">Follow-up required</span>
                </label>

                {formData.followUpRequired && (
                  <div className="flex-1">
                    <input
                      type="date"
                      value={formData.followUpDate}
                      onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-wasabi-500"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-wasabi-500 hover:bg-wasabi-600 text-white rounded-lg transition"
                >
                  Save Communication
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
