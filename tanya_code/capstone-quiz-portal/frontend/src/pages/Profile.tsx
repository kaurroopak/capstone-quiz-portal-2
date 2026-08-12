import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';

export const Profile: React.FC = () => {
  const { user, login } = useAuth();
  const [learningStyle, setLearningStyle] = useState(user?.learningStyle || 'Visual Learner');
  const [readingSpeed, setReadingSpeed] = useState(user?.readingSpeed || 'Average');
  const [workingMemory, setWorkingMemory] = useState(user?.workingMemory || 'Average');
  const [processingSpeed, setProcessingSpeed] = useState(user?.processingSpeed || 'Average');
  
  const [stats, setStats] = useState<any>(null);
  const [updating, setUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.role === 'STUDENT') {
      fetchStudentStats();
    }
  }, [user]);

  const fetchStudentStats = async () => {
    try {
      const res = await client.get('/analytics/student');
      setStats(res.data);
    } catch (err) {
      console.error('Failed to load profile analytics:', err);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    setUpdateSuccess('');
    setError('');

    try {
      const res = await client.put('/auth/profile', {
        learningStyle,
        readingSpeed,
        workingMemory,
        processingSpeed
      });

      // Update AuthContext and LocalStorage
      const token = localStorage.getItem('quiz_token') || '';
      login(token, res.data);
      setUpdateSuccess('Cognitive profile updated successfully!');
      setTimeout(() => setUpdateSuccess(''), 3000);
    } catch (err) {
      console.error(err);
      setError('Failed to update profile settings.');
    } finally {
      setUpdating(false);
    }
  };

  const totalAttempts = stats?.summary?.totalAttempts || 0;
  const avgAccuracy = stats?.summary?.averageAccuracy || 0;
  const currentStreak = stats?.summary?.currentStreak || 0;

  // Evaluate unlocked badges
  const achievements = [
    {
      name: 'Scholar\'s Start',
      desc: 'Completed your first quiz attempt.',
      unlocked: totalAttempts > 0,
      badgeText: 'Awarded'
    },
    {
      name: 'Streak Starter',
      desc: 'Maintained a practice streak for at least 1 day.',
      unlocked: currentStreak > 0,
      badgeText: 'Awarded'
    },
    {
      name: 'Master Mind',
      desc: 'Achieved a perfect accuracy score (100%) on any quiz.',
      unlocked: avgAccuracy >= 95 || (stats?.recentActivity?.some((act: any) => act.percentage === 100)),
      badgeText: 'Awarded'
    },
    {
      name: 'Dedicated Learner',
      desc: 'Completed 5 or more quiz assessments.',
      unlocked: totalAttempts >= 5,
      badgeText: 'Awarded'
    }
  ];

  return (
    <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 className="header-title">My Profile</h1>
        <p className="header-subtitle">Manage your personal settings, cognitive learning metrics, and review achievement badges.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '0.9fr 1.1fr', gap: '32px' }}>
        
        {/* Left Column: Stats & Badge Rewards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Avatar and basic Info Card */}
          <div className="card" style={{ textAlign: 'center', padding: '32px' }}>
            <div style={{
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              backgroundColor: user?.role === 'TEACHER' ? 'var(--color-secondary)' : 'var(--color-primary)',
              color: 'white',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '40px',
              border: '3px solid var(--color-border-dark)',
              marginBottom: '16px'
            }}>
              {user?.username.substring(0, 2).toUpperCase()}
            </div>
            
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-text-dark)' }}>{user?.username}</h2>
            <p style={{ fontSize: '14px', color: 'var(--color-text-light)', marginBottom: '8px' }}>{user?.email}</p>
            <span className="badge" style={{
              backgroundColor: user?.role === 'TEACHER' ? 'var(--color-accent-light)' : 'var(--color-primary-light)',
              color: user?.role === 'TEACHER' ? 'var(--color-accent-dark)' : 'var(--color-primary-dark)'
            }}>
              {user?.role}
            </span>
          </div>

          {/* Gamified Achievements Box */}
          <div className="card">
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px', color: 'var(--color-text-dark)' }}>
              Unlocked Achievements
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {achievements.map((ach, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: ach.unlocked ? 'white' : '#f1f5f9',
                  opacity: ach.unlocked ? 1 : 0.6
                }}>
                  <div>
                    <h4 style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      color: ach.unlocked ? 'var(--color-text-dark)' : 'var(--color-text-light)',
                      textDecoration: ach.unlocked ? 'none' : 'line-through'
                    }}>
                      {ach.name}
                    </h4>
                    <p style={{ fontSize: '12px', color: 'var(--color-text-light)' }}>{ach.desc}</p>
                  </div>
                  {ach.unlocked ? (
                    <span style={{ marginLeft: 'auto', color: 'var(--color-primary)', fontWeight: 700, fontSize: '13px' }}>
                      {ach.badgeText}
                    </span>
                  ) : (
                    <span style={{ marginLeft: 'auto', color: 'var(--color-text-light)', fontWeight: 600, fontSize: '13px' }}>
                      Locked
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Profile details form */}
        <div className="card">
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>Cognitive Learning Profile</h3>
          <p style={{ fontSize: '13px', color: 'var(--color-text-light)', marginBottom: '24px', lineHeight: 1.5 }}>
            Customize your learning dimensions. Explanations adapt to fit your cognitive preferences.
          </p>

          {updateSuccess && <div className="alert alert-success">{updateSuccess}</div>}
          {error && <div className="alert alert-danger">{error}</div>}

          <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Learning Style</label>
              <select
                className="input-field"
                value={learningStyle}
                onChange={(e) => setLearningStyle(e.target.value)}
              >
                <option value="Visual Learner">Visual Learner (Maps, diagrams, charts)</option>
                <option value="Auditory Learner">Auditory Learner (Speeches, conversations, oral prompts)</option>
                <option value="Textual Learner">Textual Learner (Reading summaries, textbooks)</option>
                <option value="Kinesthetic Learner">Kinesthetic Learner (Step-by-step loops, practical examples)</option>
              </select>
            </div>

            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Reading Speed</label>
              <select
                className="input-field"
                value={readingSpeed}
                onChange={(e) => setReadingSpeed(e.target.value)}
              >
                <option value="Slow">Comfortable / Deliberate</option>
                <option value="Average">Average Speed</option>
                <option value="Above Average">Fast Reader</option>
              </select>
            </div>

            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Working Memory</label>
              <select
                className="input-field"
                value={workingMemory}
                onChange={(e) => setWorkingMemory(e.target.value)}
              >
                <option value="Average">Standard (Prefers progressive step breakdowns)</option>
                <option value="High">High (Comfortable with complex, multi-concept formulas)</option>
              </select>
            </div>

            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Processing Speed</label>
              <select
                className="input-field"
                value={processingSpeed}
                onChange={(e) => setProcessingSpeed(e.target.value)}
              >
                <option value="Average">Reflective (Needs conceptual summaries first)</option>
                <option value="High">Quick (Prefers quick definitions and straight examples)</option>
              </select>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ padding: '14px', textTransform: 'none', marginTop: '12px', boxShadow: 'none' }}
              disabled={updating}
            >
              {updating ? 'Saving settings...' : 'Update Cognitive Profile'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};
