import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();

  if (!user) return null;

  const isTeacher = user.role === 'TEACHER';

  return (
    <div className="sidebar">
      {/* Brand Header */}
      <div style={{ marginBottom: '24px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '20px', background: 'rgba(6, 182, 212, 0.15)', border: '1px solid rgba(6, 182, 212, 0.3)', marginBottom: '12px' }}>
          <span style={{ fontSize: '18px' }}>⚛️</span>
          <span style={{ fontSize: '13px', fontWeight: 800, color: '#06b6d4', letterSpacing: '0.5px' }}>SYNAPSE PHYSICS</span>
        </div>
      </div>

      {/* User Info */}
      <div style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: isTeacher ? 'var(--color-secondary)' : '#06b6d4',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 800,
          fontSize: '18px',
          border: '2px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 4px 12px rgba(6, 182, 212, 0.3)',
          marginBottom: '4px'
        }}>
          {user.username.substring(0, 2).toUpperCase()}
        </div>
        <div style={{ textAlign: 'center' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>{user.username}</h3>
          <span className="badge" style={{
            fontSize: '10px',
            marginTop: '4px',
            backgroundColor: isTeacher ? 'rgba(245, 158, 11, 0.2)' : 'rgba(99, 102, 241, 0.2)',
            color: isTeacher ? '#f59e0b' : '#a5b4fc',
            border: `1px solid ${isTeacher ? '#f59e0b' : '#6366f1'}`
          }}>
            CLASS 10 • {user.role}
          </span>
        </div>
      </div>

      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {isTeacher ? (
          <>
            <NavLink to="/teacher/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              📊 Command Center
            </NavLink>
            <NavLink to="/teacher/chapters" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              📚 Physics Chapters
            </NavLink>
            <NavLink to="/teacher/quizzes" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              📝 Quiz & Excel Upload
            </NavLink>
            <NavLink to="/teacher/knowledge-graph" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              🕸️ Physics Knowledge Graph
            </NavLink>
            <NavLink to="/profile" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              👤 Account Profile
            </NavLink>
          </>
        ) : (
          <>
            <NavLink to="/student/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              🏠 Command Center
            </NavLink>
            <NavLink to="/student/chapters" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              📝 JEE Mains Physics Exam
            </NavLink>
            <NavLink to="/student/knowledge-graph" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              🕸️ Physics Skill Tree
            </NavLink>
            <NavLink to="/student/study" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              📚 NCERT Concept Study
            </NavLink>
            <NavLink to="/student/ai-tutor" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              🤖 Socratic AI Tutor
            </NavLink>
            <NavLink to="/profile" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              👤 Account Profile
            </NavLink>
          </>
        )}
      </nav>

      <button className="btn btn-danger" onClick={logout} style={{ width: '100%', padding: '10px', fontSize: '13px', marginTop: '16px' }}>
        Log Out
      </button>
    </div>
  );
};
