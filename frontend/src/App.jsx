import { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import Login from './components/Login';
import StepWizard from './components/StepWizard';
import RollNumberEntry from './components/RollNumberEntry';
import AuthLayout from './components/AuthLayout';
import { courseQuestions } from './content';
import RaceLeaderboard from './components/RaceLeaderboard';
import AdminDashboard from './components/AdminDashboard';
import Certificate from './components/Certificate';
import { LogOut, Zap, Trophy, BookOpen, CheckCircle2, Lock, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import './index.css';

// ── Lazy load the heavy 564KB Lottie payload & engine completely off the main thread ──
const AsyncLottie = lazy(() => import('./components/LazyLottie'));

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState('course');
  const [showAdminPrompt, setShowAdminPrompt] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [viewingStep, setViewingStep] = useState(null);
  const [dashPhase, setDashPhase] = useState(0);

  useEffect(() => {
    if (user?.rollNumber) {
      setDashPhase(0);
      const t1 = setTimeout(() => setDashPhase(1), 300);
      const t2 = setTimeout(() => setDashPhase(2), 1500);
      const t3 = setTimeout(() => setDashPhase(3), 2500);
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }
  }, [user?.rollNumber, user?.currentStep, viewingStep]);

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
      // On progress refresh, if we just completed the step we were viewing, jump forward
      setViewingStep(null);
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
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '24px', background: 'var(--bg)' }}>
      <img src="/logo.png" alt="Logo" style={{ width: '120px', height: '120px', objectFit: 'contain', mixBlendMode: 'multiply' }} />
      <div className="spin" style={{ width: '28px', height: '28px', border: '3px solid rgba(91,62,240,0.1)', borderTopColor: 'var(--brand)', borderRadius: '50%' }} />
    </div>
  );

  const currentStep = user?.currentStep ?? 1;
  const actualStep = viewingStep ?? currentStep;
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

      {/* ══════════════ GLOBAL PERSISTENT NAVBAR ══════════════ */}
      <nav className="auth-nav" style={{ zIndex: 10001, width: '100%', justifyContent: 'space-between' }}>
        <div className="auth-nav-brand">
          <img src="/logo.png" alt="AtlasDB Logo" className="auth-nav-logo" />
          <div className="auth-nav-text">
            <span className="auth-nav-name">AtlasDB</span>
            <span className="auth-nav-tagline">Smart Database System</span>
          </div>
        </div>

        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Tab switcher */}
            <div style={{
              display: 'flex', background: 'var(--surface)',
              borderRadius: '10px', padding: '3px', gap: '2px',
              border: '1px solid var(--border)',
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
                      ? tab.id === 'race' ? 'var(--brand-fade)' : '#ffffff'
                      : 'transparent',
                    color: activeTab === tab.id
                      ? tab.id === 'race' ? 'var(--brand)' : 'var(--txt)'
                      : 'var(--txt-muted)',
                    boxShadow: activeTab === tab.id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                    transition: 'all 0.18s',
                  }}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            <div style={{ position: 'relative' }}>
              <button 
                onClick={() => setShowProfileMenu(p => !p)}
                style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, #5b3ef0, #7c5cfc)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '12px', fontWeight: '700', color: '#fff',
                  border: 'none', cursor: 'pointer',
                  flexShrink: 0, boxShadow: '0 0 8px rgba(91,62,240,0.25)',
                }}>
                {initials}
              </button>

              <AnimatePresence>
                {showProfileMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                    style={{
                      position: 'absolute', top: 'calc(100% + 12px)', right: 0,
                      transformOrigin: 'top right',
                      width: '260px', background: '#fff', borderRadius: '16px',
                      boxShadow: '0 10px 40px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.05)',
                      border: '1px solid var(--border)', padding: '24px 20px', zIndex: 100,
                      display: 'flex', flexDirection: 'column', gap: '16px'
                    }}
                  >
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ 
                        width: '56px', height: '56px', borderRadius: '50%', 
                        background: 'linear-gradient(135deg, #5b3ef0, #7c5cfc)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '22px', fontWeight: '800', color: '#fff', margin: '0 auto 12px',
                        boxShadow: '0 4px 12px rgba(91,62,240,0.3)'
                      }}>
                        {initials}
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--txt)', lineHeight: 1.2, marginBottom: '6px' }}>
                        {user.name}
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--txt-muted)', fontWeight: '500' }}>
                        {user.email || 'No email associated'}
                      </div>
                    </div>
                    
                    <div style={{ height: '1px', background: 'var(--border)' }} />
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', color: 'var(--txt-muted)', fontWeight: '600' }}>Roll No</span>
                      <span style={{ fontSize: '13px', color: 'var(--txt)', fontWeight: '700', background: 'var(--bg)', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                        {user.rollNumber}
                      </span>
                    </div>

                    <div style={{ height: '1px', background: 'var(--border)', marginTop: '4px' }} />

                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                      <button
                        onClick={() => { setShowProfileMenu(false); setShowAdminPrompt(true); }}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0, width: '40px', height: '40px', borderRadius: '10px',
                          border: '1px solid var(--border)', background: 'transparent',
                          color: 'var(--txt-muted)', cursor: 'pointer', transition: 'all 0.18s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.color = 'var(--brand)'; e.currentTarget.style.borderColor = 'var(--brand)'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = 'var(--txt-muted)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                      >
                        <Lock size={15} />
                      </button>
                      <button
                        onClick={handleLogout}
                        style={{
                          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                          padding: '10px', fontSize: '13px', fontWeight: '600',
                          borderRadius: '10px', border: '1px solid rgba(230,69,69,0.2)',
                          background: 'rgba(230,69,69,0.05)', cursor: 'pointer',
                          color: 'var(--red)', transition: 'all 0.18s'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(230,69,69,0.1)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(230,69,69,0.05)'; }}
                      >
                        <LogOut size={14} /> Sign out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </nav>

      {/* ══════════════ BODY ══════════════ */}
      <AnimatePresence mode="wait">
        {(!user || !user.rollNumber || showAdminPrompt) ? (
          <motion.div key="auth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ scale: 0.8, opacity: 0, transition: { duration: 0.8, ease: 'easeIn' } }}>
            <AuthLayout>
              <AnimatePresence mode="wait">
                {!user ? (
                  <Login key="login" onLoginSuccess={(u) => setUser(u)} />
                ) : (
                  <div key="roll" style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <RollNumberEntry user={user} onConfirm={({ rollNumber }) => {
                      setUser(prev => ({ ...prev, rollNumber }));
                      setShowAdminPrompt(false);
                    }} />
                    {showAdminPrompt && (
                      <button 
                        onClick={() => setShowAdminPrompt(false)}
                        style={{ position: 'absolute', top: 20, right: 20, zIndex: 10000, background: '#fff', border: '1px solid var(--border)', color: 'var(--txt)', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                      >
                        Cancel Update
                      </button>
                    )}
                  </div>
                )}
              </AnimatePresence>
            </AuthLayout>
          </motion.div>
        ) : (
          <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="auth-layout" style={{ display: 'flex', width: '100%', height: '100%' }}>
            
            {/* ══════ LEFT DASHBOARD CONTENT ══════ */}
            <motion.div 
               initial={{ x: '-100vw' }}
               animate={{ x: 0 }}
               transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
               style={{ flex: 1, display: 'flex', overflow: 'hidden', background: 'var(--bg)' }}
            >


            {/* ══════ PREMIUM SIDEBAR ══════ */}
            <AnimatePresence>
              {activeTab !== 'race' && (
                <motion.aside 
                  className="sidebar" 
                  initial={{ x: -260, width: 0, opacity: 0 }}
                  animate={{ x: 0, width: 260, opacity: 1 }}
                  exit={{ x: -260, width: 0, opacity: 0 }}
                  transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
                  style={{ flexShrink: 0, borderRight: '1px solid var(--border)', overflow: 'hidden' }}
                >
                  <div style={{ width: '260px', height: '100%', overflowY: 'auto' }}>


              {/* Student Card */}
              {user.name && (
                <div style={{
                  padding: '14px 16px', borderRadius: '14px', marginBottom: '20px',
                  background: 'linear-gradient(135deg, rgba(91,62,240,0.07) 0%, rgba(91,62,240,0.02) 100%)',
                  border: '1px solid rgba(91,62,240,0.14)',
                  display: 'flex', alignItems: 'center', gap: '12px',
                  position: 'relative', overflow: 'hidden',
                }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(91,62,240,0.25), transparent)' }} />
                  <div style={{
                    width: '38px', height: '38px', borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg, #5b3ef0, #7c5cfc)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '14px', fontWeight: '700', color: '#fff',
                    boxShadow: '0 0 10px rgba(91,62,240,0.25)',
                  }}>
                    {initials}
                  </div>
                  <div style={{ overflow: 'hidden', flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--txt)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
                    <div style={{ fontSize: '10px', color: 'var(--brand)', fontWeight: '600', letterSpacing: '0.06em', marginTop: '1px', opacity: 0.7 }}>
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
              <div style={{ height: '3px', borderRadius: '99px', background: 'var(--surface-3)', marginBottom: '14px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: '99px',
                  background: 'linear-gradient(90deg, #5b3ef0, #0da271)',
                  width: `${progressPct}%`,
                  transition: 'width 0.8s cubic-bezier(.4,0,.2,1)',
                }} />
              </div>

              {/* Step List Container timed to dashPhase */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginBottom: '20px' }}>
                  {courseQuestions.map((q) => {
                  const isDone = q.id < currentStep;
                  const isActive = q.id === actualStep;
                  const isLocked = q.id > currentStep;
                  const subtitle = q.title?.split(': ')[1] || q.title || q.question?.slice(0, 32) + '…';

                  return (
                    <div
                      key={q.id}
                      onClick={() => {
                        if (!isLocked) setViewingStep(q.id);
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '9px 12px', borderRadius: '10px', cursor: isLocked ? 'default' : 'pointer',
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
                            : '1px solid var(--border-hi)',
                        boxShadow: isDone
                          ? '0 0 6px rgba(13,162,113,0.3)'
                          : isActive
                            ? '0 0 8px rgba(91,62,240,0.3)'
                            : 'none',
                        fontSize: '10px', fontWeight: '700',
                        color: isDone ? '#fff' : isActive ? '#fff' : 'var(--txt-faint)',
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
            </motion.div>

            {/* Divider */}
              <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0 18px' }} />

              {/* Score breakdown */}
              <div style={{
                padding: '14px 16px', borderRadius: '12px',
                background: 'var(--brand-fade)', border: '1px solid rgba(91,62,240,0.12)',
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
                    <span style={{ color: rejections > 0 ? 'var(--red)' : 'var(--txt-faint)', fontWeight: '700' }}>−{rejections * 25}</span>
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
                  </div>
                </motion.aside>
              )}
            </AnimatePresence>

            {/* ══════ MAIN CONTENT ══════ */}
            <main className="main-content" style={{ flex: 1, overflowY: 'hidden', display: 'flex', flexDirection: 'column', padding: activeTab === 'race' ? 0 : undefined }}>
              {activeTab === 'course' ? (
                currentStep > total ? (
                  <Certificate name={user.name} email={user.email} completedAt={user.completedAt} rollNumber={user.rollNumber} />
                ) : (
                  <StepWizard user={{ ...user, currentStep: actualStep }} maxStep={currentStep} refreshUser={fetchProgress} dashPhase={dashPhase} />
                )
              ) : (
                <RaceLeaderboard user={user} />
              )}
                </main>
            </motion.div>

            {/* ══════ RIGHT LOTTIE PANEL ══════ */}
            <AnimatePresence>
              {activeTab !== 'race' && (
                <motion.div 
                    className="auth-lottie-panel"
                    initial={{ y: 50, opacity: 0, width: 0 }}
                    animate={{ y: 0, opacity: 1, width: 450 }}
                    exit={{ y: 200, opacity: 0, width: 0 }}
                    transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
                    style={{ flexShrink: 0, borderLeft: 'none', padding: 0, display: 'flex', justifyContent: 'flex-end', overflow: 'hidden' }}
                >
                    <div style={{ width: '450px', height: '100%' }}>
                      <Suspense fallback={null}>
                        <AsyncLottie
                            loop
                            autoplay
                            style={{ width: '100%', height: '100%' }}
                            rendererSettings={{ preserveAspectRatio: 'xMidYMid meet' }}
                        />
                      </Suspense>
                    </div>
                </motion.div>
              )}
            </AnimatePresence>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
