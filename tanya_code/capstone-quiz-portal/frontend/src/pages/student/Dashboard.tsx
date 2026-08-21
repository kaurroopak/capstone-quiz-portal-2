import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import client from '../../api/client';
import { useAuth } from '../../context/AuthContext';

// ── Mastery color ramp helper ─────────────────
function masteryColor(pct: number): string {
  if (pct >= 80) return 'var(--mastery-100)';
  if (pct >= 60) return 'var(--mastery-80)';
  if (pct >= 40) return 'var(--mastery-60)';
  if (pct >= 20) return 'var(--mastery-40)';
  if (pct > 0)   return 'var(--mastery-20)';
  return 'var(--mastery-0)';
}

function thetaLabel(theta: number): { tier: string; color: string } {
  if (theta >= 1.5) return { tier: 'Expert',      color: 'var(--mastery-100)' };
  if (theta >= 0.8) return { tier: 'Advanced',    color: 'var(--mastery-80)' };
  if (theta >= 0.0) return { tier: 'Proficient',  color: 'var(--mastery-60)' };
  if (theta >= -0.8)return { tier: 'Developing',  color: 'var(--mastery-40)' };
  return              { tier: 'Beginning',  color: 'var(--mastery-20)' };
}

interface TopicInfo {
  topicId: string;
  topicName: string;
  chapterName: string;
  averageScore: number;
  attemptsCount: number;
}

interface DashboardData {
  summary: { totalAttempts: number; averageAccuracy: number; currentStreak: number; totalTimeSpent: number };
  theta: number;
  xp: number;
  learnedTopics: string[];
  lastQuizDelta: string | null;
  strongTopics: TopicInfo[];
  weakTopics: TopicInfo[];
  improvingTopics: TopicInfo[];
  recentActivity: any[];
}

export const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [dashRes, chapRes] = await Promise.all([
          client.get('/analytics/student'),
          client.get('/chapters')
        ]);
        setData(dashRes.data);
        setChapters(chapRes.data);
      } catch (err) {
        console.error(err);
        setError('Failed to load dashboard.');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  if (loading) return <div className="loading animate-fade-in">Loading your progress...</div>;
  if (error || !data) return <div className="alert alert-danger" style={{ margin: '40px' }}>{error || 'Error'}</div>;

  const { tier, color: tierColor } = thetaLabel(data.theta);
  const allTopics: any[] = [];
  chapters.forEach(ch => ch.topics.forEach((t: any) => allTopics.push({ ...t, chapterName: ch.name })));

  // Build per-topic mastery map from analytics
  const masteryMap: Record<string, number> = {};
  [...data.strongTopics, ...data.weakTopics, ...data.improvingTopics].forEach(t => {
    masteryMap[t.topicId] = t.averageScore;
  });

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <div className="animate-fade-in" style={{ padding: '32px 36px', maxWidth: '1100px' }}>

      {/* ── Hero Banner ─────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, var(--paper-2) 0%, #FFFFFF 100%)',
        border: '1px solid var(--border)',
        borderRadius: '18px',
        padding: '28px 32px',
        marginBottom: '28px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
            Class 10 Physics · Adaptive Learning
          </div>
          <h1 className="display-heading" style={{ marginBottom: '6px' }}>
            Welcome back, {user?.username}
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--ink-muted)', fontWeight: 500 }}>
            IRT Ability: <strong style={{ color: tierColor }}>{tier}</strong>
            {' '}(θ = {data.theta >= 0 ? '+' : ''}{data.theta.toFixed(2)}) · {data.xp} XP
          </p>
          {data.lastQuizDelta && (
            <div style={{
              marginTop: '12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'var(--success-bg)',
              border: '1px solid rgba(5,150,105,0.2)',
              borderRadius: '8px',
              padding: '7px 14px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#047857'
            }}>
              <span>📈</span>
              <span>Last session: {data.lastQuizDelta}</span>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
          <Link to="/student/chapters" className="btn btn-primary" style={{ padding: '10px 22px' }}>
            📗 My Modules
          </Link>
          <Link to="/student/skill-tree" className="btn btn-outline" style={{ padding: '10px 18px' }}>
            🌿 Skill Tree
          </Link>
        </div>
      </div>

      {/* ── Stats Row ────────────────────────── */}
      <div className="stat-grid stagger-1">
        {/* IRT Theta */}
        <div className="card" style={{ borderTop: `3px solid ${tierColor}` }}>
          <div className="stat-label">IRT Ability θ</div>
          <div className="stat-value" style={{ color: tierColor, marginTop: '6px' }}>
            {data.theta >= 0 ? '+' : ''}{data.theta.toFixed(2)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--ink-muted)', marginTop: '6px', fontWeight: 500 }}>
            Tier: <strong style={{ color: tierColor }}>{tier}</strong>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--ink-muted)', marginTop: '4px', lineHeight: 1.4 }}>
            Higher θ = questions calibrated to harder items
          </div>
        </div>

        {/* Average Accuracy */}
        <div className="card" style={{ borderTop: '3px solid var(--mastery-80)' }}>
          <div className="stat-label">Average Accuracy</div>
          <div className="stat-value" style={{ color: masteryColor(data.summary.averageAccuracy), marginTop: '6px' }}>
            {data.summary.averageAccuracy}%
          </div>
          <div style={{ fontSize: '12px', color: 'var(--ink-muted)', marginTop: '6px' }}>
            Across {data.summary.totalAttempts} quiz attempts
          </div>
        </div>

        {/* Streak */}
        <div className="card" style={{ borderTop: '3px solid var(--ch-electric)' }}>
          <div className="stat-label">Practice Streak</div>
          <div className="stat-value" style={{ color: 'var(--ch-electric)', marginTop: '6px' }}>
            ⚡ {data.summary.currentStreak}d
          </div>
          <div style={{ fontSize: '12px', color: 'var(--ink-muted)', marginTop: '6px' }}>
            Keep going — streaks earn bonus XP
          </div>
        </div>

        {/* Total time */}
        <div className="card" style={{ borderTop: '3px solid var(--ink-muted)' }}>
          <div className="stat-label">Total Study Time</div>
          <div className="stat-value" style={{ marginTop: '6px' }}>
            {formatTime(data.summary.totalTimeSpent)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--ink-muted)', marginTop: '6px' }}>
            Consistency matters most
          </div>
        </div>
      </div>

      {/* ── Module Progress ───────────────────── */}
      <h2 className="section-heading" style={{ marginBottom: '16px' }} id="modules">
        Module Progress
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '32px' }}>
        {allTopics.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', color: 'var(--ink-muted)', padding: '40px' }}>
            No modules yet — ask your teacher to publish chapters.
          </div>
        ) : (
          allTopics.map((topic, i) => {
            const mastery = masteryMap[topic.id] ?? 0;
            const learned = data.learnedTopics.includes(topic.id);
            const hasQuiz = topic.quizzes && topic.quizzes.length > 0;
            const mColor = masteryColor(mastery);
            return (
              <div
                key={topic.id}
                className="module-card animate-fade-up"
                style={{ animationDelay: `${i * 0.04}s`, cursor: 'pointer' }}
                onClick={() => navigate(`/student/study/${topic.id}`)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                      {topic.chapterName}
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--ink)', marginBottom: '8px' }}>
                      {topic.name}
                    </div>
                    {/* Mastery bar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div className="mastery-bar-track" style={{ flex: 1 }}>
                        <div className="mastery-bar-fill" style={{ width: `${mastery}%`, background: mColor }} />
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: mColor, minWidth: '36px' }}>
                        {mastery > 0 ? `${mastery}%` : '—'}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end', flexShrink: 0 }}>
                    <span style={{
                      fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px',
                      background: learned ? 'var(--success-bg)' : 'var(--paper-3)',
                      color: learned ? '#047857' : 'var(--ink-muted)',
                      border: `1px solid ${learned ? 'rgba(5,150,105,0.2)' : 'var(--border)'}`
                    }}>
                      {learned ? '✓ Learned' : 'Learn first'}
                    </span>
                    <span style={{
                      fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px',
                      background: hasQuiz ? 'var(--accent-light)' : 'var(--paper-3)',
                      color: hasQuiz ? 'var(--accent-dark)' : 'var(--ink-muted)',
                      border: `1px solid ${hasQuiz ? 'var(--accent-border)' : 'var(--border)'}`
                    }}>
                      {hasQuiz ? '📝 Quiz ready' : 'No quiz yet'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Recent Activity ───────────────────── */}
      {data.recentActivity.length > 0 && (
        <>
          <h2 className="section-heading" style={{ marginBottom: '14px' }}>Recent Attempts</h2>
          <div className="table-container" style={{ marginBottom: '24px' }}>
            <table>
              <thead>
                <tr>
                  <th>Quiz</th><th>Score</th><th>Accuracy</th><th>Time</th><th>Date</th>
                </tr>
              </thead>
              <tbody>
                {data.recentActivity.map((act: any) => (
                  <tr 
                    key={act.attemptId} 
                    onClick={() => navigate(`/student/results/${act.attemptId}`)}
                    style={{ cursor: 'pointer' }}
                    className="clickable-row"
                  >
                    <td style={{ fontWeight: 600, color: 'var(--ink)' }}>{act.quizTitle}</td>
                    <td><strong>{act.score}</strong> / {act.totalQuestions}</td>
                    <td>
                      <span style={{
                        fontWeight: 700, fontSize: '12px',
                        color: masteryColor(act.percentage)
                      }}>{act.percentage}%</span>
                    </td>
                    <td style={{ color: 'var(--ink-muted)' }}>{Math.round((act.timeSpent || 0) / 60)}m</td>
                    <td style={{ color: 'var(--ink-muted)' }}>{new Date(act.date).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};
