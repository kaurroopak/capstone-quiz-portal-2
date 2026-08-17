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
    <div className="login-container animate-fade-in">
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '460px' }}>
        <div className="login-card animate-fade-up">
          {/* Brand Header */}
          <div className="login-brand">
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '6px 16px', borderRadius: '20px', background: 'var(--color-primary-light)', border: '1px solid var(--color-primary-light)', marginBottom: '16px' }}>
              <span style={{ fontSize: '20px' }}>⚛️</span>
              <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--color-primary)', letterSpacing: '1px' }}>SYNAPSE PHYSICS</span>
            </div>
            <h1 className="header-title" style={{ color: 'var(--color-text-dark)' }}>
              {isRegister ? 'Create Account' : 'Welcome Back'}
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--color-text-light)', marginTop: '8px' }}>
              {isRegister
                ? 'Join the Class 10 Physics adaptive learning platform'
                : 'Adaptive Class 10 Physics Learning — Powered by IRT & BKT'}
            </p>
          </div>

          {error && <div className="alert alert-danger" style={{ marginBottom: '20px' }}>{error}</div>}
          {success && <div className="alert alert-success" style={{ marginBottom: '20px' }}>{success}</div>}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setRole('STUDENT')}
                    style={{
                      flex: 1, padding: '12px', borderRadius: '12px', fontWeight: 700, fontSize: '14px', cursor: 'pointer',
                      background: role === 'STUDENT' ? 'linear-gradient(135deg, var(--color-primary), var(--color-accent))' : 'var(--color-surface)',
                      color: role === 'STUDENT' ? 'var(--color-text-inverse)' : 'var(--color-text-light)',
                      border: role === 'STUDENT' ? 'none' : '1px solid var(--color-border)',
                      boxShadow: role === 'STUDENT' ? 'var(--shadow-md)' : 'none',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    📚 Student
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('TEACHER')}
                    style={{
                      flex: 1, padding: '12px', borderRadius: '12px', fontWeight: 700, fontSize: '14px', cursor: 'pointer',
                      background: role === 'TEACHER' ? 'linear-gradient(135deg, var(--color-secondary), var(--color-danger))' : 'var(--color-surface)',
                      color: role === 'TEACHER' ? 'var(--color-text-inverse)' : 'var(--color-text-light)',
                      border: role === 'TEACHER' ? 'none' : '1px solid var(--color-border)',
                      boxShadow: role === 'TEACHER' ? 'var(--shadow-md)' : 'none',
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
              style={{ width: '100%', padding: '14px', marginTop: '8px', fontSize: '15px' }}
              disabled={submitting}
            >
              {submitting ? '⏳ Launching Synapse...' : isRegister ? '🚀 Create Account' : '⚡ Enter Platform'}
            </button>
          </form>

          {/* Quick Test Credentials hint */}
          {!isRegister && (
            <div style={{ marginTop: '24px', padding: '16px', borderRadius: '12px', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--color-text-light)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                🔑 Test Credentials
              </div>
              <div style={{ fontSize: '13px', color: 'var(--color-text)', lineHeight: 1.6 }}>
                <strong style={{ color: 'var(--color-text-dark)' }}>Student:</strong> student@quiz.com / password123<br/>
                <strong style={{ color: 'var(--color-text-dark)' }}>Teacher:</strong> teacher@quiz.com / password123
              </div>
            </div>
          )}

          <div style={{ textAlign: 'center', marginTop: '24px' }}>
            <button
              onClick={handleToggle}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--color-primary)', fontWeight: 700, fontSize: '14px',
                fontFamily: 'var(--font-sans)',
                transition: 'var(--transition-smooth)'
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
