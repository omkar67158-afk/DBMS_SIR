import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, ShieldAlert, CheckCircle2, X } from 'lucide-react';
import socket from '../socket';

export default function StudentCameraHandler({ user }) {
  const [requestQueue, setRequestQueue] = useState([]);
  const [activeSession, setActiveSession] = useState(null); // { adminSocketId }
  const [errorStatus, setErrorStatus] = useState('');

  const localStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);

  // Configuration for STUN servers
  const rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  useEffect(() => {
    if (!user || user.rollNumber?.startsWith('ADMIN_')) return;

    const registerUser = () => {
      socket.emit('register', { userId: user._id, rollNumber: user.rollNumber });
    };

    socket.on('connect', registerUser);

    if (socket.connected) {
      registerUser();
    } else {
      socket.connect();
    }

    const handleRequest = (data) => {
      // data: { adminSocketId, adminId }
      setRequestQueue(prev => {
        // Only add if not already in queue
        if (!prev.find(r => r.adminSocketId === data.adminSocketId) && !activeSession) {
          return [...prev, data];
        }
        return prev;
      });
    };

    const handleStop = (data) => {
      if (activeSession?.adminSocketId === data.senderSocketId) {
        stopCamera();
      }
      // Also remove from queue if it hasn't been answered yet
      setRequestQueue(prev => prev.filter(req => req.adminSocketId !== data.senderSocketId));
    };

    // WebRTC signaling listeners
    const handleOffer = async (data) => {
      if (!peerConnectionRef.current) return;
      try {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await peerConnectionRef.current.createAnswer();
        await peerConnectionRef.current.setLocalDescription(answer);
        socket.emit('webrtc_answer', { targetSocketId: data.senderSocketId, answer });
      } catch (err) {
        console.error("Error handling offer:", err);
      }
    };

    const handleAnswer = async (data) => {
      if (!peerConnectionRef.current) return;
      try {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
      } catch (err) {
        console.error("Error handling answer:", err);
      }
    };

    const handleIceCandidate = async (data) => {
      if (!peerConnectionRef.current) return;
      try {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch (err) {
        console.error("Error adding ice candidate:", err);
      }
    };

    socket.on('camera_request', handleRequest);
    socket.on('camera_stop', handleStop);
    socket.on('webrtc_offer', handleOffer);
    socket.on('webrtc_answer', handleAnswer);
    socket.on('webrtc_ice_candidate', handleIceCandidate);

    return () => {
      socket.off('camera_request', handleRequest);
      socket.off('camera_stop', handleStop);
      socket.off('webrtc_offer', handleOffer);
      socket.off('webrtc_answer', handleAnswer);
      socket.off('webrtc_ice_candidate', handleIceCandidate);
      socket.off('connect', registerUser);
    };
  }, [user, activeSession]);

  const startWebRTC = async (adminSocketId) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      localStreamRef.current = stream;

      const pc = new RTCPeerConnection(rtcConfig);
      peerConnectionRef.current = pc;

      // Add local stream tracks to PC
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('webrtc_ice_candidate', { targetSocketId: adminSocketId, candidate: event.candidate });
        }
      };

      // Create an offer to the admin
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      socket.emit('webrtc_offer', { targetSocketId: adminSocketId, offer });
      
      setActiveSession({ adminSocketId });
    } catch (err) {
      console.error("Failed to start WebRTC:", err);
      setErrorStatus("Could not access camera.");
      socket.emit('camera_response', { adminSocketId, accepted: false, reason: 'Camera access denied or unavailable.' });
    }
  };

  const stopCamera = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    setActiveSession(null);
  };

  const handleAllow = async (request) => {
    // Notify admin
    socket.emit('camera_response', { adminSocketId: request.adminSocketId, accepted: true });
    setRequestQueue(prev => prev.filter(r => r.adminSocketId !== request.adminSocketId));
    await startWebRTC(request.adminSocketId);
  };

  const handleDeny = (request) => {
    socket.emit('camera_response', { adminSocketId: request.adminSocketId, accepted: false, reason: 'Student denied request.' });
    setRequestQueue(prev => prev.filter(r => r.adminSocketId !== request.adminSocketId));
  };

  return (
    <>
      {/* Pending Request Modal */}
      <AnimatePresence>
        {requestQueue.length > 0 && !activeSession && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px'
            }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              style={{
                background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '24px',
                padding: '32px', maxWidth: '420px', width: '100%', textAlign: 'center',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.05)'
              }}
            >
              <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', border: '4px solid #f8fafc', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <Camera size={36} color="#6366f1" />
              </div>
              <h2 style={{ color: '#0f172a', fontSize: '22px', fontWeight: '800', margin: '0 0 12px', letterSpacing: '-0.01em' }}>Live Camera Request</h2>
              <p style={{ color: '#475569', fontSize: '15px', lineHeight: 1.6, margin: '0 0 32px' }}>
                Your instructor is requesting access to your live camera for verification. Are you ready to allow access?
              </p>
              
              {errorStatus && (
                <div style={{ color: '#ef4444', fontSize: '13px', fontWeight: '600', marginBottom: '20px', background: '#fee2e2', padding: '12px', borderRadius: '12px', border: '1px solid #fecaca' }}>
                  {errorStatus}
                </div>
              )}

              <div style={{ display: 'flex', gap: '16px' }}>
                <button
                  onClick={() => handleDeny(requestQueue[0])}
                  style={{
                    flex: 1, padding: '14px', borderRadius: '16px', border: '1px solid #e2e8f0',
                    background: '#f8fafc', color: '#475569', fontSize: '15px', fontWeight: '700', cursor: 'pointer',
                    transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#0f172a'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#475569'; }}
                >
                  Deny
                </button>
                <button
                  onClick={() => handleAllow(requestQueue[0])}
                  style={{
                    flex: 1, padding: '14px', borderRadius: '16px', border: 'none',
                    background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff', fontSize: '15px', fontWeight: '800', cursor: 'pointer',
                    boxShadow: '0 4px 6px -1px rgba(99,102,241,0.4)', transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 10px -2px rgba(99,102,241,0.5)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(99,102,241,0.4)'; }}
                >
                  Allow Camera
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Session Indicator */}
      <AnimatePresence>
        {activeSession && (
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            style={{
              position: 'fixed', top: '24px', left: '50%', transform: 'translateX(-50%)', zIndex: 99999,
                background: '#ffffff', border: '1px solid #e2e8f0',
                borderRadius: '99px', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '10px',
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.05)'
              }}
            >
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 8px #ef4444' }} />
              <span style={{ color: '#0f172a', fontSize: '13px', fontWeight: '700', letterSpacing: '0.02em' }}>Camera Live with Admin</span>
              <button 
                onClick={() => {
                  socket.emit('camera_stop', { targetSocketId: activeSession.adminSocketId });
                  stopCamera();
                }}
                style={{ background: '#f1f5f9', border: 'none', color: '#64748b', cursor: 'pointer', marginLeft: '12px', padding: '6px', borderRadius: '50%', display: 'flex', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = '#0f172a'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#64748b'; }}
              >
                <X size={14} />
              </button>
            </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
