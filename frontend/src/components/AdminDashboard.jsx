import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, CheckCircle2, Search, Image as ImageIcon, ShieldAlert, X, Zap, ArrowRight } from 'lucide-react';
import axios from 'axios';
import { courseQuestions } from '../content';

export default function AdminDashboard({ onLogout }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);

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
        
        if (selectedUser) {
          const updated = res.data.users.find(u => u._id === selectedUser._id);
          if (updated) setSelectedUser(updated);
        }
      } catch (err) {
        setError('Failed to fetch admin data. Session may have expired.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
    interval = setInterval(fetchDashboard, 5000);
    return () => clearInterval(interval);
  }, [selectedUser]);

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

  const users = data.users.filter(u => !u.rollNumber.startsWith('ADMIN_'));
  const filtered = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.rollNumber.toLowerCase().includes(search.toLowerCase())
  );

  const totalSteps = courseQuestions.length;

  return (
    <div className="app-shell" style={{ display: 'block', height: '100vh', overflow: 'hidden' }}>
      
      {/* ══════════════ PREMIUM ADMIN TOP BAR ══════════════ */}
      <header className="app-topbar" style={{ position: 'relative', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '34px', height: '34px', borderRadius: '9px',
            background: 'linear-gradient(135deg, #f43f5e, #fb7185)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 16px rgba(244,63,94,0.45)', flexShrink: 0,
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
          <div style={{ display: 'flex', gap: '16px', borderRight: '1px solid rgba(255,255,255,0.08)', paddingRight: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <div style={{ fontFamily: '"Orbitron","Courier New",monospace', fontSize: '16px', fontWeight: '700', color: '#fff', lineHeight: 1 }}>{data.stats.totalStudents}</div>
              <div style={{ fontSize: '9px', color: 'var(--txt-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px' }}>Total Enrolled</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
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
              background: 'transparent', cursor: 'pointer',
              color: 'var(--txt-muted)', transition: 'all 0.18s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.08)'; e.currentTarget.style.color = '#f87171'; e.currentTarget.style.borderColor = 'rgba(248,113,113,0.25)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--txt-muted)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
          >
            <LogOut size={13} /> Exit Admin Node
          </button>
        </div>
      </header>

      {/* ══════════════ DASHBOARD BODY ══════════════ */}
      <main style={{ display: 'flex', height: 'calc(100vh - 61px)', width: '100%', overflow: 'hidden' }}>
        
        {/* Left: Master Roster */}
        <div style={{ 
          width: '400px', flexShrink: 0, borderRight: '1px solid var(--border)', 
          background: 'rgba(255,255,255,0.01)', display: 'flex', flexDirection: 'column',
          backdropFilter: 'blur(10px)'
        }}>
          {/* Search Header */}
          <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} color="var(--brand)" style={{ position: 'absolute', left: '14px', top: '12px' }} />
              <input 
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search students..."
                style={{ 
                  width: '100%', boxSizing: 'border-box', 
                  background: 'rgba(124,92,252,0.06)', border: '1px solid rgba(124,92,252,0.2)', 
                  borderRadius: '10px', padding: '10px 16px 10px 40px', 
                  color: '#fff', outline: 'none', fontSize: '13px',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--brand)'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(124,92,252,0.2)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = 'rgba(124,92,252,0.2)'; e.currentTarget.style.boxShadow = 'none'; }}
              />
            </div>
          </div>

          {/* Roster List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
            {filtered.map(u => {
              const netScore = Math.max(0, (u.currentStep - 1)) * 100 - (u.rejectionCount * 25);
              const scorePct = Math.round((netScore / (totalSteps * 100)) * 100);
              const isSelected = selectedUser?._id === u._id;
              
              return (
                <div 
                  key={u._id}
                  onClick={() => setSelectedUser(u)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 16px', borderRadius: '12px', cursor: 'pointer',
                    background: isSelected ? 'linear-gradient(135deg, rgba(124,92,252,0.12) 0%, rgba(124,92,252,0.04) 100%)' : 'transparent',
                    border: isSelected ? '1px solid rgba(124,92,252,0.3)' : '1px solid transparent',
                    marginBottom: '4px', transition: 'all 0.2s',
                    position: 'relative', overflow: 'hidden'
                  }}
                  onMouseEnter={e => { if(!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                  onMouseLeave={e => { if(!isSelected) e.currentTarget.style.background = 'transparent'; }}
                >
                  {isSelected && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px', background: 'var(--brand)', boxShadow: '0 0 8px var(--brand)' }} />}
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ 
                      width: '36px', height: '36px', borderRadius: '10px', 
                      background: isSelected ? 'linear-gradient(135deg, #7c5cfc, #a78bfa)' : 'rgba(255,255,255,0.05)', 
                      border: isSelected ? 'none' : '1px solid rgba(255,255,255,0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', 
                      fontSize: '13px', fontWeight: '700', color: isSelected ? '#fff' : 'var(--txt-muted)',
                      boxShadow: isSelected ? '0 0 12px rgba(124,92,252,0.4)' : 'none'
                    }}>
                      {u.name.substring(0,2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '14px', color: isSelected ? '#fff' : 'var(--txt)', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '170px' }}>
                        {u.name}
                      </div>
                      <div style={{ fontSize: '11px', color: isSelected ? '#a78bfa' : 'var(--txt-faint)', fontWeight: '500', letterSpacing: '0.04em' }}>
                        {u.rollNumber}
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ textAlign: 'right' }}>
                    {u.isCompleted ? (
                      <div style={{ fontSize: '11px', color: 'var(--green)', fontWeight: '700', background: 'var(--green-fade)', padding: '2px 8px', borderRadius: '12px', border: '1px solid rgba(20,217,151,0.2)' }}>
                        GRADUATE
                      </div>
                    ) : (
                      <>
                        <div style={{ fontSize: '11px', color: 'var(--brand)', fontWeight: '700', marginBottom: '2px' }}>STEP {u.currentStep}</div>
                        <div style={{ fontSize: '10px', color: 'var(--txt-faint)', fontFamily: '"Orbitron","Courier New",monospace' }}>{scorePct}%</div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Detailed Deep Dive Panel */}
        <div style={{ flex: 1, position: 'relative', overflowY: 'auto', background: 'transparent' }}>
          <AnimatePresence mode="wait">
            {selectedUser ? (
              <motion.div 
                key="student-detail"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                style={{ padding: '40px 56px', maxWidth: '800px', margin: '0 auto' }}
              >
                {/* Header Card */}
                <div style={{ 
                  background: 'linear-gradient(135deg, rgba(124,92,252,0.08) 0%, rgba(20,217,151,0.03) 100%)',
                  borderRadius: '20px', padding: '32px', border: '1px solid rgba(124,92,252,0.2)',
                  marginBottom: '32px', position: 'relative', overflow: 'hidden',
                  boxShadow: '0 8px 32px -8px rgba(0,0,0,0.4)',
                  backdropFilter: 'blur(12px)'
                }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, #7c5cfc, #14d997)' }} />
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                      <div style={{ 
                        width: '72px', height: '72px', borderRadius: '18px', 
                        background: 'linear-gradient(135deg, #7c5cfc, #5b3fe0)', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center', 
                        fontSize: '28px', fontWeight: '800', color: '#fff',
                        boxShadow: '0 0 24px rgba(124,92,252,0.5)'
                      }}>
                        {selectedUser.name.substring(0,2).toUpperCase()}
                      </div>
                      <div>
                        <h2 style={{ fontSize: '28px', fontWeight: '800', margin: '0 0 4px', letterSpacing: '-0.02em', color: '#fff' }}>{selectedUser.name}</h2>
                        <div style={{ color: 'var(--txt-muted)', fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ color: '#a78bfa', letterSpacing: '0.05em' }}>{selectedUser.rollNumber}</span>
                          <span>•</span>
                          <span>{selectedUser.email}</span>
                        </div>
                      </div>
                    </div>
                    
                    <button onClick={() => setSelectedUser(null)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--txt-muted)', cursor: 'pointer', padding: '8px', borderRadius: '10px', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = 'var(--txt-muted)'}>
                      <X size={20} />
                    </button>
                  </div>

                  <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '24px 0' }} />

                  {/* Quick Stats Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--txt-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Current Phase</div>
                      <div style={{ fontSize: '16px', fontWeight: '700', color: selectedUser.isCompleted ? 'var(--green)' : '#fff' }}>
                        {selectedUser.isCompleted ? 'Course Completed' : `Step ${selectedUser.currentStep} of ${totalSteps}`}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--txt-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>AI Rejections</div>
                      <div style={{ fontSize: '16px', fontWeight: '700', color: selectedUser.rejectionCount > 0 ? '#f87171' : 'var(--txt-muted)' }}>
                        {selectedUser.rejectionCount} Penalties
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--txt-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Processing Status</div>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: selectedUser.ocrStatus === 'PROCESSING' ? '#fbbf24' : selectedUser.ocrStatus === 'REJECTED' ? '#f87171' : 'var(--txt-muted)', background: 'rgba(255,255,255,0.04)', display: 'inline-flex', padding: '4px 10px', borderRadius: '8px' }}>
                        {selectedUser.ocrStatus}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Verification Evidence Gallery */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(20,217,151,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(20,217,151,0.3)' }}>
                      <ImageIcon size={16} color="var(--green)" />
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0, color: '#fff' }}>Verification Evidence</h3>
                  </div>

                  {selectedUser.submissions && selectedUser.submissions.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                      {selectedUser.submissions.map((sub, i) => (
                        <div key={i} style={{ 
                          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', 
                          borderRadius: '16px', overflow: 'hidden', backdropFilter: 'blur(8px)',
                          boxShadow: '0 4px 16px rgba(0,0,0,0.2)'
                        }}>
                          <div style={{ 
                            padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', 
                            background: 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <CheckCircle2 size={16} color="var(--green)" />
                              <span style={{ fontWeight: '700', color: '#fff', fontSize: '14px' }}>Step {sub.stepId} Passed</span>
                            </div>
                            <span style={{ color: 'var(--txt-faint)', fontSize: '12px', fontWeight: '500' }}>{new Date(sub.submittedAt).toLocaleString()}</span>
                          </div>
                          <div style={{ padding: '24px', display: 'flex', justifyContent: 'center', background: 'rgba(0,0,0,0.3)' }}>
                            <img src={sub.imageData} alt={`Step ${sub.stepId}`} style={{ maxWidth: '100%', maxHeight: '500px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', cursor: 'zoom-in' }} onClick={(e) => { if(e.target.style.maxHeight==='500px') { e.target.style.maxHeight='none'; e.target.style.cursor='zoom-out'; } else { e.target.style.maxHeight='500px'; e.target.style.cursor='zoom-in'; } }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: '60px 40px', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '16px', background: 'rgba(255,255,255,0.01)' }}>
                      <ImageIcon size={32} color="rgba(255,255,255,0.1)" style={{ marginBottom: '16px' }} />
                      <div style={{ color: 'var(--txt-muted)', fontSize: '14px', fontWeight: '500' }}>No verification screenshots uploaded yet.</div>
                      <div style={{ color: 'var(--txt-faint)', fontSize: '13px', marginTop: '4px' }}>When the student submits proof, it will appear chronologically here.</div>
                    </div>
                  )}
                </div>

              </motion.div>
            ) : (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px' }}
              >
                <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: 'linear-gradient(135deg, rgba(124,92,252,0.1), rgba(20,217,151,0.05))', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', border: '1px solid rgba(124,92,252,0.15)' }}>
                  <Users size={36} color="var(--brand)" opacity={0.8} />
                </div>
                <h3 style={{ fontSize: '24px', fontWeight: '800', color: '#fff', margin: '0 0 12px', letterSpacing: '-0.02em' }}>Select a Student Profile</h3>
                <p style={{ color: 'var(--txt-muted)', fontSize: '15px', lineHeight: 1.6, maxWidth: '400px', margin: 0 }}>
                  Click on any enrolled student from the master roster to view their detailed timeline, progression stats, and AI-verified screenshot evidence.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
