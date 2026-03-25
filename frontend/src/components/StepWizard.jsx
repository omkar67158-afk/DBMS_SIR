import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, UploadCloud, Award, Loader2, Info, XCircle,
  ArrowRight, ScanLine, BrainCircuit, ImagePlus, Sparkles
} from 'lucide-react';
import { courseQuestions } from '../content';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Certificate from './Certificate';

export default function StepWizard({ user, refreshUser }) {
  const [choice, setChoice] = useState(null);
  const [file, setFile] = useState(null);
  const [uploadState, setUploadState] = useState('');
  const [error, setError] = useState('');
  const isSubmittingRef = useRef(false);
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (user.ocrStatus !== 'PROCESSING') return;
    const interval = setInterval(() => { refreshUser(); }, 800);
    return () => clearInterval(interval);
  }, [user.ocrStatus, refreshUser]);

  useEffect(() => {
    if (user.ocrStatus === 'REJECTED') {
      setUploadState(prev => {
        if (prev === 'error') return prev;
        setError(user.ocrFeedback || 'Verification Failed');
        setChoice('yes');
        return 'error';
      });
    } else if (user.ocrStatus === 'IDLE' && isSubmittingRef.current) {
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

  const handleFile = (file) => {
    if (file && file.type.startsWith('image/')) { setFile(file); setError(''); }
  };

  const handleSubmit = async () => {
    if (!file) { setError('A screenshot is required to verify this step.'); return; }
    setError('');
    setUploadState('uploading');
    isSubmittingRef.current = true;

    const ocrTimer = setTimeout(() => setUploadState(prev => prev === 'uploading' ? 'ocr' : prev), 700);
    const aiTimer = setTimeout(() => setUploadState(prev => (prev === 'ocr' || prev === 'uploading') ? 'ai' : prev), 1800);

    const fd = new FormData();
    fd.append('stepId', user.currentStep);
    fd.append('screenshot', file);

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${import.meta.env.VITE_API_URL}/api/progress/submit`, fd, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      refreshUser();
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
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -16, transition: { duration: 0.15 } }}
        transition={{ duration: 0.35, ease: [.4, 0, .2, 1] }}
        style={{ maxWidth: '780px' }}
      >

        {/* ── Step Badge + Progress ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '7px',
            padding: '5px 13px', borderRadius: '20px',
            background: 'rgba(124,92,252,0.12)', border: '1px solid rgba(124,92,252,0.28)',
            fontSize: '11px', fontWeight: '700', color: '#a78bfa',
            letterSpacing: '0.05em',
          }}>
            <Sparkles size={11} />
            STEP {q.id} OF {total}
          </div>
          <div style={{ flex: 1, height: '4px', borderRadius: '99px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 1, ease: [.4, 0, .2, 1], delay: 0.2 }}
              style={{
                height: '100%', borderRadius: '99px',
                background: 'linear-gradient(90deg, #7c5cfc, #14d997)',
                boxShadow: '0 0 8px rgba(124,92,252,0.5)',
              }}
            />
          </div>
          <span style={{ fontSize: '12px', color: 'var(--txt-faint)', fontWeight: '600', whiteSpace: 'nowrap' }}>{pct}% complete</span>
        </div>

        {/* ── Question ── */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{
            fontSize: '28px', fontWeight: '800', lineHeight: 1.35,
            letterSpacing: '-0.025em', color: '#fff', margin: 0,
            maxWidth: '700px',
          }}>
            {q.question}
          </h1>
          {q.requirement && (
            <p style={{ marginTop: '10px', fontSize: '14px', color: 'var(--txt-muted)', lineHeight: 1.6, maxWidth: '600px' }}>
              {q.requirement}
            </p>
          )}
        </div>

        {/* ── Choice Buttons ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '24px' }}>
          {/* YES */}
          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => { setChoice('yes'); setError(''); }}
            style={{
              padding: '20px 24px', borderRadius: '16px', cursor: 'pointer',
              border: choice === 'yes' ? '1px solid rgba(20,217,151,0.45)' : '1px solid rgba(255,255,255,0.08)',
              background: choice === 'yes'
                ? 'linear-gradient(135deg, rgba(20,217,151,0.1) 0%, rgba(20,217,151,0.04) 100%)'
                : 'rgba(255,255,255,0.02)',
              display: 'flex', alignItems: 'center', gap: '16px', textAlign: 'left',
              boxShadow: choice === 'yes' ? '0 0 28px -8px rgba(20,217,151,0.25)' : '0 2px 12px rgba(0,0,0,0.2)',
              transition: 'all 0.22s cubic-bezier(.4,0,.2,1)',
              position: 'relative', overflow: 'hidden',
              backdropFilter: 'blur(8px)',
            }}
          >
            {choice === 'yes' && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, transparent, #14d997, transparent)' }} />}
            <div style={{
              width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
              background: choice === 'yes' ? 'rgba(20,217,151,0.15)' : 'rgba(255,255,255,0.04)',
              border: choice === 'yes' ? '1px solid rgba(20,217,151,0.35)' : '1px solid rgba(255,255,255,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: choice === 'yes' ? '0 0 16px rgba(20,217,151,0.3)' : 'none',
              transition: 'all 0.22s',
            }}>
              <CheckCircle2 size={20} color={choice === 'yes' ? 'var(--green)' : 'rgba(255,255,255,0.3)'} />
            </div>
            <div>
              <div style={{ fontWeight: '700', fontSize: '15px', color: choice === 'yes' ? 'var(--green)' : 'var(--txt)', marginBottom: '3px' }}>Yes, done!</div>
              <div style={{ fontSize: '12px', color: choice === 'yes' ? 'rgba(20,217,151,0.65)' : 'var(--txt-faint)', fontWeight: '500' }}>Upload proof to continue →</div>
            </div>
          </motion.button>

          {/* NO */}
          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => { setChoice('no'); setError(''); setFile(null); }}
            style={{
              padding: '20px 24px', borderRadius: '16px', cursor: 'pointer',
              border: choice === 'no' ? '1px solid rgba(248,113,113,0.4)' : '1px solid rgba(255,255,255,0.08)',
              background: choice === 'no'
                ? 'linear-gradient(135deg, rgba(248,113,113,0.09) 0%, rgba(248,113,113,0.03) 100%)'
                : 'rgba(255,255,255,0.02)',
              display: 'flex', alignItems: 'center', gap: '16px', textAlign: 'left',
              boxShadow: choice === 'no' ? '0 0 28px -8px rgba(248,113,113,0.2)' : '0 2px 12px rgba(0,0,0,0.2)',
              transition: 'all 0.22s cubic-bezier(.4,0,.2,1)',
              position: 'relative', overflow: 'hidden',
              backdropFilter: 'blur(8px)',
            }}
          >
            {choice === 'no' && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, transparent, #f87171, transparent)' }} />}
            <div style={{
              width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
              background: choice === 'no' ? 'rgba(248,113,113,0.12)' : 'rgba(255,255,255,0.04)',
              border: choice === 'no' ? '1px solid rgba(248,113,113,0.3)' : '1px solid rgba(255,255,255,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: choice === 'no' ? '0 0 16px rgba(248,113,113,0.25)' : 'none',
              transition: 'all 0.22s',
            }}>
              <Info size={20} color={choice === 'no' ? 'var(--red)' : 'rgba(255,255,255,0.3)'} />
            </div>
            <div>
              <div style={{ fontWeight: '700', fontSize: '15px', color: choice === 'no' ? 'var(--red)' : 'var(--txt)', marginBottom: '3px' }}>Not yet</div>
              <div style={{ fontSize: '12px', color: choice === 'no' ? 'rgba(248,113,113,0.65)' : 'var(--txt-faint)', fontWeight: '500' }}>Show me how to do it</div>
            </div>
          </motion.button>
        </div>

        <AnimatePresence>
          {/* ── Upload Panel ── */}
          {choice === 'yes' && (
            <motion.div key="upload"
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
            >
              <div style={{
                borderRadius: '20px', overflow: 'hidden',
                background: 'linear-gradient(135deg, rgba(124,92,252,0.07) 0%, rgba(20,217,151,0.03) 100%)',
                border: '1px solid rgba(124,92,252,0.2)',
                boxShadow: '0 4px 32px -8px rgba(0,0,0,0.4)',
                position: 'relative',
              }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, #7c5cfc, #a78bfa, #14d997)', opacity: 0.7 }} />

                {/* Card header */}
                <div style={{
                  padding: '20px 28px 18px',
                  display: 'flex', alignItems: 'center', gap: '14px',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  background: 'rgba(124,92,252,0.06)',
                }}>
                  <div style={{
                    width: '42px', height: '42px', borderRadius: '12px', flexShrink: 0,
                    background: 'rgba(124,92,252,0.15)', border: '1px solid rgba(124,92,252,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 0 16px rgba(124,92,252,0.25)',
                  }}>
                    <UploadCloud size={20} color="var(--brand)" />
                  </div>
                  <div>
                    <h3 style={{ margin: '0 0 3px', fontSize: '16px', fontWeight: '700', color: 'var(--txt)' }}>Verification Screenshot</h3>
                    <p style={{ margin: 0, color: 'var(--txt-muted)', fontSize: '12px' }}>
                      {q.requirement}
                    </p>
                  </div>
                </div>

                <div style={{ padding: '24px 28px' }}>
                  {/* Drop zone */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
                    style={{
                      border: `1.5px dashed ${dragOver ? 'var(--brand)' : file ? 'var(--green)' : 'rgba(255,255,255,0.1)'}`,
                      borderRadius: '14px', padding: '28px 24px',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px',
                      cursor: 'pointer', textAlign: 'center', marginBottom: '20px',
                      background: dragOver
                        ? 'rgba(124,92,252,0.06)'
                        : file
                          ? 'rgba(20,217,151,0.05)'
                          : 'rgba(255,255,255,0.015)',
                      transition: 'all 0.2s',
                      minHeight: '110px',
                    }}
                  >
                    <div style={{
                      width: '44px', height: '44px', borderRadius: '12px',
                      background: file ? 'rgba(20,217,151,0.12)' : 'rgba(255,255,255,0.04)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: file ? '1px solid rgba(20,217,151,0.25)' : '1px solid rgba(255,255,255,0.08)',
                    }}>
                      {file
                        ? <CheckCircle2 size={22} color="var(--green)" />
                        : <ImagePlus size={22} color="rgba(255,255,255,0.3)" />}
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: file ? 'var(--green)' : 'var(--txt-muted)', marginBottom: '3px' }}>
                        {file ? file.name : 'Click to upload or drag & drop'}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--txt-faint)' }}>
                        {file ? `${(file.size / 1024).toFixed(0)} KB` : 'PNG, JPG, WebP — max 5 MB'}
                      </div>
                    </div>
                    {file && (
                      <button
                        onClick={e => { e.stopPropagation(); setFile(null); }}
                        style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600' }}
                      >
                        Remove
                      </button>
                    )}
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={e => handleFile(e.target.files?.[0])} style={{ display: 'none' }} />
                  </div>

                  {/* Error */}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                      style={{
                        color: 'var(--red)', background: 'rgba(248,113,113,0.08)',
                        border: '1px solid rgba(248,113,113,0.2)', borderRadius: '10px',
                        padding: '10px 14px', fontSize: '13px', display: 'flex', alignItems: 'center',
                        gap: '8px', marginBottom: '16px',
                      }}
                    >
                      <XCircle size={14} /> {error}
                    </motion.div>
                  )}

                  {/* Submit */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <motion.button
                      whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(124,92,252,0.5)' }}
                      whileTap={{ scale: 0.97 }}
                      onClick={handleSubmit}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '12px 28px', fontSize: '14px', fontWeight: '700',
                        borderRadius: '12px', border: 'none', cursor: 'pointer',
                        background: 'linear-gradient(135deg, #7c5cfc, #a78bfa)',
                        color: '#fff', boxShadow: '0 4px 16px rgba(124,92,252,0.4)',
                        transition: 'box-shadow 0.2s',
                        minWidth: '180px', justifyContent: 'center',
                      }}
                    >
                      Submit to AI <ArrowRight size={15} />
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Guide Panel ── */}
          {choice === 'no' && (
            <motion.div key="guide"
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
            >
              <div style={{
                borderRadius: '20px', overflow: 'hidden',
                background: 'rgba(124,92,252,0.04)',
                border: '1px solid rgba(124,92,252,0.18)',
                boxShadow: '0 4px 32px -8px rgba(0,0,0,0.4)',
                position: 'relative',
              }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, #7c5cfc, #a78bfa)', opacity: 0.6 }} />

                {/* Guide header */}
                <div style={{
                  padding: '20px 28px 18px',
                  display: 'flex', alignItems: 'center', gap: '14px',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  background: 'rgba(124,92,252,0.05)',
                }}>
                  <div style={{
                    width: '42px', height: '42px', borderRadius: '12px', flexShrink: 0,
                    background: 'rgba(124,92,252,0.15)', border: '1px solid rgba(124,92,252,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Info size={20} color="var(--brand)" />
                  </div>
                  <div>
                    <h3 style={{ margin: '0 0 3px', fontSize: '16px', fontWeight: '700', color: 'var(--txt)' }}>Implementation Guide</h3>
                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--txt-muted)' }}>
                      Follow each step carefully, then select <strong style={{ color: 'var(--green)' }}>"Yes, done!"</strong> above to submit proof
                    </p>
                  </div>
                </div>

                <div style={{ padding: '28px 32px' }} className="prose">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{q.guide}</ReactMarkdown>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ══════════════ AI VERIFICATION OVERLAY ══════════════ */}
      <AnimatePresence>
        {uploadState && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 1000,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(5,5,7,0.88)',
              backdropFilter: 'blur(28px)',
            }}
          >
            <div style={{ textAlign: 'center', maxWidth: '520px', width: '100%', padding: '0 20px' }}>

              {/* Animated ring cluster */}
              <div style={{ position: 'relative', width: '200px', height: '200px', margin: '0 auto 44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {(uploadState === 'uploading' || uploadState === 'ocr' || uploadState === 'ai') && (
                  <motion.div
                    animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2.5, ease: 'linear' }}
                    style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid transparent', borderTopColor: 'var(--brand)', filter: 'drop-shadow(0 0 12px var(--brand))' }}
                  />
                )}
                {(uploadState === 'ocr' || uploadState === 'ai') && (
                  <motion.div
                    animate={{ rotate: -360 }} transition={{ repeat: Infinity, duration: 3.5, ease: 'linear' }}
                    style={{ position: 'absolute', inset: '16px', borderRadius: '50%', border: '4px solid transparent', borderBottomColor: '#a78bfa', borderLeftColor: 'rgba(124,92,252,0.5)' }}
                  />
                )}
                {uploadState === 'ai' && (
                  <motion.div
                    animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                    style={{ position: 'absolute', inset: '32px', borderRadius: '50%', border: '2px dashed rgba(255,255,255,0.15)' }}
                  />
                )}
                {uploadState === 'success' && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 14 }}
                    style={{ position: 'absolute', inset: '28px', background: 'var(--green)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 60px var(--green)' }}>
                    <CheckCircle2 size={64} color="#000" strokeWidth={1.5} />
                  </motion.div>
                )}
                {uploadState === 'error' && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 14 }}
                    style={{ position: 'absolute', inset: '28px', background: 'var(--red)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 60px rgba(248,113,113,0.5)' }}>
                    <XCircle size={64} color="#fff" strokeWidth={1.5} />
                  </motion.div>
                )}
                {(uploadState === 'uploading' || uploadState === 'ocr' || uploadState === 'ai') && (
                  <motion.div initial={{ scale: 0.8 }} animate={{ scale: [0.9, 1.08, 0.9] }} transition={{ repeat: Infinity, duration: 2 }} style={{ zIndex: 10 }}>
                    {uploadState === 'uploading' && <UploadCloud size={60} color="var(--brand)" strokeWidth={1} />}
                    {uploadState === 'ocr' && <ScanLine size={60} color="#a78bfa" strokeWidth={1} />}
                    {uploadState === 'ai' && <BrainCircuit size={60} color="#fff" strokeWidth={1} />}
                  </motion.div>
                )}
              </div>

              <h2 style={{ fontSize: '30px', fontWeight: '800', letterSpacing: '-0.025em', marginBottom: '14px', color: '#fff' }}>
                {uploadState === 'uploading' && 'Transmitting Data'}
                {uploadState === 'ocr' && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}>Extracting Text Parameters</motion.span>}
                {uploadState === 'ai' && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-gradient">AI Cluster Processing</motion.span>}
                {uploadState === 'success' && <span className="text-green">Verification Passed!</span>}
                {uploadState === 'error' && <span style={{ color: 'var(--red)' }}>Verification Failed</span>}
              </h2>

              <p style={{ color: 'var(--txt-muted)', fontSize: '15px', lineHeight: 1.65, margin: '0 auto 36px', maxWidth: '420px' }}>
                {uploadState === 'uploading' && 'Securely transferring your image file to the course ingestion service in MongoDB.'}
                {uploadState === 'ocr' && 'Optical Character Recognition processing your snapshot to identify proof metrics.'}
                {uploadState === 'ai' && 'Verifying your screenshot against the step requirements with AI…'}
                {uploadState === 'success' && 'Your proof has been validated autonomously. You are cleared for the next stage.'}
                {uploadState === 'error' && error}
              </p>

              {uploadState === 'error' && (
                <motion.button
                  whileHover={{ y: -2 }}
                  onClick={() => setUploadState('')}
                  style={{
                    padding: '13px 32px', fontSize: '14px', fontWeight: '700',
                    borderRadius: '12px', border: '1px solid rgba(255,255,255,0.15)',
                    background: 'rgba(255,255,255,0.06)', cursor: 'pointer',
                    color: '#fff', backdropFilter: 'blur(8px)',
                    transition: 'all 0.2s',
                  }}
                >
                  Acknowledge & Try Again
                </motion.button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
}
