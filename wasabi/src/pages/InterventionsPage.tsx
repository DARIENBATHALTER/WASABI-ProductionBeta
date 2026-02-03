import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Heart,
  Target,
  Plus,
  Search,
  Filter,
  ChevronRight,
  Calendar,
  User,
  CheckCircle,
  Clock,
  AlertCircle,
  TrendingUp
} from 'lucide-react';
import { interventionService } from '../services/interventionService';
import { db } from '../lib/db';
import type { Intervention, StudentGoal } from '../lib/db';
import { useAnonymizer } from '../contexts/AnonymizerContext';

const INTERVENTION_TYPES = {
  tutoring: { label: 'Tutoring', color: 'bg-blue-500' },
  counseling: { label: 'Counseling', color: 'bg-purple-500' },
  parent_conference: { label: 'Parent Conference', color: 'bg-yellow-500' },
  behavior_plan: { label: 'Behavior Plan', color: 'bg-red-500' },
  academic_support: { label: 'Academic Support', color: 'bg-green-500' },
  mentoring: { label: 'Mentoring', color: 'bg-cyan-500' },
  other: { label: 'Other', color: 'bg-gray-500' },
};

const STATUS_STYLES = {
  active: { label: 'Active', color: 'text-green-400 bg-green-400/10' },
  completed: { label: 'Completed', color: 'text-blue-400 bg-blue-400/10' },
  paused: { label: 'Paused', color: 'text-yellow-400 bg-yellow-400/10' },
  discontinued: { label: 'Discontinued', color: 'text-gray-400 bg-gray-400/10' },
};

export default function InterventionsPage() {
  const navigate = useNavigate();
  const { formatStudentName } = useAnonymizer();
  const [activeTab, setActiveTab] = useState<'interventions' | 'goals'>('interventions');
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [goals, setGoals] = useState<StudentGoal[]>([]);
  const [students, setStudents] = useState<Map<string, any>>(new Map());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [interventionsData, goalsData, studentsData, summaryData] = await Promise.all([
        interventionService.getAllInterventions(),
        interventionService.getAllGoals(),
        db.students.toArray(),
        interventionService.getSchoolWideSummary(),
      ]);

      setInterventions(interventionsData);
      setGoals(goalsData);
      setSummary(summaryData);

      // Build student lookup map
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

  const filteredInterventions = interventions.filter(i => {
    if (filterStatus && i.status !== filterStatus) return false;
    if (searchQuery) {
      const studentName = getStudentName(i.studentId).toLowerCase();
      const title = i.title.toLowerCase();
      const query = searchQuery.toLowerCase();
      return studentName.includes(query) || title.includes(query);
    }
    return true;
  });

  const filteredGoals = goals.filter(g => {
    if (filterStatus && g.status !== filterStatus) return false;
    if (searchQuery) {
      const studentName = getStudentName(g.studentId).toLowerCase();
      const title = g.title.toLowerCase();
      const query = searchQuery.toLowerCase();
      return studentName.includes(query) || title.includes(query);
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
            <Heart className="w-5 h-5 text-wasabi-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Interventions & Goals</h1>
            <p className="text-gray-400 text-sm">Track student support and progress</p>
          </div>
        </div>

        <button
          onClick={() => navigate(activeTab === 'interventions' ? '/interventions/new' : '/goals/new')}
          className="flex items-center gap-2 px-4 py-2 bg-wasabi-500 hover:bg-wasabi-600 text-white rounded-lg transition"
        >
          <Plus className="w-4 h-4" />
          New {activeTab === 'interventions' ? 'Intervention' : 'Goal'}
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                <Heart className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{summary.totalActiveInterventions}</div>
                <div className="text-sm text-gray-400">Active Interventions</div>
              </div>
            </div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <User className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{summary.totalStudentsWithInterventions}</div>
                <div className="text-sm text-gray-400">Students Supported</div>
              </div>
            </div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                <Target className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{summary.totalActiveGoals}</div>
                <div className="text-sm text-gray-400">Active Goals</div>
              </div>
            </div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-wasabi-500/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-wasabi-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {goals.filter(g => g.status === 'achieved').length}
                </div>
                <div className="text-sm text-gray-400">Goals Achieved</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveTab('interventions')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            activeTab === 'interventions'
              ? 'bg-wasabi-500 text-white'
              : 'bg-gray-800 text-gray-400 hover:text-white'
          }`}
        >
          <Heart className="w-4 h-4 inline mr-2" />
          Interventions ({interventions.length})
        </button>
        <button
          onClick={() => setActiveTab('goals')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            activeTab === 'goals'
              ? 'bg-wasabi-500 text-white'
              : 'bg-gray-800 text-gray-400 hover:text-white'
          }`}
        >
          <Target className="w-4 h-4 inline mr-2" />
          Goals ({goals.length})
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by student name or title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-wasabi-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-wasabi-500"
          >
            <option value="">All Status</option>
            {activeTab === 'interventions' ? (
              <>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="paused">Paused</option>
                <option value="discontinued">Discontinued</option>
              </>
            ) : (
              <>
                <option value="not_started">Not Started</option>
                <option value="in_progress">In Progress</option>
                <option value="achieved">Achieved</option>
                <option value="missed">Missed</option>
              </>
            )}
          </select>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'interventions' ? (
        <div className="space-y-3">
          {filteredInterventions.length === 0 ? (
            <div className="bg-gray-800 rounded-xl p-8 text-center border border-gray-700">
              <Heart className="w-12 h-12 mx-auto mb-4 text-gray-600" />
              <p className="text-gray-400">No interventions found</p>
              <button
                onClick={() => navigate('/interventions/new')}
                className="mt-4 px-4 py-2 bg-wasabi-500 hover:bg-wasabi-600 text-white rounded-lg transition"
              >
                Create First Intervention
              </button>
            </div>
          ) : (
            filteredInterventions.map((intervention) => (
              <div
                key={intervention.id}
                className="bg-gray-800 rounded-xl p-4 border border-gray-700 hover:border-gray-600 cursor-pointer transition"
                onClick={() => navigate(`/interventions/${intervention.id}`)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-2 h-12 rounded-full ${INTERVENTION_TYPES[intervention.type].color}`} />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-white">{intervention.title}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[intervention.status].color}`}>
                          {STATUS_STYLES[intervention.status].label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400">
                        {getStudentName(intervention.studentId)} • {INTERVENTION_TYPES[intervention.type].label}
                      </p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Started {new Date(intervention.startDate).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {intervention.staffResponsible}
                        </span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-500" />
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredGoals.length === 0 ? (
            <div className="bg-gray-800 rounded-xl p-8 text-center border border-gray-700">
              <Target className="w-12 h-12 mx-auto mb-4 text-gray-600" />
              <p className="text-gray-400">No goals found</p>
              <button
                onClick={() => navigate('/goals/new')}
                className="mt-4 px-4 py-2 bg-wasabi-500 hover:bg-wasabi-600 text-white rounded-lg transition"
              >
                Create First Goal
              </button>
            </div>
          ) : (
            filteredGoals.map((goal) => {
              const progress = ((goal.currentValue - goal.baselineValue) / (goal.targetValue - goal.baselineValue)) * 100;
              const clampedProgress = Math.max(0, Math.min(100, progress));

              return (
                <div
                  key={goal.id}
                  className="bg-gray-800 rounded-xl p-4 border border-gray-700 hover:border-gray-600 cursor-pointer transition"
                  onClick={() => navigate(`/goals/${goal.id}`)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-white">{goal.title}</h3>
                        {goal.status === 'achieved' && (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        )}
                        {goal.status === 'in_progress' && (
                          <Clock className="w-4 h-4 text-yellow-500" />
                        )}
                        {goal.status === 'missed' && (
                          <AlertCircle className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                      <p className="text-sm text-gray-400">
                        {getStudentName(goal.studentId)} • {goal.category.replace('_', ' ')}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-white">
                        {goal.currentValue} / {goal.targetValue} {goal.unit}
                      </div>
                      <div className="text-xs text-gray-500">
                        Target: {new Date(goal.targetDate).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        goal.status === 'achieved' ? 'bg-green-500' :
                        clampedProgress >= 75 ? 'bg-wasabi-500' :
                        clampedProgress >= 50 ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${clampedProgress}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
