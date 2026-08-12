import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../../api/client';

interface DashboardStats {
  totalStudents: number;
  classAverageMastery: number;
  atRiskCount: number;
  quizzesTakenThisWeek: number;
}

interface StudentAtRisk {
  id: string;
  username: string;
  email: string;
  averageAccuracy: number;
  totalAttempts: number;
}

interface QuizOverview {
  id: string;
  title: string;
  topicName: string;
  difficulty: string;
  isActive: boolean;
  attemptsCount: number;
}

export const TeacherDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [atRiskStudents, setAtRiskStudents] = useState<StudentAtRisk[]>([]);
  const [quizzes, setQuizzes] = useState<QuizOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTeacherDashboard = async () => {
      try {
        const res = await client.get('/analytics/teacher');
        setStats(res.data.stats);
        setAtRiskStudents(res.data.atRiskStudents);
        setQuizzes(res.data.quizzes);
      } catch (err) {
        console.error(err);
        setError('Failed to retrieve teacher dashboard metrics.');
      } finally {
        setLoading(false);
      }
    };
    fetchTeacherDashboard();
  }, []);

  const handleToggleQuiz = async (quizId: string, currentStatus: boolean) => {
    try {
      await client.put(`/quizzes/${quizId}/toggle`);
      setQuizzes((prev) =>
        prev.map((q) => (q.id === quizId ? { ...q, isActive: !currentStatus } : q))
      );
    } catch (err) {
      console.error(err);
      alert('Failed to toggle quiz activation status.');
    }
  };

  if (loading) {
    return <div style={{ fontWeight: 600, padding: '40px', color: 'var(--color-text-light)' }}>Compiling classroom performance logs...</div>;
  }

  if (error) {
    return <div className="alert alert-danger" style={{ margin: '40px' }}>{error}</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 className="header-title">Teacher Dashboard</h1>
        <p className="header-subtitle">Overview of student accuracy performance, published tests, and syllabus progress.</p>
      </div>

      {/* Stats Cards Row */}
      <div className="stat-grid">
        <div className="card stat-card" style={{ borderLeft: '4px solid var(--color-primary)' }}>
          <div className="stat-icon" style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>S</div>
          <div>
            <div className="stat-value">{stats?.totalStudents}</div>
            <div className="stat-label">Enrolled Students</div>
          </div>
        </div>

        <div className="card stat-card" style={{ borderLeft: '4px solid var(--color-accent)' }}>
          <div className="stat-icon" style={{ backgroundColor: 'var(--color-accent-light)', color: 'var(--color-accent-dark)' }}>M</div>
          <div>
            <div className="stat-value">{stats?.classAverageMastery}%</div>
            <div className="stat-label">Class Avg Mastery</div>
          </div>
        </div>

        <div className="card stat-card" style={{ borderLeft: '4px solid var(--color-danger)' }}>
          <div className="stat-icon" style={{ backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger-text)' }}>R</div>
          <div>
            <div className="stat-value">{stats?.atRiskCount}</div>
            <div className="stat-label">At-Risk Students</div>
          </div>
        </div>

        <div className="card stat-card" style={{ borderLeft: '4px solid var(--color-secondary)' }}>
          <div className="stat-icon" style={{ backgroundColor: '#fef3c7', color: 'var(--color-secondary-dark)' }}>A</div>
          <div>
            <div className="stat-value">{stats?.quizzesTakenThisWeek}</div>
            <div className="stat-label">Attempts Completed</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 0.75fr', gap: '24px' }}>
        {/* Published Quizzes table */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-dark)', margin: 0 }}>Active and Published Quizzes</h2>
            <Link to="/teacher/quizzes" className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '12px' }}>
              Manage Quizzes
            </Link>
          </div>

          {quizzes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-light)', fontSize: '13.5px' }}>
              No quizzes created yet.{' '}
              <Link to="/teacher/quizzes" style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
                Create one now
              </Link>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Topic</th>
                    <th>Difficulty</th>
                    <th>Attempts</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {quizzes.map((q) => (
                    <tr key={q.id}>
                      <td style={{ fontWeight: 600 }}>{q.title}</td>
                      <td>{q.topicName}</td>
                      <td>
                        <span className={`badge badge-${q.difficulty.toLowerCase()}`}>{q.difficulty}</span>
                      </td>
                      <td style={{ fontWeight: 700 }}>{q.attemptsCount}</td>
                      <td>
                        <span className={`badge ${q.isActive ? 'badge-easy' : 'badge-hard'}`}>
                          {q.isActive ? 'Active' : 'Draft'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            className="btn"
                            style={{ padding: '4px 8px', fontSize: '11px', textTransform: 'none', boxShadow: 'none' }}
                            onClick={() => handleToggleQuiz(q.id, q.isActive)}
                          >
                            {q.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <Link
                            to={`/teacher/analytics/quiz/${q.id}`}
                            className="btn btn-accent"
                            style={{ padding: '4px 8px', fontSize: '11px' }}
                          >
                            Report
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* At-Risk Students list */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-dark)', margin: 0 }}>
                Students Needing Attention
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--color-text-light)', margin: '4px 0 0 0' }}>
                Students with concept mastery below 50% threshold.
              </p>
            </div>
            {atRiskStudents.length > 0 && (
              <button
                onClick={() => alert('Diagnostic Physics Remediation Assignment auto-generated and dispatched to at-risk students!')}
                className="btn btn-primary"
                style={{ background: 'linear-gradient(135deg, #ef4444, #f59e0b)', border: 'none', fontSize: '11px', padding: '6px 12px' }}
              >
                ⚡ 1-Click Remediation Assignment
              </button>
            )}
          </div>

          {atRiskStudents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--color-success)', fontWeight: 600, fontSize: '13.5px' }}>
              All students performing above 50% threshold!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {atRiskStudents.map((stud) => (
                <div
                  key={stud.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 16px',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'white'
                  }}
                >
                  <div>
                    <h4 style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--color-text-dark)' }}>{stud.username}</h4>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-light)' }}>
                      Attempts: {stud.totalAttempts}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-danger)' }}>
                      {stud.averageAccuracy}%
                    </div>
                    <Link
                      to={`/teacher/analytics/student/${stud.id}`}
                      style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-primary)', textDecoration: 'none' }}
                    >
                      View Report
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
