import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;
  const isTeacher = user.role === 'TEACHER';

  // XP caps at next round milestone for the progress bar
  const xp = (user as any).xp ?? 0;
  const xpLevel = Math.floor(xp / 100) + 1;
  const xpInLevel = xp % 100;

  return (
    <div className="sidebar">
      {/* Brand */}
      <div style={{ marginBottom: '20px', textAlign: 'center' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '7px',
          padding: '5px 12px',
          borderRadius: '20px',
          background: 'var(--accent-light)',
          border: '1px solid var(--accent-border)',
          marginBottom: '14px'
        }}>
          <span style={{ fontSize: '15px' }}>⚛️</span>
          <span style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '12px',
            fontWeight: 800,
            color: 'var(--accent-dark)',
            letterSpacing: '0.08em'
          }}>SYNAPSE PHYSICS</span>
        </div>
      </div>

      {/* User Avatar */}
      <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <div style={{
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          background: isTeacher ? '#F59E0B' : 'var(--ink)',
          color: 'var(--paper)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 800,
          fontSize: '18px',
          fontFamily: 'var(--font-display)'
        }}>
          {user.username.substring(0, 2).toUpperCase()}
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--ink)' }}>{user.username}</div>
          <div style={{ fontSize: '11px', color: 'var(--ink-muted)', marginTop: '2px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Class 10 · {user.role}
          </div>
        </div>

        {/* XP Bar — only for students */}
        {!isTeacher && (
          <div style={{ width: '100%', padding: '0 4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Lv {xpLevel}
              </span>
              <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--accent-dark)' }}>
                {xp} XP
              </span>
            </div>
            <div className="xp-bar-track">
              <div className="xp-bar-fill" style={{ width: `${xpInLevel}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {isTeacher ? (
          <>
            <NavLink to="/teacher/dashboard"   className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>📊 Command Center</NavLink>
            <NavLink to="/teacher/chapters"    className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>📚 Chapters</NavLink>
            <NavLink to="/teacher/quizzes"     className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>📝 Quiz Upload</NavLink>
            <NavLink to="/teacher/knowledge-graph" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>🕸️ Knowledge Graph</NavLink>
            <NavLink to="/profile"             className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>👤 Profile</NavLink>
          </>
        ) : (
          <>
            <NavLink to="/student/dashboard"   className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>🏠 Command Center</NavLink>
            <NavLink to="/student/chapters"    className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>📗 My Modules</NavLink>
            <NavLink to="/student/skill-tree"  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>🌿 Skill Tree</NavLink>
            <NavLink to="/student/ai-tutor"    className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>🤖 AI Tutor</NavLink>
            <NavLink to="/profile"             className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>👤 Profile</NavLink>
          </>
        )}
      </nav>

      <button
        className="btn btn-outline"
        onClick={logout}
        style={{ width: '100%', padding: '9px', fontSize: '13px', marginTop: '14px' }}
      >
        Log Out
      </button>
    </div>
  );
};
