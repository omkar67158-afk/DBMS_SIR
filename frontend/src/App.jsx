import { useState, useEffect, useCallback } from 'react';
import Login from './components/Login';
import StepWizard from './components/StepWizard';
import RollNumberEntry from './components/RollNumberEntry';
import { courseQuestions } from './content';
import RaceLeaderboard from './components/RaceLeaderboard';
import AdminDashboard from './components/AdminDashboard';
import { LogOut, Zap, Trophy, BookOpen, CheckCircle2, Lock, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import './index.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState('course');
  const [showAdminPrompt, setShowAdminPrompt] = useState(false);

  const fetchProgress = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/progress`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(prev => ({
        ...prev,
        loggedIn: true,
        currentStep: res.data.currentStep,
        submissions: res.data.submissions,
        isCompleted: res.data.isCompleted,
        completedAt: res.data.completedAt,
        name: res.data.name,
        email: res.data.email,
        rollNumber: res.data.rollNumber,
        ocrStatus: res.data.ocrStatus,
        ocrFeedback: res.data.ocrFeedback,
        rejectionCount: res.data.rejectionCount ?? 0,
      }));
    } catch (err) {
      const code = err?.response?.data?.error;
      if (code === 'SESSION_CONFLICT') {
        setLoginError(err.response.data.message);
        localStorage.removeItem('token');
        setUser(null);
      }
    }
  }, []);

  useEffect(() => {
    const checkSession = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/progress`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setUser({
            loggedIn: true,
            currentStep: res.data.currentStep,
            submissions: res.data.submissions,
            isCompleted: res.data.isCompleted,
            completedAt: res.data.completedAt,
            name: res.data.name,
            email: res.data.email,
            rollNumber: res.data.rollNumber,
            ocrStatus: res.data.ocrStatus,
            ocrFeedback: res.data.ocrFeedback,
            rejectionCount: res.data.rejectionCount ?? 0,
          });
        } catch (err) {
          const code = err?.response?.data?.error;
          if (code === 'SESSION_CONFLICT') setLoginError(err.response.data.message);
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };
    checkSession();
  }, []);

  const handleLogout = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/logout`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch { /* ignore */ }
    }
    localStorage.removeItem('token');
    setUser(null);
    setLoginError('');
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '16px' }}>
      <div style={{
        width: '40px', height: '40px', borderRadius: '10px',
        background: 'linear-gradient(135deg, #7c5cfc, #a78bfa)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 0 24px rgba(124,92,252,0.5)',
      }}>
        <Zap size={20} color="#fff" />
      </div>
      <div className="spin" style={{ width: '20px', height: '20px', border: '2px solid rgba(255,255,255,0.08)', borderTopColor: 'var(--brand)', borderRadius: '50%' }} />
    </div>
  );

  const currentStep = user?.currentStep ?? 1;
  const total = courseQuestions.length;
  const stepsCompleted = Math.max(0, currentStep - 1);
  const rejections = user?.rejectionCount ?? 0;
  const netScore = stepsCompleted * 100 - rejections * 25;
  const scorePct = Math.round((netScore / (total * 100)) * 100);
  const progressPct = currentStep > total ? 100 : Math.round(((currentStep - 1) / total) * 100);

  // Initials helper
  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  const isAdmin = user?.rollNumber?.startsWith('ADMIN_');

  if (isAdmin) {
    return <AdminDashboard />;
  }

  return (
    <div className="app-shell">

      {/* ══════════════ PREMIUM TOP BAR ══════════════ */}
      <header className="app-topbar">
        {/* Logo / Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '34px', height: '34px', borderRadius: '9px',
            background: 'linear-gradient(135deg, #7c5cfc, #a78bfa)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 16px rgba(124,92,252,0.45)', flexShrink: 0,
          }}>
            <Zap size={17} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: '700', fontSize: '14px', letterSpacing: '-0.02em', color: 'var(--txt)', lineHeight: 1.2 }}>
              DataPipeline
            </div>
            <div style={{ fontSize: '11px', color: 'var(--txt-faint)', fontWeight: '500' }}>
              by Prof. Sandeep Patil
            </div>
          </div>
        </div>

        {/* Right controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {user && (
            <>
              {/* Step / Score chips */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '5px 11px', borderRadius: '20px',
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  fontSize: '11px', fontWeight: '600', color: 'var(--txt-muted)',
                }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 6px var(--green)' }} />
                  Step {Math.min(currentStep, total)} of {total}
                </div>
                <div style={{
                  padding: '5px 11px', borderRadius: '20px',
                  background: 'rgba(124,92,252,0.12)', border: '1px solid rgba(124,92,252,0.25)',
                  fontFamily: '"Orbitron","Courier New",monospace',
                  fontSize: '11px', fontWeight: '700', color: '#a78bfa',
                }}>
                  {scorePct}%
                </div>
              </div>

              {/* Tab switcher */}
              <div style={{
                display: 'flex', background: 'rgba(255,255,255,0.03)',
                borderRadius: '10px', padding: '3px', gap: '2px',
                border: '1px solid rgba(255,255,255,0.08)',
              }}>
                {[
                  { id: 'course', icon: <BookOpen size={13} />, label: 'Course' },
                  { id: 'race', icon: <Trophy size={13} />, label: 'Race 🏎️' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '5px',
                      padding: '6px 14px', fontSize: '12px', fontWeight: '600',
                      borderRadius: '7px', border: 'none', cursor: 'pointer',
                      background: activeTab === tab.id
                        ? tab.id === 'race' ? 'rgba(124,92,252,0.2)' : 'var(--surface-2)'
                        : 'transparent',
                      color: activeTab === tab.id
                        ? tab.id === 'race' ? 'var(--brand)' : 'var(--txt)'
                        : 'var(--txt-muted)',
                      boxShadow: activeTab === tab.id ? '0 1px 4px rgba(0,0,0,0.2)' : 'none',
                      transition: 'all 0.18s',
                    }}
                  >
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>

              {/* User avatar + logout */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, #7c5cfc, #a78bfa)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '12px', fontWeight: '700', color: '#fff',
                  flexShrink: 0, boxShadow: '0 0 10px rgba(124,92,252,0.4)',
                }}>
                  {initials}
                </div>
                <div style={{ display: 'none' }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--txt)' }}>{user.name?.split(' ')[0]}</div>
                </div>
                <button
                  onClick={() => setShowAdminPrompt(true)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: '32px', height: '32px', borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.08)', background: 'transparent',
                    color: 'var(--txt-muted)', cursor: 'pointer', transition: 'all 0.18s',
                  }}
                  title="Admin Access"
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--txt-muted)'; }}
                >
                  <Lock size={14} />
                </button>
                <button
                  onClick={handleLogout}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '6px 12px', fontSize: '12px', fontWeight: '600',
                    borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)',
                    background: 'transparent', cursor: 'pointer',
                    color: 'var(--txt-muted)', transition: 'all 0.18s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.08)'; e.currentTarget.style.color = '#f87171'; e.currentTarget.style.borderColor = 'rgba(248,113,113,0.25)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--txt-muted)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                >
                  <LogOut size={13} /> Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      {/* ══════════════ BODY ══════════════ */}
      <AnimatePresence mode="wait">
        {!user ? (
          <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <Login onLoginSuccess={(u) => setUser(u)} />
          </motion.div>
        ) : (
          <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="app-body">

            {/* Roll Number Gate & Admin Prompt */}
            {(!user.rollNumber || showAdminPrompt) && (
              <div style={{ position: 'fixed', inset: 0, zIndex: 9999 }}>
                <RollNumberEntry user={user} onConfirm={({ rollNumber }) => {
                  setUser(prev => ({ ...prev, rollNumber }));
                  setShowAdminPrompt(false);
                }} />
                {showAdminPrompt && (
                  <button 
                    onClick={() => setShowAdminPrompt(false)}
                    style={{ position: 'absolute', top: 20, right: 20, zIndex: 10000, background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            )}

            {/* ══════ PREMIUM SIDEBAR ══════ */}
            <aside className="sidebar">

              {/* Student Card */}
              {user.name && (
                <div style={{
                  padding: '14px 16px', borderRadius: '14px', marginBottom: '20px',
                  background: 'linear-gradient(135deg, rgba(124,92,252,0.1) 0%, rgba(124,92,252,0.04) 100%)',
                  border: '1px solid rgba(124,92,252,0.2)',
                  display: 'flex', alignItems: 'center', gap: '12px',
                  position: 'relative', overflow: 'hidden',
                }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(124,92,252,0.4), transparent)' }} />
                  <div style={{
                    width: '38px', height: '38px', borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg, #7c5cfc, #a78bfa)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '14px', fontWeight: '700', color: '#fff',
                    boxShadow: '0 0 14px rgba(124,92,252,0.4)',
                  }}>
                    {initials}
                  </div>
                  <div style={{ overflow: 'hidden', flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--txt)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
                    <div style={{ fontSize: '10px', color: 'rgba(167,139,250,0.7)', fontWeight: '600', letterSpacing: '0.06em', marginTop: '1px' }}>
                      {user.rollNumber || 'Student'}
                    </div>
                  </div>
                  {currentStep > total && <span style={{ fontSize: '16px' }}>🎓</span>}
                </div>
              )}

              {/* Progress Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', padding: '0 2px' }}>
                <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--txt-faint)', letterSpacing: '0.12em' }}>COURSE PROGRESS</span>
                <span style={{ fontSize: '10px', fontWeight: '700', color: progressPct >= 100 ? 'var(--green)' : 'var(--brand)', fontFamily: '"Orbitron","Courier New",monospace' }}>{progressPct}%</span>
              </div>

              {/* Thin progress bar */}
              <div style={{ height: '3px', borderRadius: '99px', background: 'rgba(255,255,255,0.05)', marginBottom: '14px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: '99px',
                  background: 'linear-gradient(90deg, #7c5cfc, #14d997)',
                  width: `${progressPct}%`,
                  transition: 'width 0.8s cubic-bezier(.4,0,.2,1)',
                  boxShadow: '0 0 8px rgba(124,92,252,0.5)',
                }} />
              </div>

              {/* Step List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginBottom: '20px' }}>
                {courseQuestions.map((q) => {
                  const isDone = q.id < currentStep;
                  const isActive = q.id === currentStep;
                  const isLocked = q.id > currentStep;
                  const subtitle = q.title?.split(': ')[1] || q.title || q.question?.slice(0, 32) + '…';

                  return (
                    <div
                      key={q.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '9px 12px', borderRadius: '10px', cursor: 'default',
                        background: isActive
                          ? 'rgba(124,92,252,0.1)'
                          : isDone
                            ? 'rgba(20,217,151,0.04)'
                            : 'transparent',
                        border: isActive
                          ? '1px solid rgba(124,92,252,0.25)'
                          : isDone
                            ? '1px solid rgba(20,217,151,0.12)'
                            : '1px solid transparent',
                        opacity: isLocked ? 0.38 : 1,
                        transition: 'all 0.2s',
                      }}
                    >
                      {/* Step indicator */}
                      <div style={{
                        width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: isDone
                          ? 'var(--green)'
                          : isActive
                            ? 'var(--brand)'
                            : 'var(--surface-3)',
                        border: isDone
                          ? 'none'
                          : isActive
                            ? 'none'
                            : '1px solid rgba(255,255,255,0.1)',
                        boxShadow: isDone
                          ? '0 0 8px rgba(20,217,151,0.4)'
                          : isActive
                            ? '0 0 10px rgba(124,92,252,0.5)'
                            : 'none',
                        fontSize: '10px', fontWeight: '700',
                        color: isDone ? '#000' : isActive ? '#fff' : 'var(--txt-faint)',
                      }}>
                        {isDone
                          ? <CheckCircle2 size={13} strokeWidth={2.5} />
                          : isLocked
                            ? <Lock size={10} strokeWidth={2.5} />
                            : q.id}
                      </div>

                      {/* Label */}
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{
                          fontSize: '12px', fontWeight: isActive ? '600' : '500',
                          color: isActive ? 'var(--txt)' : isDone ? 'var(--txt-muted)' : 'var(--txt-faint)',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          {subtitle}
                        </div>
                        {isActive && (
                          <div style={{ fontSize: '10px', color: 'var(--brand)', fontWeight: '600', marginTop: '1px' }}>In progress</div>
                        )}
                        {isDone && (
                          <div style={{ fontSize: '10px', color: 'var(--green)', fontWeight: '600', marginTop: '1px' }}>Verified ✓</div>
                        )}
                      </div>

                      {isActive && <ChevronRight size={13} color="var(--brand)" style={{ flexShrink: 0 }} />}
                    </div>
                  );
                })}
              </div>

              {/* Divider */}
              <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0 18px' }} />

              {/* Score breakdown */}
              <div style={{
                padding: '14px 16px', borderRadius: '12px',
                background: 'rgba(124,92,252,0.05)', border: '1px solid rgba(124,92,252,0.14)',
                marginBottom: '14px',
              }}>
                <div style={{ fontSize: '9px', fontWeight: '700', color: 'var(--txt-faint)', letterSpacing: '0.12em', marginBottom: '12px' }}>SCORE BREAKDOWN</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                    <span style={{ color: 'var(--txt-muted)' }}>Steps × 100</span>
                    <span style={{ color: 'var(--green)', fontWeight: '700' }}>+{stepsCompleted * 100}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                    <span style={{ color: 'var(--txt-muted)' }}>Penalties × 25</span>
                    <span style={{ color: rejections > 0 ? '#f87171' : 'var(--txt-faint)', fontWeight: '700' }}>−{rejections * 25}</span>
                  </div>
                  <div style={{ height: '1px', background: 'var(--border)', margin: '2px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: 'var(--txt-muted)' }}>Net Score</span>
                    <span style={{ fontFamily: '"Orbitron","Courier New",monospace', fontSize: '14px', fontWeight: '900', color: 'var(--brand)' }}>{scorePct}%</span>
                  </div>
                </div>
              </div>

              {/* Footer note */}
              <p style={{ fontSize: '11px', color: 'var(--txt-faint)', lineHeight: '1.6', margin: 0, padding: '0 2px' }}>
                Screenshots are stored in MongoDB Atlas and reviewed by Prof. Sandeep Patil.
              </p>

              {currentStep > total && (
                <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '10px', background: 'var(--green-fade)', border: '1px solid rgba(20,217,151,0.2)', fontSize: '12px', color: 'var(--green)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  🎓 Certificate Issued
                </div>
              )}
            </aside>

            {/* ══════ MAIN CONTENT ══════ */}
            <main className="main-content">
              {activeTab === 'race' ? (
                <RaceLeaderboard user={user} />
              ) : (
                <StepWizard user={user} refreshUser={fetchProgress} />
              )}
            </main>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
