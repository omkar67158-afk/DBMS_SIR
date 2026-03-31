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

    // Connect socket if not connected
    if (!socket.connected) {
      socket.connect();
    }
    
    // Register the user
    socket.emit('register', { userId: user._id, rollNumber: user.rollNumber });

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
                background: '#13111a', border: '1px solid rgba(124,92,252,0.3)', borderRadius: '24px',
                padding: '32px', maxWidth: '400px', width: '100%', textAlign: 'center',
                boxShadow: '0 24px 48px rgba(0,0,0,0.8), 0 0 40px rgba(124,92,252,0.1)'
              }}
            >
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(124,92,252,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', border: '1px solid rgba(124,92,252,0.2)' }}>
                <Camera size={32} color="#a78bfa" />
              </div>
              <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: '700', margin: '0 0 12px' }}>Live Camera Request</h2>
              <p style={{ color: 'var(--txt-muted)', fontSize: '14px', lineHeight: 1.6, margin: '0 0 24px' }}>
                Your instructor is requesting access to your live camera for verification. Are you ready to allow access?
              </p>
              
              {errorStatus && (
                <div style={{ color: '#f87171', fontSize: '12px', marginBottom: '16px', background: 'rgba(248,113,113,0.1)', padding: '8px', borderRadius: '8px' }}>
                  {errorStatus}
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => handleDeny(requestQueue[0])}
                  style={{
                    flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)',
                    background: 'transparent', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  Deny
                </button>
                <button
                  onClick={() => handleAllow(requestQueue[0])}
                  style={{
                    flex: 1, padding: '12px', borderRadius: '12px', border: 'none',
                    background: 'linear-gradient(135deg, #7c5cfc, #a78bfa)', color: '#fff', fontSize: '14px', fontWeight: '700', cursor: 'pointer',
                    boxShadow: '0 0 16px rgba(124,92,252,0.3)'
                  }}
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
              position: 'fixed', top: '16px', left: '50%', transform: 'translateX(-50%)', zIndex: 99999,
              background: 'rgba(20, 217, 151, 0.1)', border: '1px solid rgba(20, 217, 151, 0.3)',
              borderRadius: '24px', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px',
              backdropFilter: 'blur(8px)', boxShadow: '0 4px 16px rgba(0,0,0,0.2)'
            }}
          >
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 8px var(--green)' }} />
            <span style={{ color: '#fff', fontSize: '12px', fontWeight: '600', letterSpacing: '0.05em' }}>Camera Live with Admin</span>
            <button 
              onClick={() => {
                socket.emit('camera_stop', { targetSocketId: activeSession.adminSocketId });
                stopCamera();
              }}
              style={{ background: 'transparent', border: 'none', color: 'var(--txt-faint)', cursor: 'pointer', marginLeft: '8px', padding: '4px', display: 'flex' }}
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
