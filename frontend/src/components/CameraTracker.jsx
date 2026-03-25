import { useEffect, useRef } from 'react';
import axios from 'axios';

export default function CameraTracker({ user }) {
  const videoRef = useRef(null);

  useEffect(() => {
    // Only track if user is logged in, has a roll number, and is NOT an admin or completed
    if (!user || !user.rollNumber || user.rollNumber.startsWith('ADMIN_') || user.isCompleted) return;

    let stream = null;
    let interval = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: { ideal: 320 }, height: { ideal: 240 } } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        
        // Take a snapshot every 60 seconds
        interval = setInterval(captureAndPing, 60000);
        // Take first snapshot after 5 seconds
        setTimeout(captureAndPing, 5000);
      } catch (err) {
        console.warn('Camera tracking access denied or unavailable:', err);
        // Even if camera is denied, still ping to update lastActiveAt
        interval = setInterval(captureAndPing, 60000);
      }
    };

    const captureAndPing = async () => {
      let imageData = null;
      if (videoRef.current && stream && stream.active) {
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        if (canvas.width > 0 && canvas.height > 0) {
          const ctx = canvas.getContext('2d');
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          // Compress heavily (quality 0.5) to save DB space
          imageData = canvas.toDataURL('image/jpeg', 0.5); 
        }
      }

      try {
        const token = localStorage.getItem('token');
        if (token) {
          await axios.post(`${import.meta.env.VITE_API_URL}/api/tracking/ping`, 
            { imageData }, 
            { headers: { Authorization: `Bearer ${token}` } }
          );
        }
      } catch (e) {
        // Silently fail if ping drops
      }
    };

    startCamera();

    return () => {
      if (interval) clearInterval(interval);
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [user]);

  return (
    <video 
      ref={videoRef} 
      autoPlay 
      playsInline 
      muted 
      style={{ display: 'none' }} 
    />
  );
}
