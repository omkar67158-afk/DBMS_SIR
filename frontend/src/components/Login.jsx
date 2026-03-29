

import { useState, useEffect } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield } from 'lucide-react';
import Lottie from 'lottie-react';
import axios from 'axios';
import animationData from '../../data.json';
import emptyBoxData from '../../Empty Box.json';

export default function Login({ onLoginSuccess }) {
    const [error, setError] = useState(null);
    const [phase, setPhase] = useState(0);

    useEffect(() => {
        const t1 = setTimeout(() => setPhase(1), 1000); // 1s: Welcome text zoom in down
        const t2 = setTimeout(() => setPhase(2), 3000); // 3s: Box slides up
        const t3 = setTimeout(() => setPhase(3), 5000); // 5s: Card scales up from box
        const t4 = setTimeout(() => setPhase(4), 6000); // 6s: Box rolls out to the left
        return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
    }, []);

    const handleSuccess = async ({ credential }) => {
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/google`, { credential });
            localStorage.setItem('token', res.data.token);
            onLoginSuccess(res.data.user);
        } catch (err) {
            setError(err.response?.data?.error || 'Authentication failed. Please try again.');
        }
    };

    return (
        <motion.div
            key="login"
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.4 }}
            style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
        >
            <motion.div
                className="auth-welcome-heading"
                initial={{ opacity: 0, y: -40, scale: 0.9 }}
                animate={phase >= 1 ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: -40, scale: 0.9 }}
                transition={{ duration: 0.8, type: 'spring', bounce: 0.4 }}
                style={{ marginBottom: '16px' }}
            >
                <span className="google-blue">Welcome</span>
                {' '}to AtlasDB
            </motion.div>

            <div style={{ position: 'relative', width: '100%', maxWidth: '420px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <AnimatePresence>
                    {phase >= 2 && phase < 4 && (
                        <motion.div
                            initial={{ opacity: 0, y: 150, x: 0, rotate: 0 }}
                            animate={{ opacity: 1, y: 0, x: 0, rotate: 0 }}
                            exit={{ 
                                x: '60vw', 
                                y: '60vh',
                                rotate: 720, 
                                opacity: 1,
                                transition: { duration: 2.5, ease: 'easeIn' }
                            }}
                            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                            style={{
                                position: 'absolute',
                                width: '320px',
                                height: '320px',
                                zIndex: 1,
                                pointerEvents: 'none'
                            }}
                        >
                            <Lottie
                                animationData={emptyBoxData}
                                loop={false}
                                autoplay
                                rendererSettings={{ preserveAspectRatio: 'xMidYMid meet' }}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>

                <motion.div
                    className="auth-card"
                    initial={{ opacity: 0, scale: 0 }}
                    animate={phase >= 3 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
                    transition={{ duration: 0.7, type: 'spring', bounce: 0.4 }}
                    style={{ position: 'relative', zIndex: 10, width: '100%', visibility: phase >= 3 ? 'visible' : 'hidden' }}
                >
                    <div className="auth-card-accent" />
                    <div className="auth-card-header">
                        <h1 className="auth-card-title">Sign in</h1>
                        <p className="auth-card-subtitle">Sign in to your AtlasDB workspace</p>
                    </div>
                    <div className="auth-card-divider" />
                    <div className="auth-oauth">
                        <div className="auth-oauth-label">
                            <Shield size={14} className="auth-shield-icon" strokeWidth={2.5} />
                            <span>Your data is encrypted and secure</span>
                        </div>
                        <div className="auth-google-wrap">
                            <GoogleLogin
                                onSuccess={handleSuccess}
                                onError={() => setError('Google sign-in failed. Please try again.')}
                                theme="outline"
                                shape="rectangular"
                                width="100%"
                                text="continue_with"
                                size="large"
                            />
                        </div>
                    </div>
                    {error && (
                        <motion.div
                            className="auth-error"
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            {error}
                        </motion.div>
                    )}
                    <p className="auth-card-footer">
                        © 2026 AtlasDB • Privacy • Terms
                    </p>
                </motion.div>
            </div>
        </motion.div>
    );
}