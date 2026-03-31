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
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '16px', background: '#f8fafc' }}>
      <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 15px -3px rgba(99,102,241,0.3)' }}>
        <ShieldAlert size={24} color="#fff" />
      </div>
      <div className="spin" style={{ width: '24px', height: '24px', border: '3px solid #e2e8f0', borderTopColor: '#6366f1', borderRadius: '50%' }} />
    </div>
  );

  if (error) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '16px', background: '#f8fafc' }}>
      <div style={{ color: '#ef4444', background: '#fee2e2', border: '1px solid #fecaca', padding: '16px 24px', borderRadius: '12px', fontWeight: '500' }}>{error}</div>
      <button 
        style={{ padding: '8px 16px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', color: '#475569', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }} 
        onClick={() => window.location.reload()}
      >
        Reload Page
      </button>
    </div>
  );

  const users = data.users.filter(u => !u.rollNumber?.startsWith('ADMIN_'));
  const filtered = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.rollNumber.toLowerCase().includes(search.toLowerCase())
  );

  const totalSteps = courseQuestions.length;

  return (
    <div className="app-shell" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: '#f8fafc', fontFamily: 'Inter, system-ui, sans-serif' }}>
      
      {/* ══════════════ PREMIUM ADMIN TOP BAR ══════════════ */}
      <header className="app-topbar" style={{ position: 'relative', zIndex: 10, background: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 6px -1px rgba(99,102,241,0.3)', flexShrink: 0, overflow: 'hidden'
          }}>
            <img src="/logo.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div>
            <div style={{ fontWeight: '800', fontSize: '18px', letterSpacing: '-0.02em', color: '#0f172a', lineHeight: 1.2 }}>
              Workspace Admin
            </div>
            <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>
              DataPipeline Masterclass
            </div>
          </div>
        </div>

        <div className="admin-topbar-right" style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div className="admin-search-wrapper" style={{ position: 'relative', width: '300px' }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search students..."
              style={{ 
                width: '100%', boxSizing: 'border-box', 
                background: '#f1f5f9', border: '1px solid #e2e8f0', 
                borderRadius: '10px', padding: '10px 16px 10px 42px', 
                color: '#0f172a', outline: 'none', fontSize: '13px', fontWeight: '500',
                transition: 'all 0.2s',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.15)'; e.currentTarget.style.background = '#ffffff'; }}
              onBlur={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.background = '#f1f5f9'; }}
            />
          </div>

          <div style={{ display: 'flex', gap: '24px', borderLeft: '1px solid #e2e8f0', paddingLeft: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', lineHeight: 1 }}>{data.stats.totalStudents}</div>
              <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px', fontWeight: '600' }}>Enrolled</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: '800', color: '#10b981', lineHeight: 1 }}>{data.stats.completedStudents}</div>
              <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px', fontWeight: '600' }}>Completed</div>
            </div>
          </div>
          
          <button
            onClick={() => { localStorage.removeItem('token'); window.location.reload(); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 16px', fontSize: '13px', fontWeight: '600',
              borderRadius: '10px', border: '1px solid #e2e8f0',
              background: '#ffffff', cursor: 'pointer', marginLeft: '12px',
              color: '#475569', transition: 'all 0.2s',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = '#fca5a5'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.color = '#475569'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
          >
            <LogOut size={16} /> Exit
          </button>
        </div>
      </header>

      {/* ══════════════ DASHBOARD GRID BODY ══════════════ */}
      <main style={{ flex: 1, overflowY: 'auto', padding: '32px 48px', background: '#f8fafc' }}>
        
        <div className="admin-grid" style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', 
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
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '20px', padding: '24px',
                  display: 'flex', flexDirection: 'column', gap: '20px',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.02)',
                  position: 'relative', overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.05)'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.02)'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
              >
                {/* Visual Top Highlight */}
                {u.isCompleted && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: '#10b981' }} />}
                {!u.isCompleted && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'linear-gradient(90deg, #6366f1, #8b5cf6)' }} />}
                
                {/* Top Row: Auth Picture + Name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ position: 'relative' }}>
                    {u.picture ? (
                      <img src={u.picture} alt={u.name} style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #e2e8f0' }} />
                    ) : (
                      <div style={{ 
                        width: '56px', height: '56px', borderRadius: '50%', 
                        background: 'linear-gradient(135deg, #f1f5f9, #e2e8f0)', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center', 
                        fontSize: '18px', fontWeight: '700', color: '#475569',
                        border: '1px solid #cbd5e1'
                      }}>
                        {u.name.substring(0,2).toUpperCase()}
                      </div>
                    )}
                    {/* Status Badge */}
                    <div style={{ position: 'absolute', bottom: -2, right: -2, width: '20px', height: '20px', borderRadius: '50%', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                      <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: u.isCompleted ? '#10b981' : '#6366f1' }} />
                    </div>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: '800', fontSize: '18px', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.01em' }}>
                      {u.name}
                    </div>
                    <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '500', marginTop: '2px' }}>
                      {u.rollNumber}
                    </div>
                  </div>
                </div>

                {/* Second Row: Stats & Progress */}
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.05em' }}>
                      <span>{u.isCompleted ? 'Course Graduated' : `Step ${u.currentStep} of ${totalSteps}`}</span>
                      <span style={{ color: u.isCompleted ? '#10b981' : '#6366f1', fontWeight: '800' }}>{scorePct}%</span>
                    </div>
                    <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(100, Math.max(0, (u.currentStep - 1) / totalSteps * 100))}%`, background: u.isCompleted ? '#10b981' : 'linear-gradient(90deg, #6366f1, #8b5cf6)', borderRadius: '4px', transition: 'width 0.5s ease-out' }} />
                    </div>
                  </div>
                  
                  {u.rejectionCount > 0 && (
                    <div style={{ marginLeft: '16px', background: '#fee2e2', padding: '6px 10px', borderRadius: '8px', color: '#ef4444', fontSize: '11px', fontWeight: '700' }}>
                      {u.rejectionCount} FLAGS
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', color: '#6366f1' }}>
                    View Profile & Live Camera <ZoomIn size={14} />
                  </div>
                  <div style={{ background: '#f1f5f9', padding: '4px 10px', borderRadius: '8px', color: '#475569', fontSize: '12px', fontWeight: '600' }}>
                    {u.submissions?.length || 0} FILE{u.submissions?.length !== 1 && 'S'}
                  </div>
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
              position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)',
              display: 'flex', padding: '40px'
            }}
            className="admin-modal-container"
            onClick={closeModal}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="admin-modal-content"
              style={{ 
                background: '#ffffff', borderRadius: '24px', 
                width: '100%', maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                overflow: 'hidden'
              }}
            >
              {/* Header */}
              <div className="admin-modal-header" style={{ padding: '32px 48px', borderBottom: '1px solid #e2e8f0', background: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                  {modalUser.picture ? (
                    <img src={modalUser.picture} alt="" style={{ width: '72px', height: '72px', borderRadius: '50%', border: '4px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                  ) : <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'linear-gradient(135deg, #f1f5f9, #e2e8f0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: '800', color: '#475569', border: '4px solid #f8fafc', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>{modalUser.name.substring(0,2).toUpperCase()}</div>}
                  <div>
                    <h1 style={{ fontSize: '32px', fontWeight: '800', margin: 0, color: '#0f172a', letterSpacing: '-0.02em' }}>{modalUser.name}</h1>
                    <div style={{ display: 'flex', gap: '16px', color: '#64748b', fontSize: '15px', marginTop: '6px', fontWeight: '500' }}>
                      <span style={{ color: '#6366f1', fontWeight: '700' }}>{modalUser.rollNumber}</span>
                      <span style={{ color: '#cbd5e1' }}>•</span>
                      <span>{modalUser.email}</span>
                      {modalUser.isCompleted && (
                        <>
                          <span style={{ color: '#cbd5e1' }}>•</span>
                          <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}><CheckCircle2 size={16} /> Completed Course</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                <button onClick={closeModal} style={{ background: '#f1f5f9', border: 'none', color: '#64748b', borderRadius: '16px', width: '56px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }} onMouseEnter={e => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = '#0f172a'; }} onMouseLeave={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#64748b'; }}>
                  <X size={28} />
                </button>
              </div>

              {/* Body */}
              <div className="admin-modal-body" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                
                {/* Left Panel: Camera Stream & Actions */}
                <div className="admin-modal-panel" style={{ flex: '0 0 45%', borderRight: '1px solid #e2e8f0', padding: '40px', display: 'flex', flexDirection: 'column', gap: '32px', background: '#f8fafc' }}>
                  
                  {/* Camera Viewer Box */}
                  <div style={{ 
                    flex: 1, border: cameraStatus === 'active' ? '2px solid #10b981' : '1px solid #e2e8f0', 
                    borderRadius: '24px', background: '#f1f5f9', display: 'flex', flexDirection: 'column',
                    overflow: 'hidden', position: 'relative', boxShadow: cameraStatus === 'active' ? '0 0 0 4px rgba(16,185,129,0.1)' : 'inset 0 2px 4px rgba(0,0,0,0.02)',
                    transition: 'all 0.3s'
                  }}>
                    {cameraStatus === 'active' && (
                      <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 10, background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)', padding: '8px 16px', borderRadius: '24px', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 8px #ef4444' }} />
                        <span style={{ color: '#0f172a', fontSize: '12px', fontWeight: '800', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Live</span>
                      </div>
                    )}

                    <video ref={remoteVideoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', display: cameraStatus === 'active' ? 'block' : 'none' }} />

                    {cameraStatus !== 'active' && (
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: '#64748b', padding: '40px', textAlign: 'center' }}>
                        {cameraStatus === 'idle' && (
                          <>
                            <div style={{ width: 96, height: 96, borderRadius: '50%', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                              <Camera size={40} color="#94a3b8" />
                            </div>
                            <h3 style={{ fontSize: '20px', color: '#0f172a', margin: '0 0 12px', fontWeight: '800' }}>Live Verification</h3>
                            <p style={{ margin: 0, fontSize: '15px', lineHeight: 1.6, color: '#475569', maxWidth: '300px' }}>Request camera access to view the student's live environment during their assessment.</p>
                          </>
                        )}
                        {cameraStatus === 'requesting' && (
                          <>
                            <div className="spin" style={{ width: 48, height: 48, border: '4px solid #e2e8f0', borderTopColor: '#6366f1', borderRadius: '50%', marginBottom: 32 }} />
                            <h3 style={{ fontSize: '18px', color: '#0f172a', margin: '0 0 8px', fontWeight: '700' }}>Waiting for Student...</h3>
                            <p style={{ margin: 0, fontSize: '14px', color: '#475569' }}>A permission prompt is currently on the student's screen.</p>
                          </>
                        )}
                        {cameraStatus === 'error' && (
                          <>
                            <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24, border: '1px solid #fecaca' }}>
                              <AlertCircle size={36} color="#ef4444" />
                            </div>
                            <h3 style={{ fontSize: '18px', color: '#ef4444', margin: '0 0 8px', fontWeight: '700' }}>Connection Failed</h3>
                            <p style={{ margin: 0, fontSize: '14px', color: '#7f1d1d' }}>{cameraError}</p>
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
                          flex: 1, padding: '18px', borderRadius: '16px', border: 'none',
                          background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff',
                          fontSize: '16px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                          boxShadow: '0 8px 16px -4px rgba(99,102,241,0.5)', transition: 'all 0.2s', letterSpacing: '0.02em'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 20px -4px rgba(99,102,241,0.6)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 16px -4px rgba(99,102,241,0.5)'; }}
                      >
                        <Video size={20} /> Request Live Camera
                      </button>
                    ) : (
                      <button 
                        onClick={stopCameraConnection}
                        style={{
                          flex: 1, padding: '18px', borderRadius: '16px', border: 'none',
                          background: '#fee2e2', color: '#ef4444',
                          fontSize: '16px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                          transition: 'all 0.2s', letterSpacing: '0.02em'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#fecaca'}
                        onMouseLeave={e => e.currentTarget.style.background = '#fee2e2'}
                      >
                        <LogOut size={20} /> Cancel & Disconnect
                      </button>
                    )}
                  </div>
                </div>

                {/* Right Panel: Student Evidence */}
                <div className="admin-modal-panel" style={{ flex: '1', overflowY: 'auto', padding: '40px', background: '#ffffff' }}>
                  <h3 style={{ fontSize: '18px', color: '#0f172a', fontWeight: '800', margin: '0 0 24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    Submission Evidence 
                    <span style={{ background: '#f1f5f9', padding: '4px 10px', borderRadius: '12px', color: '#64748b', fontSize: '13px', fontWeight: '600' }}>
                      {modalUser.submissions?.length || 0}
                    </span>
                  </h3>
                  
                  {modalUser.submissions && modalUser.submissions.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '32px' }}>
                      {modalUser.submissions.map((sub, i) => (
                        <div key={i} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                          <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <CheckCircle2 size={20} color="#10b981" />
                              <span style={{ fontWeight: '800', color: '#0f172a', fontSize: '16px' }}>Step {sub.stepId} Verification</span>
                            </div>
                            <span style={{ color: '#64748b', fontSize: '13px', fontWeight: '600' }}>
                                {new Date(sub.submittedAt).toLocaleString()}
                            </span>
                          </div>
                          <div style={{ padding: '32px', display: 'flex', justifyContent: 'center', background: '#f1f5f9', minHeight: '300px', alignItems: 'center' }}>
                            <img src={sub.imageData} alt={`Step ${sub.stepId}`} style={{ maxWidth: '100%', maxHeight: '600px', borderRadius: '12px', border: '1px solid #e2e8f0', objectFit: 'contain', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: '80px 40px', textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: '24px', border: '2px dashed #e2e8f0' }}>
                      <ImageIcon size={56} style={{ marginBottom: '24px', color: '#cbd5e1' }} />
                      <div style={{ fontSize: '20px', color: '#0f172a', fontWeight: '700', marginBottom: '8px' }}>No evidence yet</div>
                      <div style={{ fontSize: '15px' }}>This student hasn't successfully verified any steps.</div>
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
