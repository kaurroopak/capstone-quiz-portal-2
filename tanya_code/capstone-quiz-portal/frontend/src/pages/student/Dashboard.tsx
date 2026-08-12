import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../../api/client';
import { useAuth } from '../../context/AuthContext';

interface StatSummary {
  totalAttempts: number;
  averageAccuracy: number;
  totalTimeSpent: number;
  currentStreak: number;
}

interface TopicInfo {
  topicId: string;
  topicName: string;
  chapterName: string;
  averageScore: number;
  attemptsCount: number;
}

interface ChartPoint {
  quizTitle: string;
  scorePercent: number;
  date: string;
}

interface ActivityItem {
  attemptId: string;
  quizId: string;
  quizTitle: string;
  topicName: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  timeSpent: number;
  date: string;
}

export const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState<StatSummary | null>(null);
  const [strongTopics, setStrongTopics] = useState<TopicInfo[]>([]);
  const [weakTopics, setWeakTopics] = useState<TopicInfo[]>([]);
  const [progressChart, setProgressChart] = useState<ChartPoint[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const res = await client.get('/analytics/student');
        setSummary(res.data.summary);
        setStrongTopics(res.data.strongTopics);
        setWeakTopics(res.data.weakTopics);
        setProgressChart(res.data.progressChart);
        setRecentActivity(res.data.recentActivity);
      } catch (err) {
        console.error(err);
        setError('Failed to load dashboard metrics.');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  if (loading) {
    return <div style={{ fontWeight: 600, padding: '40px', color: '#94a3b8' }}>Initializing Synapse Engine...</div>;
  }

  if (error) {
    return <div className="alert alert-danger" style={{ margin: '40px' }}>{error}</div>;
  }

  const userTheta = user?.theta ?? 0.8;
  const userIq = user?.iqScore ?? 110;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div style={{ padding: '32px' }}>
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.15), rgba(99, 102, 241, 0.15))',
        border: '1px solid rgba(6, 182, 212, 0.3)',
        borderRadius: '20px',
        padding: '28px',
        marginBottom: '32px',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 12px', borderRadius: '12px', background: 'rgba(6, 182, 212, 0.2)', color: '#06b6d4', fontSize: '11px', fontWeight: 800, marginBottom: '12px' }}>
            ⚛️ CLASS 10 PHYSICS ADAPTIVE COMMAND CENTER
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#f8fafc', margin: '0 0 6px 0' }}>
            Welcome back, {user?.username}! 👋
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>
            Personalized IRT Ability: <strong style={{ color: '#06b6d4' }}>θ = {userTheta.toFixed(2)}</strong> • BKT Growth Tracker Active
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <Link to="/student/chapters" className="btn btn-primary" style={{ padding: '12px 24px', fontSize: '14px', background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', border: 'none' }}>
            📝 Start JEE Mains Practice
          </Link>
          <Link to="/student/ai-tutor" className="btn" style={{ padding: '12px 20px', fontSize: '14px', background: 'rgba(255, 255, 255, 0.08)', color: '#f8fafc', border: '1px solid rgba(255, 255, 255, 0.15)' }}>
            🤖 Socratic AI Tutor
          </Link>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div className="card" style={{ background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <div style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>
            Latent Ability (IRT θ)
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#06b6d4' }}>
            {userTheta > 0 ? `+${userTheta.toFixed(2)}` : userTheta.toFixed(2)}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
            Tier: {userTheta > 1.0 ? 'Advanced' : userTheta > 0.0 ? 'Proficient' : 'Developing'}
          </div>
        </div>

        <div className="card" style={{ background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <div style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>
            Average Accuracy
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#10b981' }}>
            {summary?.averageAccuracy || 0}%
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
            Across {summary?.totalAttempts || 0} practice sessions
          </div>
        </div>

        <div className="card" style={{ background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <div style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>
            Active Practice Streak
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#f59e0b' }}>
            ⚡ {summary?.currentStreak || 1} Days
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
            Keep solving daily for bonus XP
          </div>
        </div>

        <div className="card" style={{ background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <div style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>
            Cognitive Aptitude Index
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#a855f7' }}>
            {userIq.toFixed(0)} IQ
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
            Baseline Step 1 Diagnostic
          </div>
        </div>
      </div>

      {/* Class 10 Physics Chapters Progress Section */}
      <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#f8fafc', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>⚡</span> Class 10 Physics Syllabus Mastery
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        {/* Chapter 1: Light */}
        <div className="card" style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(6, 182, 212, 0.3)', backdropFilter: 'blur(12px)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '22px' }}>💡</span>
            <span className="badge" style={{ background: 'rgba(6, 182, 212, 0.2)', color: '#06b6d4', border: '1px solid #06b6d4', fontSize: '10px' }}>OPTICS</span>
          </div>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', marginBottom: '6px' }}>Light: Reflection & Refraction</h3>
          <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '16px' }}>Spherical Mirrors, Snell's Law, Lens Formula & Power.</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#cbd5e1', marginBottom: '6px' }}>
            <span>BKT Mastery P(L)</span>
            <span style={{ fontWeight: 700, color: '#10b981' }}>85%</span>
          </div>
          <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden', marginBottom: '16px' }}>
            <div style={{ width: '85%', height: '100%', background: 'linear-gradient(90deg, #06b6d4, #10b981)' }} />
          </div>
          <Link to="/student/chapters" className="btn btn-primary" style={{ width: '100%', fontSize: '12px', padding: '8px 0', textAlign: 'center' }}>
            Practice Optics Quizzes
          </Link>
        </div>

        {/* Chapter 2: Human Eye */}
        <div className="card" style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(168, 85, 247, 0.3)', backdropFilter: 'blur(12px)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '22px' }}>👁️</span>
            <span className="badge" style={{ background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc', border: '1px solid #a855f7', fontSize: '10px' }}>VISION</span>
          </div>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', marginBottom: '6px' }}>Human Eye & Colourful World</h3>
          <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '16px' }}>Defects of Vision, Prism Dispersion, Atmospheric Refraction.</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#cbd5e1', marginBottom: '6px' }}>
            <span>BKT Mastery P(L)</span>
            <span style={{ fontWeight: 700, color: '#f59e0b' }}>68%</span>
          </div>
          <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden', marginBottom: '16px' }}>
            <div style={{ width: '68%', height: '100%', background: 'linear-gradient(90deg, #a855f7, #f59e0b)' }} />
          </div>
          <Link to="/student/chapters" className="btn btn-primary" style={{ width: '100%', fontSize: '12px', padding: '8px 0', textAlign: 'center' }}>
            Practice Vision Quizzes
          </Link>
        </div>

        {/* Chapter 3: Electricity */}
        <div className="card" style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(245, 158, 11, 0.3)', backdropFilter: 'blur(12px)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '22px' }}>⚡</span>
            <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', border: '1px solid #f59e0b', fontSize: '10px' }}>CIRCUITS</span>
          </div>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', marginBottom: '6px' }}>Electricity & Circuits</h3>
          <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '16px' }}>Ohm's Law, Series/Parallel Circuits, Joule Heating, Power.</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#cbd5e1', marginBottom: '6px' }}>
            <span>BKT Mastery P(L)</span>
            <span style={{ fontWeight: 700, color: '#10b981' }}>90%</span>
          </div>
          <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden', marginBottom: '16px' }}>
            <div style={{ width: '90%', height: '100%', background: 'linear-gradient(90deg, #f59e0b, #10b981)' }} />
          </div>
          <Link to="/student/chapters" className="btn btn-primary" style={{ width: '100%', fontSize: '12px', padding: '8px 0', textAlign: 'center' }}>
            Practice Circuit Quizzes
          </Link>
        </div>

        {/* Chapter 4: Magnetism */}
        <div className="card" style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(239, 68, 68, 0.3)', backdropFilter: 'blur(12px)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '22px' }}>🧲</span>
            <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', border: '1px solid #ef4444', fontSize: '10px' }}>MAGNETISM</span>
          </div>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', marginBottom: '6px' }}>Magnetic Effects of Current</h3>
          <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '16px' }}>Field Lines, Solenoids, Fleming's Left & Right Hand Rules.</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#cbd5e1', marginBottom: '6px' }}>
            <span>BKT Mastery P(L)</span>
            <span style={{ fontWeight: 700, color: '#06b6d4' }}>75%</span>
          </div>
          <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden', marginBottom: '16px' }}>
            <div style={{ width: '75%', height: '100%', background: 'linear-gradient(90deg, #ef4444, #06b6d4)' }} />
          </div>
          <Link to="/student/chapters" className="btn btn-primary" style={{ width: '100%', fontSize: '12px', padding: '8px 0', textAlign: 'center' }}>
            Practice Magnetism Quizzes
          </Link>
        </div>
      </div>

      {/* Recent Practice History */}
      <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#f8fafc', marginBottom: '16px' }}>
        📜 Recent Practice Attempts
      </h2>
      
      <div className="card" style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '0', overflow: 'hidden' }}>
        {recentActivity.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
            No practice attempts recorded yet. Click "Start JEE Mains Practice" above to begin!
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', color: '#f8fafc' }}>
            <thead>
              <tr style={{ background: 'rgba(255, 255, 255, 0.05)', textAlign: 'left', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <th style={{ padding: '14px 20px' }}>Quiz Title</th>
                <th style={{ padding: '14px 20px' }}>Score</th>
                <th style={{ padding: '14px 20px' }}>Accuracy</th>
                <th style={{ padding: '14px 20px' }}>Time Spent</th>
                <th style={{ padding: '14px 20px' }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {recentActivity.map((act) => (
                <tr key={act.attemptId} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <td style={{ padding: '14px 20px', fontWeight: 600 }}>{act.quizTitle}</td>
                  <td style={{ padding: '14px 20px' }}>{act.score} / {act.totalQuestions}</td>
                  <td style={{ padding: '14px 20px' }}>
                    <span className="badge" style={{
                      background: act.percentage >= 80 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                      color: act.percentage >= 80 ? '#10b981' : '#f59e0b',
                      border: `1px solid ${act.percentage >= 80 ? '#10b981' : '#f59e0b'}`
                    }}>
                      {act.percentage}%
                    </span>
                  </td>
                  <td style={{ padding: '14px 20px', color: '#94a3b8' }}>{formatTime(act.timeSpent)}</td>
                  <td style={{ padding: '14px 20px', color: '#64748b' }}>{new Date(act.date).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
