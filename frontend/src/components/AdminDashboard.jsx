import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, CheckCircle2, Search, Image as ImageIcon, ShieldAlert, LogOut, ZoomIn, X } from 'lucide-react';
import axios from 'axios';
import { courseQuestions } from '../content';

export default function AdminDashboard({ onLogout }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [modalUser, setModalUser] = useState(null);

  useEffect(() => {
    let interval;
    const fetchDashboard = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/dashboard`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setData(res.data);
        setError('');
        
        // Update modal data if open
        setModalUser(prev => {
          if (!prev) return null;
          const updated = res.data.users.find(u => u._id === prev._id);
          return updated || prev;
        });
      } catch (err) {
        setError('Failed to fetch admin data. Session may have expired.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
    interval = setInterval(fetchDashboard, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '16px' }}>
      <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, #7c5cfc, #a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 24px rgba(124,92,252,0.5)' }}>
        <ShieldAlert size={20} color="#fff" />
      </div>
      <div className="spin" style={{ width: '20px', height: '20px', border: '2px solid rgba(255,255,255,0.08)', borderTopColor: 'var(--brand)', borderRadius: '50%' }} />
    </div>
  );

  if (error) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '16px' }}>
      <div style={{ color: 'var(--red)', background: 'var(--red-fade)', border: '1px solid rgba(248,113,113,0.3)', padding: '16px 24px', borderRadius: '12px' }}>{error}</div>
      <button className="btn btn-ghost" onClick={() => window.location.reload()}>Reload Page</button>
    </div>
  );

  const users = data.users.filter(u => !u.rollNumber?.startsWith('ADMIN_'));
  const filtered = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.rollNumber.toLowerCase().includes(search.toLowerCase())
  );

  const totalSteps = courseQuestions.length;

  return (
    <div className="app-shell" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      
      {/* ══════════════ PREMIUM ADMIN TOP BAR ══════════════ */}
      <header className="app-topbar" style={{ position: 'relative', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '34px', height: '34px', borderRadius: '9px',
            background: 'linear-gradient(135deg, #7c5cfc, #a78bfa)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 16px rgba(124,92,252,0.45)', flexShrink: 0,
          }}>
            <ShieldAlert size={17} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: '700', fontSize: '14px', letterSpacing: '-0.02em', color: 'var(--txt)', lineHeight: 1.2 }}>
              Course Administration
            </div>
            <div style={{ fontSize: '11px', color: 'var(--txt-faint)', fontWeight: '500' }}>
              DataPipeline Masterclass
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={14} color="var(--brand)" style={{ position: 'absolute', left: '12px', top: '10px' }} />
            <input 
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search students..."
              style={{ 
                width: '100%', boxSizing: 'border-box', 
                background: 'rgba(124,92,252,0.06)', border: '1px solid rgba(124,92,252,0.2)', 
                borderRadius: '8px', padding: '8px 16px 8px 36px', 
                color: '#fff', outline: 'none', fontSize: '12px',
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--brand)'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(124,92,252,0.2)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'rgba(124,92,252,0.2)'; e.currentTarget.style.boxShadow = 'none'; }}
            />
          </div>

          <div style={{ display: 'flex', gap: '16px', borderLeft: '1px solid rgba(255,255,255,0.08)', paddingLeft: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontFamily: '"Orbitron","Courier New",monospace', fontSize: '16px', fontWeight: '700', color: '#fff', lineHeight: 1 }}>{data.stats.totalStudents}</div>
              <div style={{ fontSize: '9px', color: 'var(--txt-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px' }}>Enrolled</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontFamily: '"Orbitron","Courier New",monospace', fontSize: '16px', fontWeight: '700', color: 'var(--green)', lineHeight: 1 }}>{data.stats.completedStudents}</div>
              <div style={{ fontSize: '9px', color: 'var(--txt-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px' }}>Completed</div>
            </div>
          </div>
          
          <button
            onClick={() => { localStorage.removeItem('token'); window.location.reload(); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 12px', fontSize: '12px', fontWeight: '600',
              borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)',
              background: 'transparent', cursor: 'pointer', marginLeft: '12px',
              color: 'var(--txt-muted)', transition: 'all 0.18s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.08)'; e.currentTarget.style.color = '#f87171'; e.currentTarget.style.borderColor = 'rgba(248,113,113,0.25)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--txt-muted)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
          >
            <LogOut size={13} /> Exit Admin Node
          </button>
        </div>
      </header>

      {/* ══════════════ DASHBOARD GRID BODY ══════════════ */}
      <main style={{ flex: 1, overflowY: 'auto', padding: '32px 40px', background: 'transparent' }}>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
          gap: '24px',
        }}>
          {filtered.map((u, i) => {
            const netScore = Math.max(0, (u.currentStep - 1)) * 100 - (u.rejectionCount * 25);
            const scorePct = Math.round((netScore / (totalSteps * 100)) * 100);
            
            return (
              <motion.div 
                key={u._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.03 }}
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '16px', padding: '20px',
                  display: 'flex', flexDirection: 'column', gap: '16px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                  backdropFilter: 'blur(10px)',
                  position: 'relative', overflow: 'hidden'
                }}
              >
                {/* Visual Top Glow */}
                <div style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(124,92,252,0.5), transparent)' }} />
                
                {/* Top Row: Google Auth Picture + Name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ position: 'relative' }}>
                    {u.picture ? (
                      <img src={u.picture} alt={u.name} style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.1)' }} />
                    ) : (
                      <div style={{ 
                        width: '48px', height: '48px', borderRadius: '50%', 
                        background: 'linear-gradient(135deg, #7c5cfc, #a78bfa)', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center', 
                        fontSize: '16px', fontWeight: '700', color: '#fff',
                        border: '2px solid rgba(255,255,255,0.1)'
                      }}>
                        {u.name.substring(0,2).toUpperCase()}
                      </div>
                    )}
                    {/* Status Badge */}
                    <div style={{ position: 'absolute', bottom: -4, right: -4, width: '18px', height: '18px', borderRadius: '50%', background: '#050507', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: u.isCompleted ? 'var(--green)' : 'var(--brand)', boxShadow: `0 0 6px ${u.isCompleted ? 'var(--green)' : 'var(--brand)'}` }} />
                    </div>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: '700', fontSize: '16px', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {u.name}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--txt-faint)', letterSpacing: '0.04em', fontFamily: 'monospace' }}>
                      {u.rollNumber}
                    </div>
                  </div>
                </div>

                {/* Second Row: Stats & Progress */}
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '11px', color: 'var(--txt-muted)', textTransform: 'uppercase', fontWeight: '600' }}>
                      <span>{u.isCompleted ? 'Course Graduated' : `Step ${u.currentStep} of ${totalSteps}`}</span>
                      <span style={{ fontFamily: '"Orbitron","Courier New",monospace', color: u.isCompleted ? 'var(--green)' : '#a78bfa' }}>{scorePct}%</span>
                    </div>
                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(100, Math.max(0, (u.currentStep - 1) / totalSteps * 100))}%`, background: u.isCompleted ? 'var(--green)' : 'linear-gradient(90deg, #7c5cfc, #a78bfa)', borderRadius: '3px', transition: 'width 0.5s ease-out' }} />
                    </div>
                  </div>
                  
                  {u.rejectionCount > 0 && (
                    <div style={{ marginLeft: '12px', background: 'rgba(248,113,113,0.1)', padding: '4px 8px', borderRadius: '6px', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171', fontSize: '11px', fontWeight: '600' }}>
                      {u.rejectionCount} FLAGS
                    </div>
                  )}
                </div>

                {/* Third Row: Evidence Button */}
                <button 
                  onClick={() => setModalUser(u)}
                  style={{ 
                    marginTop: '4px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.15)',
                    padding: '8px', borderRadius: '8px', cursor: 'pointer', color: 'var(--txt-muted)', fontSize: '12px', fontWeight: '600', transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--txt-muted)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                >
                  <ImageIcon size={14} /> View Evidence ({u.submissions?.length || 0})
                </button>

              </motion.div>
            );
          })}
        </div>

      </main>

      {/* ══════════════ EVIDENCE MODAL ══════════════ */}
      <AnimatePresence>
        {modalUser && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ 
              position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px'
            }}
            onClick={() => setModalUser(null)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{ 
                background: '#050507', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', 
                width: '100%', maxWidth: '900px', maxHeight: '100%', display: 'flex', flexDirection: 'column',
                boxShadow: '0 24px 48px rgba(0,0,0,0.6)'
              }}
            >
              <div style={{ padding: '24px 32px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  {modalUser.picture ? (
                    <img src={modalUser.picture} alt="" style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
                  ) : <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#7c5cfc' }} />}
                  <div>
                    <h2 style={{ fontSize: '20px', fontWeight: '800', margin: 0, color: '#fff' }}>{modalUser.name}</h2>
                    <div style={{ color: 'var(--txt-faint)', fontSize: '13px' }}>{modalUser.rollNumber} • {modalUser.email}</div>
                  </div>
                </div>
                <button onClick={() => setModalUser(null)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <X size={18} />
                </button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
                {modalUser.submissions && modalUser.submissions.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {modalUser.submissions.map((sub, i) => (
                      <div key={i} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', overflow: 'hidden' }}>
                        <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <CheckCircle2 size={16} color="var(--green)" />
                            <span style={{ fontWeight: '700', color: '#fff', fontSize: '14px' }}>Step {sub.stepId} Verification</span>
                          </div>
                          <span style={{ color: 'var(--txt-faint)', fontSize: '12px', fontWeight: '500' }}>{new Date(sub.submittedAt).toLocaleString()}</span>
                        </div>
                        <div style={{ padding: '24px', display: 'flex', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }}>
                          <img src={sub.imageData} alt={`Step ${sub.stepId}`} style={{ maxWidth: '100%', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '60px 40px', textAlign: 'center', color: 'var(--txt-muted)' }}>
                    <ImageIcon size={32} opacity={0.3} style={{ marginBottom: '16px' }} />
                    <div>No screenshot evidence uploaded yet.</div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
