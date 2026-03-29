import { motion } from 'framer-motion';
import Lottie from 'lottie-react';

export default function AuthLayout({ children }) {
    return (
        <div className="auth-root" style={{ zIndex: 10000 }}>
            {/* ── MAIN LAYOUT ── */}
            <div className="auth-layout">
                {/* LEFT — Lottie Animation */}
                <motion.div 
                    className="auth-lottie-panel"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                >
                    <Lottie
                        animationData={animationData}
                        loop
                        autoplay
                        className="auth-lottie"
                        rendererSettings={{ preserveAspectRatio: 'xMidYMid meet' }}
                    />
                </motion.div>

                {/* RIGHT — Card Panel */}
                <div className="auth-card-panel" style={{ padding: '60px 200px 20px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    {children}
                </div>
            </div>
        </div>
    );
}
