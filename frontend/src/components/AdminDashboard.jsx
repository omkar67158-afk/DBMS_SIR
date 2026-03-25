import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Activity, CheckCircle2, Search, Video, Image as ImageIcon, ShieldAlert, X } from 'lucide-react';
import axios from 'axios';

export default function AdminDashboard() {
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
        
        // Update selected user implicitly if new data arrives
        if (selectedUser) {
          const updated = res.data.users.find(u => u._id === selectedUser._id);
          if (updated) setSelectedUser(updated);
        }
      } catch (err) {
        setError('Failed to fetch admin data. ensure you are logged in as an admin.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
    interval = setInterval(fetchDashboard, 5000); // Live refresh every 5s
    return () => clearInterval(interval);
  }, [selectedUser]);

  if (loading && !data) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#050507', color: '#fff' }}>
      <div className="spin" style={{ width: '40px', height: '40px', border: '3px solid rgba(124,92,252,0.2)', borderTopColor: '#7c5cfc', borderRadius: '50%' }} />
    </div>
  );

  if (error) return <div style={{ color: '#f87171', padding: '40px', textAlign: 'center' }}>{error}</div>;

  const users = data.users.filter(u => !u.rollNumber.startsWith('ADMIN_'));
  const filtered = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.rollNumber.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ minHeight: '100vh', background: '#050507', color: '#fff', fontFamily: 'var(--font)' }}>
      {/* Admin Topbar */}
      <header style={{ 
        padding: '16px 32px', borderBottom: '1px solid rgba(255,255,255,0.08)', 
        background: 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#f43f5e', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 16px rgba(244,63,94,0.4)' }}>
            <ShieldAlert size={16} color="#000" />
          </div>
          <div>
            <h1 style={{ fontSize: '15px', fontWeight: '700', margin: 0 }}>Command Center</h1>
            <div style={{ fontSize: '11px', color: 'var(--txt-faint)' }}>Admin Race Tracking</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '24px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '20px', fontWeight: '800', color: '#fff' }}>{data.stats.totalStudents}</div>
            <div style={{ fontSize: '10px', color: 'var(--txt-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Students</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '20px', fontWeight: '800', color: '#10b981' }}>{data.stats.completedStudents}</div>
            <div style={{ fontSize: '10px', color: 'var(--txt-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Completed</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '20px', fontWeight: '800', color: '#3b82f6' }}>{data.stats.activeNow}</div>
            <div style={{ fontSize: '10px', color: 'var(--txt-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Now (5m)</div>
          </div>
        </div>
      </header>

      <main style={{ padding: '32px', display: 'flex', gap: '24px', height: 'calc(100vh - 73px)', boxSizing: 'border-box' }}>
        
        {/* Left: Master List */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
          <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} color="var(--txt-muted)" style={{ position: 'absolute', left: '16px', top: '14px' }} />
              <input 
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search students by roll number or name..."
                style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '12px 16px 12px 42px', color: '#fff', outline: 'none' }}
              />
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
            {filtered.map(u => {
              const isActive = u.lastActiveAt && (new Date() - new Date(u.lastActiveAt)) < 5 * 60 * 1000;
              const isSelected = selectedUser?._id === u._id;
              
              return (
                <div 
                  key={u._id}
                  onClick={() => setSelectedUser(u)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '16px', borderRadius: '12px', cursor: 'pointer',
                    background: isSelected ? 'rgba(124,92,252,0.1)' : 'transparent',
                    border: isSelected ? '1px solid rgba(124,92,252,0.3)' : '1px solid transparent',
                    marginBottom: '4px', transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => { if(!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                  onMouseLeave={e => { if(!isSelected) e.currentTarget.style.background = 'transparent'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ position: 'relative' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #374151, #1f2937)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700' }}>
                        {u.name.substring(0,2).toUpperCase()}
                      </div>
                      {isActive && <div style={{ position: 'absolute', bottom: -2, right: -2, width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', border: '2px solid #050507' }} />}
                    </div>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '14px', color: isSelected ? '#fff' : 'var(--txt)' }}>{u.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--txt-faint)', fontFamily: 'monospace' }}>{u.rollNumber}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {u.isCompleted ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#10b981', fontWeight: '600', padding: '4px 10px', background: 'rgba(16,185,129,0.1)', borderRadius: '20px' }}>
                        <CheckCircle2 size={14} /> Done
                      </div>
                    ) : (
                      <div style={{ fontSize: '12px', color: 'var(--brand)', fontWeight: '600', padding: '4px 10px', background: 'rgba(124,92,252,0.1)', borderRadius: '20px' }}>
                        Step {u.currentStep}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Detailed Deep Dive Panel */}
        {selectedUser ? (
          <div style={{ flex: 1.5, background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', overflowY: 'auto' }}>
            {/* Header */}
            <div style={{ padding: '24px 32px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: '700', margin: '0 0 4px 0' }}>{selectedUser.name}</h2>
                <div style={{ color: 'var(--txt-muted)', fontSize: '13px' }}>{selectedUser.rollNumber} • {selectedUser.email}</div>
              </div>
              <button onClick={() => setSelectedUser(null)} style={{ background: 'none', border: 'none', color: 'var(--txt-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '32px' }}>
              
              {/* Webcam Feed Section */}
              <div style={{ marginBottom: '40px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--txt-muted)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Video size={16} /> Live Camera Feed (Snapshots)
                </h3>
                {selectedUser.cameraSnapshots && selectedUser.cameraSnapshots.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
                    {selectedUser.cameraSnapshots.slice().reverse().map((snap, i) => (
                      <div key={i} style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', background: '#000' }}>
                        <img src={snap.imageData} alt="webcam" style={{ width: '100%', height: 'auto', display: 'block', opacity: i === 0 ? 1 : 0.6 }} />
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '6px 8px', background: 'linear-gradient(transparent, rgba(0,0,0,0.8))', fontSize: '10px', color: '#fff', fontWeight: '500' }}>
                          {new Date(snap.timestamp).toLocaleTimeString()} {i === 0 && <span style={{ color: '#10b981', marginLeft: '6px' }}>● LIVE</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '32px', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.15)', borderRadius: '12px', color: 'var(--txt-faint)', fontSize: '13px' }}>
                    No camera frames captured yet for this session.
                  </div>
                )}
              </div>

              {/* Submissions Section */}
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--txt-muted)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ImageIcon size={16} /> Screenshot Evidence Gallery
                </h3>
                {selectedUser.submissions && selectedUser.submissions.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {selectedUser.submissions.map((sub, i) => (
                      <div key={i} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', overflow: 'hidden' }}>
                        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                          <span style={{ fontWeight: '600', color: 'var(--brand)' }}>Step {sub.stepId} Passed</span>
                          <span style={{ color: 'var(--txt-faint)' }}>{new Date(sub.submittedAt).toLocaleString()}</span>
                        </div>
                        <div style={{ padding: '16px', display: 'flex', justifyContent: 'center' }}>
                          <img src={sub.imageData} alt={`Step ${sub.stepId}`} style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '32px', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.15)', borderRadius: '12px', color: 'var(--txt-faint)', fontSize: '13px' }}>
                    No submissions uploaded yet.
                  </div>
                )}
              </div>

            </div>
          </div>
        ) : (
          <div style={{ flex: 1.5, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)' }}>
            <Users size={48} color="rgba(255,255,255,0.1)" style={{ marginBottom: '16px' }} />
            <h3 style={{ fontSize: '18px', color: 'var(--txt-muted)', margin: '0 0 8px' }}>Select a Student</h3>
            <p style={{ color: 'var(--txt-faint)', fontSize: '14px' }}>Click on any active student row to view their deep profile, screenshots, and live camera feed.</p>
          </div>
        )}

      </main>
    </div>
  );
}
