import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, UploadCloud, Award, Loader2, Info, XCircle, ArrowRight, ScanLine, BrainCircuit } from 'lucide-react';
import { courseQuestions } from '../content';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Certificate from './Certificate';

export default function StepWizard({ user, refreshUser }) {
  const [choice, setChoice] = useState(null);
  const [file, setFile] = useState(null);
  const [uploadState, setUploadState] = useState(''); // 'uploading' | 'ocr' | 'ai' | 'success' | 'error'
  const [error, setError] = useState('');

  // Track whether we're currently in a submission flow so IDLE doesn't
  // falsely trigger "success" on first mount or after a hard refresh.
  const isSubmittingRef = useRef(false);

  // ── Effect 1: Polling — only depends on ocrStatus + refreshUser ──
  // Runs a clean interval while PROCESSING. Does NOT re-create the interval
  // every time uploadState changes (which was the leak causing multiple calls).
  useEffect(() => {
    if (user.ocrStatus !== 'PROCESSING') return;
    const interval = setInterval(() => { refreshUser(); }, 2000);
    return () => clearInterval(interval);
  }, [user.ocrStatus, refreshUser]);

  // ── Effect 2: React to terminal ocrStatus changes ──
  // Separated from polling so that uploadState changes don't restart the interval.
  useEffect(() => {
    if (user.ocrStatus === 'REJECTED') {
      // Only update UI once — guard via current state value inside setter
      setUploadState(prev => {
        if (prev === 'error') return prev; // already handled, no-op
        setError(user.ocrFeedback || 'Verification Failed');
        setChoice('yes');
        return 'error';
      });
    } else if (user.ocrStatus === 'IDLE' && isSubmittingRef.current) {
      // IDLE after a real submission = success
      isSubmittingRef.current = false;
      setUploadState('success');
      setTimeout(() => {
        setFile(null);
        setChoice(null);
        setUploadState('');
      }, 1800);
    }
  }, [user.ocrStatus, user.ocrFeedback]);

  const total = courseQuestions.length;

  if (user.currentStep > total) {
    return <Certificate name={user.name} email={user.email} completedAt={user.completedAt} rollNumber={user.rollNumber} />;
  }

  const q = courseQuestions.find(x => x.id === user.currentStep) || courseQuestions[0];
  const pct = Math.round(((user.currentStep - 1) / total) * 100);

  const handleFile = (e) => { if (e.target.files?.[0]) { setFile(e.target.files[0]); setError(''); } };

  const handleSubmit = async () => {
    if (!file) { setError('A screenshot is required to verify this step.'); return; }
    setError('');
    setUploadState('uploading');
    isSubmittingRef.current = true;

    // Simulate progression of text states for UX while waiting for queue
    const ocrTimer = setTimeout(() => setUploadState(prev => prev === 'uploading' ? 'ocr' : prev), 1500);
    const aiTimer = setTimeout(() => setUploadState(prev => (prev === 'ocr' || prev === 'uploading') ? 'ai' : prev), 3000);

    const fd = new FormData();
    fd.append('stepId', user.currentStep);
    fd.append('screenshot', file);

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${import.meta.env.VITE_API_URL}/api/progress/submit`, fd, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      refreshUser(); // Will set ocrStatus to PROCESSING → triggers polling effect
    } catch (err) {
      clearTimeout(ocrTimer); clearTimeout(aiTimer);
      isSubmittingRef.current = false;
      setUploadState('error');
      setError(err.response?.data?.error || 'Upload failed. Please try again.');
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={q.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -16, transition: { duration: 0.15 } }}
        transition={{ duration: 0.3, ease: [.4, 0, .2, 1] }}
        style={{ maxWidth: '760px' }}
      >
        {/* ── Header ── */}
        <div style={{ marginBottom: '36px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <span className="badge">Step {q.id} of {total}</span>
            <span style={{ fontSize: '12px', color: 'var(--txt-faint)', fontWeight: '500' }}>{pct}% complete</span>
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: '700', lineHeight: '1.4', letterSpacing: '-0.025em', color: '#fff', maxWidth: '680px', margin: 0 }}>
            {q.question}
          </h1>
        </div>

        {/* ── Choice Buttons ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '28px' }}>
          <button className={`choice-btn yes ${choice === 'yes' ? 'selected' : ''}`}
            onClick={() => { setChoice('yes'); setError(''); }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: choice === 'yes' ? 'rgba(20,217,151,0.15)' : 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: choice === 'yes' ? '1px solid rgba(20,217,151,0.3)' : '1px solid var(--border)', transition: 'all 0.2s' }}>
              <CheckCircle2 size={18} color={choice === 'yes' ? 'var(--green)' : 'var(--txt-muted)'} />
            </div>
            <div>
              <div style={{ fontWeight: '700', fontSize: '15px', marginBottom: '3px' }}>Yes, done!</div>
              <div style={{ fontSize: '12px', fontWeight: '400', color: choice === 'yes' ? 'rgba(20,217,151,0.7)' : 'var(--txt-faint)' }}>Upload proof to continue →</div>
            </div>
          </button>

          <button className={`choice-btn no ${choice === 'no' ? 'selected' : ''}`}
            onClick={() => { setChoice('no'); setError(''); setFile(null); }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: choice === 'no' ? 'rgba(248,113,113,0.12)' : 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: choice === 'no' ? '1px solid rgba(248,113,113,0.3)' : '1px solid var(--border)', transition: 'all 0.2s' }}>
              <Info size={18} color={choice === 'no' ? 'var(--red)' : 'var(--txt-muted)'} />
            </div>
            <div>
              <div style={{ fontWeight: '700', fontSize: '15px', marginBottom: '3px' }}>Not yet</div>
              <div style={{ fontSize: '12px', fontWeight: '400', color: choice === 'no' ? 'rgba(248,113,113,0.7)' : 'var(--txt-faint)' }}>Show me how to do it</div>
            </div>
          </button>
        </div>

        <AnimatePresence>
          {/* ── Upload Panel ── */}
          {choice === 'yes' && (
            <motion.div key="upload"
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              style={{ overflow: 'hidden' }}
            >
              <div className="card" style={{ padding: '32px 36px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '24px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--brand-fade)', border: '1px solid rgba(124,92,252,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <UploadCloud size={19} color="var(--brand)" />
                  </div>
                  <div>
                    <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: '600' }}>Verification Screenshot</h3>
                    <p style={{ margin: 0, color: 'var(--txt-muted)', fontSize: '13px', lineHeight: '1.5' }}>{q.requirement}</p>
                  </div>
                </div>

                <label className={`upload-zone ${file ? 'filled' : ''}`} style={{ marginBottom: '20px' }}>
                  <UploadCloud size={20} style={{ flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '2px' }}>
                      {file ? file.name : 'Click to select or drag & drop'}
                    </div>
                    <div style={{ fontSize: '12px', opacity: 0.6 }}>PNG, JPG, WebP — max 5 MB</div>
                  </div>
                  <input type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
                </label>

                {error && (
                  <div style={{ color: 'var(--red)', background: 'var(--red-fade)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <XCircle size={14} /> {error}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="btn btn-primary" onClick={handleSubmit}
                    style={{ padding: '12px 28px', gap: '8px', minWidth: '180px' }}>
                    Submit to AI <ArrowRight size={15} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Guide Panel ── */}
          {choice === 'no' && (
            <motion.div key="guide"
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              style={{ overflow: 'hidden' }}
            >
              <div className="guide-box">
                <div className="guide-header">
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--brand-fade)', border: '1px solid rgba(124,92,252,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Info size={17} color="var(--brand)" />
                  </div>
                  <div>
                    <h3 style={{ margin: '0 0 3px', fontSize: '15px', fontWeight: '600' }}>Implementation Guide</h3>
                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--txt-muted)' }}>Follow each step carefully, then select "Yes, done!" above to submit proof</p>
                  </div>
                </div>
                <div className="guide-body prose">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{q.guide}</ReactMarkdown>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Fullscreen AI Verification Overlay ── */}
      <AnimatePresence>
        {uploadState && (
          <motion.div
            initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(30px)' }}
            exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            className="glass-card"
            style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(5,5,7,0.85)', borderRadius: 0, border: 'none' }}
          >
            <div style={{ textAlign: 'center', maxWidth: '520px', width: '100%', padding: '0 20px' }}>

              <div style={{ position: 'relative', width: '200px', height: '200px', margin: '0 auto 40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

                {/* Outermost Ring */}
                {(uploadState === 'uploading' || uploadState === 'ocr' || uploadState === 'ai') && (
                  <motion.div
                    animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }}
                    style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid transparent', borderTopColor: 'var(--brand)', filter: 'drop-shadow(0 0 12px var(--brand))' }}
                  />
                )}

                {/* Second Ring */}
                {(uploadState === 'ocr' || uploadState === 'ai') && (
                  <motion.div
                    animate={{ rotate: -360 }} transition={{ repeat: Infinity, duration: 3.5, ease: "linear" }}
                    style={{ position: 'absolute', inset: '16px', borderRadius: '50%', border: '4px solid transparent', borderBottomColor: '#a78bfa', borderLeftColor: 'rgba(124,92,252,0.5)' }}
                  />
                )}

                {/* Third Ring */}
                {uploadState === 'ai' && (
                  <motion.div
                    animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                    style={{ position: 'absolute', inset: '32px', borderRadius: '50%', border: '2px dashed #e2e8f0', opacity: 0.3 }}
                  />
                )}

                {/* Success Core */}
                {uploadState === 'success' && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }} style={{ position: 'absolute', inset: '28px', background: 'var(--green)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 60px var(--green)' }}>
                    <CheckCircle2 size={64} color="#000" strokeWidth={1.5} />
                  </motion.div>
                )}

                {/* Error Core */}
                {uploadState === 'error' && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }} style={{ position: 'absolute', inset: '28px', background: 'var(--red)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 60px rgba(248,113,113,0.5)' }}>
                    <XCircle size={64} color="#fff" strokeWidth={1.5} />
                  </motion.div>
                )}

                {/* Default Icon Core */}
                {(uploadState === 'uploading' || uploadState === 'ocr' || uploadState === 'ai') && (
                  <motion.div initial={{ scale: 0.8 }} animate={{ scale: [0.9, 1.1, 0.9] }} transition={{ repeat: Infinity, duration: 2 }} style={{ zIndex: 10 }}>
                    {uploadState === 'uploading' && <UploadCloud size={60} color="var(--brand)" strokeWidth={1} />}
                    {uploadState === 'ocr' && <ScanLine size={60} color="#a78bfa" strokeWidth={1} />}
                    {uploadState === 'ai' && <BrainCircuit size={60} color="#fff" strokeWidth={1} />}
                  </motion.div>
                )}
              </div>

              <h2 style={{ fontSize: '32px', fontWeight: '800', letterSpacing: '-0.02em', marginBottom: '16px' }}>
                {uploadState === 'uploading' && 'Transmitting Data'}
                {uploadState === 'ocr' && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}>Extracting Text Parameters</motion.span>}
                {uploadState === 'ai' && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-gradient">AI Cluster Processing</motion.span>}
                {uploadState === 'success' && <span className="text-green">Verification Passed!</span>}
                {uploadState === 'error' && <span style={{ color: 'var(--red)' }}>Verification Failed</span>}
              </h2>

              <p style={{ color: 'var(--txt-muted)', fontSize: '16px', lineHeight: '1.6', margin: '0 auto 40px', maxWidth: '440px' }}>
                {uploadState === 'uploading' && 'Securely transferring your image file to the course ingestion service in MongoDB.'}
                {uploadState === 'ocr' && 'Optical Character Recognition processing your snapshot to identify proof metrics.'}
                {uploadState === 'ai' && 'Checking your telemetry against the step requirements in the background queue. It takes 5-15 seconds!'}
                {uploadState === 'success' && 'Your proof has been validated autonomously. You are cleared for the next stage.'}
                {uploadState === 'error' && error}
              </p>

              {uploadState === 'error' && (
                <button className="btn btn-ghost" onClick={() => setUploadState('')} style={{ padding: '14px 32px', fontSize: '15px', color: '#fff' }}>
                  Acknowledge & Try Again
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
}