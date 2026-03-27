import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { STUDENTS } from '../students';
import LottieLib from 'lottie-react';
import girlStudyingData from '../../Girl Studying on Laptop..json';
import emptyBoxData from '../../Empty Box.json';

// lottie-react may come through as a CJS-wrapped object in Vite ESM mode
const Lottie = LottieLib?.default ?? LottieLib;

export default function RollNumberEntry({ user, onConfirm }) {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [matched, setMatched] = useState(null);
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 1000); // 1s: Welcome typing
    const t2 = setTimeout(() => setPhase(2), 2000); // 2s: Box rolls in from bottom left
    const t3 = setTimeout(() => setPhase(3), 4500); // 4.5s: Rollcall card zooms up
    const t4 = setTimeout(() => setPhase(4), 5500); // 5.5s: Box rolls back to bottom left
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, []);

  const handleLookup = () => {
    const cleaned = input.trim().toUpperCase();
    if (!cleaned) { setError('Please enter your roll number.'); return; }
    const fullName = STUDENTS[cleaned];
    if (!fullName) {
      setError(`Roll number "${cleaned}" was not found in the class list. Please check and try again.`);
      setMatched(null);
      return;
    }
    setError('');
    setMatched({ rollNumber: cleaned, fullName });
  };

  const handleConfirm = async () => {
    if (!matched) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/profile/roll`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rollNumber: matched.rollNumber, officialName: matched.fullName })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      onConfirm(matched);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      key="roll"
      style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
    >
      <div
        className="auth-welcome-heading"
        style={{ marginBottom: '16px', minHeight: '46px', display: 'flex', justifyContent: 'center' }}
      >
        <span className="google-blue" style={{ display: 'flex' }}>
          {"Welcome,".split("").map((c, i) => (
            <motion.span key={`w-${i}`} initial={{ opacity: 0 }}
              animate={phase >= 1 ? { opacity: 1 } : { opacity: 0 }}
              transition={{ delay: phase >= 1 ? i * 0.05 : 0 }}>
              {c}
            </motion.span>
          ))}
        </span>
        <span style={{ display: 'flex', marginLeft: '8px' }}>
          {(user?.name?.split(' ')[0] || "User").split("").concat(['!']).map((c, i) => (
            <motion.span key={`n-${i}`} initial={{ opacity: 0 }}
              animate={phase >= 1 ? { opacity: 1 } : { opacity: 0 }}
              transition={{ delay: phase >= 1 ? (8 + i) * 0.05 : 0 }}>
              {c}
            </motion.span>
          ))}
        </span>
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        style={{ color: 'var(--txt-muted)', fontSize: '15px', lineHeight: '1.6', marginBottom: '50px', textAlign: 'center', maxWidth: '380px' }}
      >
        Before we begin, please enter your class roll number.
      </motion.p>

      <div style={{ position: 'relative', width: '100%', maxWidth: '420px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>

        <AnimatePresence>
          {phase >= 2 && phase < 4 && (
            <motion.div
              initial={{ opacity: 0, y: '60vh', x: '-60vw', rotate: -720 }}
              animate={{ opacity: 1, y: 0, x: 0, rotate: 0 }}
              exit={{
                x: '-60vw',
                y: '60vh',
                rotate: -720,
                opacity: 1,
                transition: { duration: 2.5, ease: 'easeIn' }
              }}
              transition={{ duration: 2.5, ease: 'easeOut' }}
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

        <AnimatePresence mode="wait">
          {!matched ? (
            /* ── Input Screen ── */
            <motion.div
              key="input-screen"
              className="auth-card"
              initial={{ opacity: 0, scale: 0 }}
              animate={phase >= 3 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.7, type: 'spring', bounce: 0.4 }}
              style={{ width: '100%', position: 'relative', overflow: 'visible', paddingTop: 0, marginTop: '20px', visibility: phase >= 3 ? 'visible' : 'hidden', zIndex: 10 }}
            >
              <div className="auth-card-accent" />

              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '-75px', marginBottom: '-25px', position: 'relative', zIndex: 10, pointerEvents: 'none' }}>
                <div style={{ width: '220px', height: '180px' }}>
                  <Lottie
                    animationData={girlStudyingData}
                    loop
                    autoplay
                    rendererSettings={{ preserveAspectRatio: 'xMidYMid slice' }}
                  />
                </div>
              </div>

              <div style={{ padding: '0 32px 32px 32px', position: 'relative', zIndex: 20 }}>
                <div style={{ position: 'relative', marginBottom: '16px' }}>
                  <input
                    type="text"
                    value={input}
                    onChange={e => { setInput(e.target.value); setError(''); }}
                    onKeyDown={e => e.key === 'Enter' && handleLookup()}
                    placeholder="e.g. SCA33"
                    autoFocus
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      padding: '16px 20px', fontSize: '20px', fontWeight: '700',
                      letterSpacing: '0.08em', textAlign: 'center', textTransform: 'uppercase',
                      background: '#fff', border: `2px solid ${error ? 'var(--red)' : '#e2e8f0'}`,
                      borderRadius: '12px', color: 'var(--txt)', outline: 'none',
                      transition: 'border-color 0.2s',
                      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
                    }}
                    onFocus={e => e.target.style.borderColor = error ? 'var(--red)' : '#cbd5e1'}
                    onBlur={e => e.target.style.borderColor = error ? 'var(--red)' : '#e2e8f0'}
                  />
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      style={{ overflow: 'hidden', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--red-fade)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '10px', padding: '12px 16px', textAlign: 'left' }}>
                        <AlertCircle size={16} color="var(--red)" style={{ flexShrink: 0 }} />
                        <span style={{ color: 'var(--red)', fontSize: '13px', fontWeight: '500' }}>{error}</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button className="btn btn-primary" onClick={handleLookup}
                  style={{ width: '100%', padding: '14px', fontSize: '15px', justifyContent: 'center', gap: '8px', borderRadius: '10px' }}>
                  Find My Profile <ArrowRight size={16} />
                </button>

                <p style={{ marginTop: '20px', fontSize: '12px', color: 'var(--txt-faint)', textAlign: 'center', margin: '20px 0 0' }}>
                  Your roll number starts with "SCA" (e.g. SCA01, SCA45).
                </p>
              </div>
            </motion.div>
          ) : (
            /* ── Welcome Confirmation Screen ── */
            <motion.div
              key="confirm-screen"
              className="auth-card"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.5, type: 'spring', bounce: 0.3 }}
              style={{ width: '100%', position: 'relative', overflow: 'hidden', padding: '40px 32px 32px 32px', textAlign: 'center' }}
            >
              <div className="auth-card-accent" />

              <motion.div initial={{ scale: 0, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                style={{ width: '80px', height: '80px', borderRadius: '24px', background: 'linear-gradient(135deg, #d4af37, #aa8222)', margin: '0 auto 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 50px rgba(212,175,55,0.3)' }}>
                <Sparkles size={40} color="#fff" strokeWidth={1.5} />
              </motion.div>

              <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--brand)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>
                Roll Number Confirmed
              </div>
              <div style={{ fontSize: '44px', fontWeight: '900', letterSpacing: '0.08em', color: '#d4af37', marginBottom: '8px' }}>
                {matched.rollNumber}
              </div>
              <div style={{ fontSize: '20px', fontWeight: '700', letterSpacing: '-0.02em', color: 'var(--txt)', lineHeight: 1.3, marginBottom: '20px' }}>
                {matched.fullName}
              </div>
              <div style={{ height: '1px', background: 'var(--border)', marginBottom: '20px' }} />
              <p style={{ color: 'var(--txt-muted)', fontSize: '13px', lineHeight: '1.6', margin: '0 0 28px' }}>
                You are officially enrolled. Your progress will be saved automatically throughout the entire masterclass.
              </p>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn btn-ghost" onClick={() => { setMatched(null); setInput(''); }}
                  style={{ flex: 1, padding: '12px', fontSize: '13px', justifyContent: 'center', borderRadius: '10px' }}>
                  Not me
                </button>
                <button className="btn btn-primary" onClick={handleConfirm} disabled={loading}
                  style={{ flex: 2, padding: '12px', fontSize: '15px', justifyContent: 'center', gap: '8px', opacity: loading ? 0.7 : 1, borderRadius: '10px' }}>
                  {loading ? <><Loader2 size={16} className="spin" />Registering...</> : <>Start Course <ArrowRight size={16} /></>}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
