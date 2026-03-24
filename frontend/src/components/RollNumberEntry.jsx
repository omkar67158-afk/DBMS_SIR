import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, ArrowRight, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { STUDENTS } from '../students';

export default function RollNumberEntry({ user, onConfirm }) {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [matched, setMatched] = useState(null); // { rollNumber, fullName }

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
      const res = await fetch('http://localhost:5000/api/profile/roll', {
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
    <div style={{
      position: 'fixed', inset: 0, background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 2000, flexDirection: 'column'
    }}>
      {/* Ambient glows */}
      <div style={{ position: 'absolute', top: '15%', left: '20%', width: '500px', height: '500px', background: 'radial-gradient(ellipse, rgba(124,92,252,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '10%', right: '15%', width: '400px', height: '400px', background: 'radial-gradient(ellipse, rgba(20,217,151,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <AnimatePresence mode="wait">
        {!matched ? (
          /* ── Roll Number Input Screen ── */
          <motion.div key="input"
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            style={{ textAlign: 'center', maxWidth: '520px', width: '100%', padding: '0 24px' }}
          >
            {/* Icon */}
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.1 }}
              style={{ width: '88px', height: '88px', borderRadius: '24px', background: 'linear-gradient(135deg, var(--brand), #5b3fe0)', margin: '0 auto 32px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 60px rgba(124,92,252,0.4)' }}>
              <GraduationCap size={44} color="#fff" strokeWidth={1.5} />
            </motion.div>

            <h1 style={{ fontSize: '36px', fontWeight: '800', letterSpacing: '-0.04em', marginBottom: '12px' }}>
              Welcome, {user.name?.split(' ')[0]}!
            </h1>
            <p style={{ color: 'var(--txt-muted)', fontSize: '16px', lineHeight: '1.7', marginBottom: '40px' }}>
              Before we begin, please enter your class roll number so we can verify your enrollment.
            </p>

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
                  padding: '18px 24px', fontSize: '22px', fontWeight: '700',
                  letterSpacing: '0.1em', textAlign: 'center', textTransform: 'uppercase',
                  background: 'var(--surface)', border: `1px solid ${error ? 'var(--red)' : 'var(--border)'}`,
                  borderRadius: '14px', color: 'var(--txt)', outline: 'none',
                  transition: 'border-color 0.2s',
                }}
              />
            </div>

            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--red-fade)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', textAlign: 'left' }}>
                  <AlertCircle size={16} color="var(--red)" style={{ flexShrink: 0 }} />
                  <span style={{ color: 'var(--red)', fontSize: '14px', fontWeight: '500' }}>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <button className="btn btn-primary" onClick={handleLookup}
              style={{ width: '100%', padding: '16px', fontSize: '16px', justifyContent: 'center', gap: '10px' }}>
              Find My Profile <ArrowRight size={18} />
            </button>

            <p style={{ marginTop: '20px', fontSize: '12px', color: 'var(--txt-faint)' }}>
              Your roll number starts with "SCA" (e.g. SCA01, SCA45).
            </p>
          </motion.div>

        ) : (
          /* ── Welcome Confirmation Screen ── */
          <motion.div key="confirm"
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.02 }}
            style={{ textAlign: 'center', maxWidth: '580px', width: '100%', padding: '0 24px' }}
          >
            {/* Celebration */}
            <motion.div initial={{ scale: 0, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 200 }}
              style={{ width: '100px', height: '100px', borderRadius: '28px', background: 'linear-gradient(135deg, #d4af37, #aa8222)', margin: '0 auto 32px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 60px rgba(212,175,55,0.4)' }}>
              <Sparkles size={50} color="#fff" strokeWidth={1.5} />
            </motion.div>

            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '20px', padding: '36px 40px', marginBottom: '28px' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--brand)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>
                Roll Number Confirmed
              </div>
              <div style={{ fontSize: '52px', fontWeight: '900', letterSpacing: '0.1em', color: '#d4af37', marginBottom: '8px' }}>
                {matched.rollNumber}
              </div>
              <div style={{ fontSize: '24px', fontWeight: '700', letterSpacing: '-0.02em', color: 'var(--txt)', lineHeight: 1.3, marginBottom: '16px' }}>
                {matched.fullName}
              </div>
              <div style={{ height: '1px', background: 'var(--border)', marginBottom: '16px' }} />
              <p style={{ color: 'var(--txt-muted)', fontSize: '14px', lineHeight: '1.7', margin: 0 }}>
                You are officially enrolled in the <strong style={{ color: 'var(--txt)' }}>Data Pipeline Masterclass</strong>. Your progress will be saved against your roll number throughout the course.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn btn-ghost" onClick={() => { setMatched(null); setInput(''); }}
                style={{ flex: 1, padding: '14px', fontSize: '14px', justifyContent: 'center' }}>
                Not me
              </button>
              <button className="btn btn-primary" onClick={handleConfirm} disabled={loading}
                style={{ flex: 2, padding: '14px', fontSize: '16px', justifyContent: 'center', gap: '10px', opacity: loading ? 0.7 : 1 }}>
                {loading ? <><Loader2 size={18} className="spin" />Registering...</> : <>Start Course <ArrowRight size={18} /></>}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
