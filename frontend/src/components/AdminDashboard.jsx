import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, CheckCircle2, Search, Image as ImageIcon, ShieldAlert, LogOut, ZoomIn, X, Camera, Video, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { courseQuestions } from '../content';
import socket from '../socket';

export default function AdminDashboard({ onLogout }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [modalUser, setModalUser] = useState(null);

  const [cameraStatus, setCameraStatus] = useState('idle'); // idle | requesting | active | error
  const [cameraError, setCameraError] = useState('');
  
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);

  const rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  useEffect(() => {
    socket.connect();
    
    const onResponse = (data) => {
      if (data.accepted) {
        setCameraStatus('active');
      } else {
        setCameraStatus('error');
        setCameraError(data.reason || 'Student denied access.');
        setTimeout(() => setCameraStatus('idle'), 5000);
      }
    };

    const onError = (data) => {
      setCameraStatus('error');
      setCameraError(data.message);
      setTimeout(() => setCameraStatus('idle'), 5000);
    };

    const handleOffer = async (data) => {
      try {
        const pc = new RTCPeerConnection(rtcConfig);
        peerConnectionRef.current = pc;

        pc.ontrack = (event) => {
          if (remoteVideoRef.current && event.streams[0]) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
        };

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit('webrtc_ice_candidate', { targetSocketId: data.senderSocketId, candidate: event.candidate });
          }
        };

        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('webrtc_answer', { targetSocketId: data.senderSocketId, answer });
      } catch (err) {
        console.error("Admin WebRTC error:", err);
      }
    };

    const handleIceCandidate = async (data) => {
      if (!peerConnectionRef.current) return;
      try {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch (err) {
        console.error("Admin add ice candidate error:", err);
      }
    };

    const handleStop = () => {
      stopCameraConnection();
    };

    socket.on('camera_response', onResponse);
    socket.on('camera_error', onError);
    socket.on('webrtc_offer', handleOffer);
    socket.on('webrtc_ice_candidate', handleIceCandidate);
    socket.on('camera_stop', handleStop);

    return () => {
      socket.off('camera_response', onResponse);
      socket.off('camera_error', onError);
      socket.off('webrtc_offer', handleOffer);
      socket.off('webrtc_ice_candidate', handleIceCandidate);
      socket.off('camera_stop', handleStop);
    };
  }, []);

  const requestCamera = (student) => {
    setCameraStatus('requesting');
    setCameraError('');
    socket.emit('camera_request', { targetUserId: student._id });
  };

  const stopCameraConnection = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    setCameraStatus('idle');
  };

  const closeModal = () => {
    stopCameraConnection();
    setModalUser(null);
  };


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
            boxShadow: '0 0 16px rgba(124,92,252,0.45)', flexShrink: 0, overflow: 'hidden'
          }}>
            <img src="/logo.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                onClick={() => setModalUser(u)}
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '16px', padding: '20px',
                  display: 'flex', flexDirection: 'column', gap: '16px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                  backdropFilter: 'blur(10px)',
                  position: 'relative', overflow: 'hidden',
                  cursor: 'pointer'
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'rgba(124,92,252,0.4)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(124,92,252,0.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'; }}
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

                <div style={{ marginLeft: '12px', background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--txt)', fontSize: '11px', fontWeight: '600' }}>
                  {u.submissions?.length || 0} FILE{u.submissions?.length !== 1 && 'S'}
                </div>

              </motion.div>
            );
          })}
        </div>

      </main>

      {/* ══════════════ FULL SCREEN STUDENT DETAILS MODAL ══════════════ */}
      <AnimatePresence>
        {modalUser && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ 
              position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(5,5,7,0.85)', backdropFilter: 'blur(20px)',
              display: 'flex', padding: '40px'
            }}
            onClick={closeModal}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={e => e.stopPropagation()}
              style={{ 
                background: '#0a0a0e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '32px', 
                width: '100%', maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column',
                boxShadow: '0 32px 64px rgba(0,0,0,0.8), inset 0 1px 1px rgba(255,255,255,0.05)',
                overflow: 'hidden'
              }}
            >
              {/* Header */}
              <div style={{ padding: '24px 40px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'linear-gradient(180deg, rgba(255,255,255,0.03), transparent)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  {modalUser.picture ? (
                    <img src={modalUser.picture} alt="" style={{ width: '56px', height: '56px', borderRadius: '50%', border: '2px solid rgba(124,92,252,0.4)', boxShadow: '0 0 16px rgba(124,92,252,0.2)' }} />
                  ) : <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'linear-gradient(135deg, #7c5cfc, #a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: '800', color: '#fff', border: '2px solid rgba(124,92,252,0.4)', boxShadow: '0 0 16px rgba(124,92,252,0.2)' }}>{modalUser.name.substring(0,2).toUpperCase()}</div>}
                  <div>
                    <h1 style={{ fontSize: '28px', fontWeight: '800', margin: 0, color: '#fff', letterSpacing: '-0.02em' }}>{modalUser.name}</h1>
                    <div style={{ display: 'flex', gap: '12px', color: 'var(--txt-faint)', fontSize: '14px', marginTop: '4px', fontWeight: '500' }}>
                      <span style={{ color: '#a78bfa' }}>{modalUser.rollNumber}</span>
                      <span>•</span>
                      <span>{modalUser.email}</span>
                      {modalUser.isCompleted && (
                        <>
                          <span>•</span>
                          <span style={{ color: 'var(--green)', display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircle2 size={14} /> Completed Course</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                <button onClick={closeModal} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '12px', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}>
                  <X size={24} />
                </button>
              </div>

              {/* Body */}
              <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                
                {/* Left Panel: Camera Stream & Actions */}
                <div style={{ flex: '0 0 45%', borderRight: '1px solid rgba(255,255,255,0.08)', padding: '40px', display: 'flex', flexDirection: 'column', gap: '32px', background: '#08080c' }}>
                  
                  {/* Camera Viewer Box */}
                  <div style={{ 
                    flex: 1, border: cameraStatus === 'active' ? '2px solid rgba(20, 217, 151, 0.4)' : '1px solid rgba(255,255,255,0.08)', 
                    borderRadius: '24px', background: 'rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column',
                    overflow: 'hidden', position: 'relative', boxShadow: cameraStatus === 'active' ? '0 0 40px rgba(20, 217, 151, 0.1)' : 'inset 0 4px 16px rgba(0,0,0,0.4)',
                    transition: 'all 0.3s'
                  }}>
                    {cameraStatus === 'active' && (
                      <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 10, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: '6px 12px', borderRadius: '24px', display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--red)', boxShadow: '0 0 8px var(--red)' }} />
                        <span style={{ color: '#fff', fontSize: '11px', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Live</span>
                      </div>
                    )}

                    <video ref={remoteVideoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', display: cameraStatus === 'active' ? 'block' : 'none' }} />

                    {cameraStatus !== 'active' && (
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'var(--txt-faint)', padding: '40px', textAlign: 'center' }}>
                        {cameraStatus === 'idle' && (
                          <>
                            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                              <Camera size={32} opacity={0.5} />
                            </div>
                            <h3 style={{ fontSize: '18px', color: '#fff', margin: '0 0 8px', fontWeight: '700' }}>Live Verification</h3>
                            <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.6 }}>Request camera access to view the student's live environment during their assessment.</p>
                          </>
                        )}
                        {cameraStatus === 'requesting' && (
                          <>
                            <div className="spin" style={{ width: 40, height: 40, border: '3px solid rgba(124,92,252,0.1)', borderTopColor: '#7c5cfc', borderRadius: '50%', marginBottom: 24 }} />
                            <h3 style={{ fontSize: '16px', color: '#fff', margin: '0 0 8px' }}>Waiting for Student...</h3>
                            <p style={{ margin: 0, fontSize: '13px' }}>A permission prompt is currently on the student's screen.</p>
                          </>
                        )}
                        {cameraStatus === 'error' && (
                          <>
                            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(248,113,113,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24, border: '1px solid rgba(248,113,113,0.2)' }}>
                              <AlertCircle size={28} color="#f87171" />
                            </div>
                            <h3 style={{ fontSize: '16px', color: '#f87171', margin: '0 0 8px' }}>Connection Failed</h3>
                            <p style={{ margin: 0, fontSize: '13px' }}>{cameraError}</p>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '16px' }}>
                    {cameraStatus !== 'active' && cameraStatus !== 'requesting' ? (
                      <button 
                        onClick={() => requestCamera(modalUser)}
                        style={{
                          flex: 1, padding: '16px', borderRadius: '16px', border: 'none',
                          background: 'linear-gradient(135deg, #7c5cfc, #6345d8)', color: '#fff',
                          fontSize: '15px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                          boxShadow: '0 8px 24px rgba(124,92,252,0.3)', transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                      >
                        <Video size={18} /> Request Live Camera
                      </button>
                    ) : (
                      <button 
                        onClick={stopCameraConnection}
                        style={{
                          flex: 1, padding: '16px', borderRadius: '16px', border: '1px solid rgba(248,113,113,0.3)',
                          background: 'rgba(248,113,113,0.1)', color: '#f87171',
                          fontSize: '15px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(248,113,113,0.15)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(248,113,113,0.1)'}
                      >
                        <LogOut size={18} /> Cancel & Disconnect
                      </button>
                    )}
                  </div>
                </div>

                {/* Right Panel: Student Evidence */}
                <div style={{ flex: '1', overflowY: 'auto', padding: '40px', background: 'rgba(255,255,255,0.01)' }}>
                  <h3 style={{ fontSize: '16px', color: 'var(--txt-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: '800', margin: '0 0 24px' }}>Submission Evidence</h3>
                  
                  {modalUser.submissions && modalUser.submissions.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '32px' }}>
                      {modalUser.submissions.map((sub, i) => (
                        <div key={i} style={{ background: '#0f0f13', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
                          <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <CheckCircle2 size={18} color="var(--green)" />
                              <span style={{ fontWeight: '700', color: '#fff', fontSize: '15px' }}>Step {sub.stepId} Verification</span>
                            </div>
                            <span style={{ color: 'var(--txt-faint)', fontSize: '13px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {new Date(sub.submittedAt).toLocaleString()}
                            </span>
                          </div>
                          <div style={{ padding: '24px', display: 'flex', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', minHeight: '300px', alignItems: 'center' }}>
                            <img src={sub.imageData} alt={`Step ${sub.stepId}`} style={{ maxWidth: '100%', maxHeight: '600px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', objectFit: 'contain' }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: '80px 40px', textAlign: 'center', color: 'var(--txt-muted)', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                      <ImageIcon size={48} opacity={0.3} style={{ marginBottom: '20px' }} />
                      <div style={{ fontSize: '18px', color: '#fff', fontWeight: '600', marginBottom: '8px' }}>No evidence yet</div>
                      <div style={{ fontSize: '14px' }}>This student hasn't successfully verified any steps.</div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
