import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';

export const Login: React.FC = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'STUDENT' | 'TEACHER'>('STUDENT');
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleToggle = () => {
    setIsRegister(!isRegister);
    setError('');
    setSuccess('');
    setUsername('');
    setEmail('');
    setPassword('');
    setLoginIdentifier('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      if (isRegister) {
        const res = await client.post('/auth/signup', { username, email, password, role });
        setSuccess('Account created! Launching Synapse...');
        setTimeout(() => {
          login(res.data.token, res.data.user);
          navigate(res.data.user.role === 'TEACHER' ? '/teacher/dashboard' : '/student/dashboard');
        }, 1200);
      } else {
        const res = await client.post('/auth/login', { loginIdentifier, password });
        login(res.data.token, res.data.user);
        navigate(res.data.user.role === 'TEACHER' ? '/teacher/dashboard' : '/student/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Authentication failed. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-container">
      {/* Ambient background */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0,
        background: 'radial-gradient(ellipse at 20% 50%, rgba(6,182,212,0.1), transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(99,102,241,0.1), transparent 50%)'
      }} />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '440px' }}>
        <div className="login-card">
          {/* Brand Header */}
          <div className="login-brand">
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', borderRadius: '20px', background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.3)', marginBottom: '16px' }}>
              <span style={{ fontSize: '20px' }}>⚛️</span>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#06b6d4', letterSpacing: '1px' }}>SYNAPSE PHYSICS</span>
            </div>
            <h1>
              {isRegister ? 'Create Account' : 'Welcome Back'}
            </h1>
            <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '6px' }}>
              {isRegister
                ? 'Join the Class 10 Physics adaptive learning platform'
                : 'Adaptive Class 10 Physics Learning — Powered by IRT & BKT'}
            </p>
          </div>

          {error && <div className="alert alert-danger" style={{ marginBottom: '16px' }}>{error}</div>}
          {success && <div className="alert alert-success" style={{ marginBottom: '16px' }}>{success}</div>}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {isRegister && (
              <div className="form-group">
                <label className="form-label">Username</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. arjun_class10"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            )}

            {isRegister ? (
              <div className="form-group">
                <label className="form-label">School Email Address</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="student@school.edu.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label">Email or Username</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter your email or username"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {isRegister && (
              <div className="form-group">
                <label className="form-label">I am a</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setRole('STUDENT')}
                    style={{
                      flex: 1, padding: '10px', borderRadius: '10px', fontWeight: 700, fontSize: '13px', cursor: 'pointer',
                      background: role === 'STUDENT' ? 'linear-gradient(135deg, #6366f1, #06b6d4)' : 'rgba(255,255,255,0.05)',
                      color: role === 'STUDENT' ? '#fff' : '#94a3b8',
                      border: role === 'STUDENT' ? 'none' : '1px solid rgba(255,255,255,0.1)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    📚 Student
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('TEACHER')}
                    style={{
                      flex: 1, padding: '10px', borderRadius: '10px', fontWeight: 700, fontSize: '13px', cursor: 'pointer',
                      background: role === 'TEACHER' ? 'linear-gradient(135deg, #f59e0b, #ef4444)' : 'rgba(255,255,255,0.05)',
                      color: role === 'TEACHER' ? '#fff' : '#94a3b8',
                      border: role === 'TEACHER' ? 'none' : '1px solid rgba(255,255,255,0.1)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    👩‍🏫 Teacher
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '14px', marginTop: '4px', fontSize: '15px' }}
              disabled={submitting}
            >
              {submitting ? '⏳ Launching Synapse...' : isRegister ? '🚀 Create Account' : '⚡ Enter Platform'}
            </button>
          </form>

          {/* Quick Test Credentials hint */}
          {!isRegister && (
            <div style={{ marginTop: '16px', padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                🔑 Test Credentials
              </div>
              <div style={{ fontSize: '11.5px', color: '#64748b', lineHeight: 1.6 }}>
                <strong style={{ color: '#94a3b8' }}>Student:</strong> student@quiz.com / password123<br/>
                <strong style={{ color: '#94a3b8' }}>Teacher:</strong> teacher@quiz.com / password123
              </div>
            </div>
          )}

          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <button
              onClick={handleToggle}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#06b6d4', fontWeight: 600, fontSize: '13px',
                fontFamily: 'Plus Jakarta Sans, sans-serif'
              }}
            >
              {isRegister ? '← Already have an account? Log in' : "New to Synapse? Create account →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
