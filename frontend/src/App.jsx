import { useState, useEffect } from 'react';
import Login from './components/Login';
import StepWizard from './components/StepWizard';
import RollNumberEntry from './components/RollNumberEntry';
import { courseQuestions } from './content';
import { LogOut, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import './index.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    const checkSession = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const res = await axios.get('http://localhost:5000/api/progress', {
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
          });
        } catch (err) {
          // If session conflict, sign out quietly
          const code = err?.response?.data?.error;
          if (code === 'SESSION_CONFLICT') {
            setLoginError(err.response.data.message);
          }
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
        // Clear session on the server FIRST so other devices can log in
        await axios.post('http://localhost:5000/api/auth/logout', {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch { /* ignore — still clear locally */ }
    }
    localStorage.removeItem('token');
    setUser(null);
    setLoginError('');
  };

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'100vh' }}>
      <div className="spin" style={{ width:'32px', height:'32px', border:'2px solid var(--border)', borderTopColor:'var(--brand)', borderRadius:'50%' }} />
    </div>
  );

  const currentStep = user?.currentStep ?? 1;
  const total = courseQuestions.length;

  return (
    <div className="app-shell">
      {/* ── Top Bar ── */}
      <header className="app-topbar">
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <div style={{ width:'32px', height:'32px', background:'var(--brand)', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Zap size={17} color="#fff" />
          </div>
          <span style={{ fontWeight:'700', fontSize:'15px', letterSpacing:'-0.02em' }}>
            DataPipeline <span style={{ color:'var(--txt-muted)', fontWeight:'400' }}>/ Sandeep Patil</span>
          </span>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
          {user && (
            <>
              <span className="chip">
                Step {Math.min(currentStep, total)} of {total}
              </span>
              <button className="btn btn-ghost" onClick={handleLogout} style={{ padding:'7px 14px', fontSize:'13px' }}>
                <LogOut size={14} /> Sign out
              </button>
            </>
          )}
        </div>
      </header>

      {/* ── Body ── */}
      <AnimatePresence mode="wait">
        {!user ? (
          <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}>
            <Login onLoginSuccess={(u) => setUser(u)} />
          </motion.div>
        ) : (
          <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="app-body">
            {/* Roll Number Gate */}
            {!user.rollNumber && (
              <RollNumberEntry user={user} onConfirm={({ rollNumber }) =>
                setUser(prev => ({ ...prev, rollNumber }))
              } />
            )}
            {/* Left Sidebar */}
            <aside className="sidebar">
              {/* Student indicator */}
              {user.name && (
                <div style={{ padding:'12px 14px', borderRadius:'var(--radius-md)', background:'var(--surface-3)', border:'1px solid var(--border)', marginBottom:'24px', display:'flex', alignItems:'center', gap:'10px' }}>
                  <div style={{ width:'32px', height:'32px', borderRadius:'50%', background:'var(--brand)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px', fontWeight:'700', color:'#fff', flexShrink:0 }}>
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ overflow:'hidden' }}>
                    <div style={{ fontSize:'13px', fontWeight:'600', color:'var(--txt)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{user.name}</div>
                    <div style={{ fontSize:'11px', color:'var(--txt-faint)' }}>Student</div>
                  </div>
                </div>
              )}

              <p className="chip" style={{ paddingLeft:'4px', marginBottom:'12px' }}>Course Progress</p>

              {courseQuestions.map((q) => {
                const isDone = q.id < currentStep;
                const isActive = q.id === currentStep;
                const isLocked = q.id > currentStep;
                const subtitle = q.title.split(': ')[1] || q.title;
                return (
                  <div key={q.id} className={`step-row ${isDone ? 'completed' : ''} ${isActive ? 'active' : ''} ${isLocked ? 'locked' : ''}`}>
                    <span className="step-num">
                      {isDone ? '✓' : q.id}
                    </span>
                    <div>
                      <div className="step-title">{subtitle}</div>
                      {isActive && <div style={{ fontSize:'11px', color:'var(--brand)', fontWeight:'600', marginTop:'2px' }}>In progress</div>}
                      {isDone && <div style={{ fontSize:'11px', color:'var(--green)', fontWeight:'600', marginTop:'2px' }}>Verified ✓</div>}
                    </div>
                  </div>
                );
              })}

              <div className="divider" />

              {/* Progress */}
              <div style={{ padding:'0 4px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:'12px', color:'var(--txt-muted)', marginBottom:'10px', fontWeight:'500' }}>
                  <span>Completion</span>
                  <span style={{ color: currentStep > total ? 'var(--green)' : 'var(--txt)', fontWeight:'700' }}>
                    {currentStep > total ? '100%' : `${Math.round(((currentStep - 1) / total) * 100)}%`}
                  </span>
                </div>
                <div className="progress-track" style={{ height:'6px' }}>
                  <div className="progress-fill" style={{ width:`${currentStep > total ? 100 : ((currentStep - 1) / total) * 100}%` }} />
                </div>
              </div>

              <div className="divider" />

              <div style={{ padding:'0 4px', display:'flex', flexDirection:'column', gap:'8px' }}>
                <p style={{ fontSize:'12px', color:'var(--txt-faint)', lineHeight:'1.6', margin:0 }}>
                  Screenshots are stored in MongoDB Atlas and reviewed by Prof. Sandeep Patil.
                </p>
                {currentStep > total && (
                  <div style={{ marginTop:'8px', padding:'10px 12px', borderRadius:'var(--radius-sm)', background:'var(--green-fade)', border:'1px solid rgba(20,217,151,0.2)', fontSize:'12px', color:'var(--green)', fontWeight:'600', display:'flex', alignItems:'center', gap:'6px' }}>
                    🎓 Certificate Issued
                  </div>
                )}
              </div>
            </aside>

            {/* Main Panel */}
            <main className="main-content">
              <StepWizard user={user} refreshUser={() => window.location.reload()} />
            </main>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
