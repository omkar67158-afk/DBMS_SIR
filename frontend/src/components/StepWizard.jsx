import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, UploadCloud, Award, Loader2, Info, XCircle,
  ArrowRight, ArrowLeft, ScanLine, BrainCircuit, ImagePlus, Sparkles, AlertTriangle
} from 'lucide-react';
import { courseQuestions } from '../content';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Certificate from './Certificate';

export default function StepWizard({ user, refreshUser, maxStep, dashPhase = 3 }) {
  const [choice, setChoice] = useState(null);
  const [file, setFile] = useState(null);
  const [uploadState, setUploadState] = useState('');
  const [error, setError] = useState('');
  const isSubmittingRef = useRef(false);
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (user.ocrStatus !== 'PROCESSING') return;
    const interval = setInterval(() => { refreshUser(); }, 500);
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

    const ocrTimer = setTimeout(() => setUploadState(prev => prev === 'uploading' ? 'ocr' : prev), 300);
    const aiTimer = setTimeout(() => setUploadState(prev => (prev === 'ocr' || prev === 'uploading') ? 'ai' : prev), 900);

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
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12, transition: { duration: 0.15 } }}
        transition={{ duration: 0.3, ease: [.4, 0, .2, 1] }}
        style={{ maxWidth: '760px' }}
      >

        {/* ── Step Badge + Progress ── */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '5px 12px', borderRadius: '20px',
            background: 'rgba(91,62,240,0.08)', border: '1px solid rgba(91,62,240,0.20)',
            fontSize: '11px', fontWeight: '700', color: '#5b3ef0',
            letterSpacing: '0.05em',
          }}>
            <Sparkles size={10} />
            STEP {q.id} OF {total}
          </div>
          <div style={{ flex: 1, height: '6px', borderRadius: '10px', background: 'var(--surface-2)', overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.9, ease: [.4, 0, .2, 1], delay: 0.2 }}
              style={{
                height: '100%', borderRadius: '10px',
                background: 'linear-gradient(90deg, #6C63FF, #00C9A7)',
              }}
            />
          </div>
          <span style={{ fontSize: '12px', color: 'var(--txt-muted)', fontWeight: '600', whiteSpace: 'nowrap' }}>{pct}% done</span>
        </motion.div>

        {/* ── Wrapper for Question & Verification/Choices ── */}
        {maxStep && user.currentStep < maxStep ? (
           <>
             {/* ── Question ── */}
             <div style={{ marginBottom: '32px' }}>
               <h1 style={{ fontSize: '26px', fontWeight: '800', lineHeight: 1.3, letterSpacing: '-0.02em', color: 'var(--txt)', margin: '0 0 10px', maxWidth: '680px', minHeight: '36px' }}>
                 {dashPhase >= 1 && q.question.split("").map((c, i) => (
                   <motion.span key={`q-${i}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: dashPhase === 1 ? i * 0.02 : 0 }}>
                     {c}
                   </motion.span>
                 ))}
               </h1>
               <motion.div style={{ fontSize: '15px', color: 'var(--txt-muted)', lineHeight: 1.65, fontWeight: '400', maxWidth: '560px', margin: 0 }}>
                 {q.requirement && dashPhase >= 2 && q.requirement.split("").map((c, i) => (
                   <motion.span key={`r1-${i}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: dashPhase === 2 ? i * 0.015 : 0 }}>
                     {c}
                   </motion.span>
                 ))}
               </motion.div>
             </div>
             
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: dashPhase >= 3 ? 1 : 0 }} transition={{ duration: 0.5 }}>
               <motion.div
                 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                 style={{
                   padding: '16px 20px', borderRadius: '12px', background: 'rgba(5,150,105,0.06)',
                   border: '1px solid rgba(5,150,105,0.2)', display: 'flex', alignItems: 'center', gap: '12px',
                   marginBottom: '24px', boxShadow: '0 4px 12px rgba(5,150,105,0.05)'
                 }}
               >
                 <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 8px rgba(5,150,105,0.3)' }}>
                   <CheckCircle2 size={20} color="#fff" />
                 </div>
                 <div>
                   <div style={{ fontWeight: '700', color: '#059669', fontSize: '15px', marginBottom: '2px' }}>Step Verified</div>
                   <div style={{ fontSize: '13px', color: 'rgba(5,150,105,0.8)', fontWeight: '500' }}>You have successfully completed this requirement.</div>
                 </div>
               </motion.div>
             </motion.div>
           </>
        ) : (
           <>
             <AnimatePresence mode="popLayout">
               {!choice && (
                 <motion.div key="question" exit={{ scale: 1.05, opacity: 0, filter: 'blur(5px)' }} transition={{ duration: 0.3 }} style={{ marginBottom: '32px' }}>
                    <h1 style={{ fontSize: '26px', fontWeight: '800', lineHeight: 1.3, letterSpacing: '-0.02em', color: 'var(--txt)', margin: '0 0 10px', maxWidth: '680px', minHeight: '36px' }}>
                      {dashPhase >= 1 && q.question.split("").map((c, i) => (
                        <motion.span key={`q-${i}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: dashPhase === 1 ? i * 0.02 : 0 }}>
                          {c}
                        </motion.span>
                      ))}
                    </h1>
                    <motion.div style={{ fontSize: '15px', color: 'var(--txt-muted)', lineHeight: 1.65, fontWeight: '400', maxWidth: '560px', margin: 0 }}>
                      {q.requirement && dashPhase >= 2 && q.requirement.split("").map((c, i) => (
                        <motion.span key={`r2-${i}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: dashPhase === 2 ? i * 0.015 : 0 }}>
                          {c}
                        </motion.span>
                      ))}
                    </motion.div>
                 </motion.div>
               )}
             </AnimatePresence>

             <motion.div initial={{ opacity: 0 }} animate={{ opacity: dashPhase >= 3 ? 1 : 0 }} transition={{ duration: 0.5 }}>
               <AnimatePresence mode="popLayout">
                 {!choice ? (
                   <motion.div key="buttons" exit={{ opacity: 0, filter: 'blur(4px)' }} transition={{ duration: 0.2 }} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                     {/* YES */}
                     <motion.button layoutId="btn-yes" whileHover={{ y: -2, boxShadow: '0 6px 20px rgba(5,150,105,0.15)' }} whileTap={{ scale: 0.98 }} onClick={() => { setChoice('yes'); setError(''); }} style={{ padding: '18px 22px', borderRadius: '14px', cursor: 'pointer', border: '1.5px solid var(--border)', background: '#ffffff', display: 'flex', alignItems: 'center', gap: '14px', textAlign: 'left', boxShadow: 'var(--shadow-xs)', transition: 'border-color 0.2s' }}>
                       <div style={{ width: '42px', height: '42px', borderRadius: '11px', flexShrink: 0, background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                         <CheckCircle2 size={20} color="var(--txt-faint)" />
                       </div>
                       <div>
                         <div style={{ fontWeight: '700', fontSize: '15px', color: 'var(--txt)', marginBottom: '2px' }}>Yes, done!</div>
                         <div style={{ fontSize: '12px', color: 'var(--txt-faint)', fontWeight: '500' }}>Upload proof to continue →</div>
                       </div>
                     </motion.button>
           
                     {/* NO */}
                     <motion.button layoutId="btn-no" whileHover={{ y: -2, boxShadow: '0 6px 20px rgba(91,62,240,0.12)' }} whileTap={{ scale: 0.98 }} onClick={() => { setChoice('no'); setError(''); setFile(null); }} style={{ padding: '18px 22px', borderRadius: '14px', cursor: 'pointer', border: '1.5px solid var(--border)', background: '#ffffff', display: 'flex', alignItems: 'center', gap: '14px', textAlign: 'left', boxShadow: 'var(--shadow-xs)', transition: 'border-color 0.2s' }}>
                       <div style={{ width: '42px', height: '42px', borderRadius: '11px', flexShrink: 0, background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                         <Info size={20} color="var(--txt-faint)" />
                       </div>
                       <div>
                         <div style={{ fontWeight: '700', fontSize: '15px', color: 'var(--txt)', marginBottom: '2px' }}>Not yet</div>
                         <div style={{ fontSize: '12px', color: 'var(--txt-faint)', fontWeight: '500' }}>Show me how to do it</div>
                       </div>
                     </motion.button>
                   </motion.div>
                 ) : (
                   <motion.div key="selected-header" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '24px' }}>
                     <motion.button whileHover={{ backgroundColor: 'var(--surface-2)' }} onClick={() => { setChoice(null); setError(''); setFile(null); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, width: '46px', height: '46px', borderRadius: '14px', background: 'var(--surface)', border: '1.5px solid var(--border)', cursor: 'pointer', boxShadow: 'var(--shadow-xs)', color: 'var(--txt-muted)' }}>
                       <ArrowLeft size={20} />
                     </motion.button>
                     <motion.div layoutId={`btn-${choice}`} style={{ padding: '0 20px', height: '46px', borderRadius: '14px', border: `1.5px solid ${choice === 'yes' ? '#059669' : '#5b3ef0'}`, background: choice === 'yes' ? 'rgba(5,150,105,0.06)' : 'rgba(91,62,240,0.06)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                       <div style={{ width: '22px', height: '22px', borderRadius: '6px', background: choice === 'yes' ? '#059669' : '#5b3ef0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {choice === 'yes' ? <CheckCircle2 size={12} color="#fff" /> : <Info size={12} color="#fff" />}
                       </div>
                       <div style={{ fontWeight: '700', fontSize: '14px', color: choice === 'yes' ? '#059669' : '#5b3ef0' }}>
                          {choice === 'yes' ? 'Yes, done!' : 'Not yet'}
                       </div>
                     </motion.div>
                   </motion.div>
                 )}
               </AnimatePresence>
             </motion.div>
           </>
        )}

        <AnimatePresence>
          {/* ── Upload Panel ── */}
          {choice === 'yes' && (
            <motion.div key="upload"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
            >
              <div style={{
                borderRadius: '16px', overflow: 'hidden',
                background: '#ffffff',
                border: '1px solid rgba(0,0,0,0.05)',
                boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
              }}>
                {/* Top accent bar */}
                <div style={{ height: '3px', background: 'linear-gradient(90deg, #6C63FF, #5A54E8, #00C9A7)' }} />

                {/* Card header */}
                <div style={{
                  padding: '18px 26px 16px',
                  display: 'flex', alignItems: 'center', gap: '14px',
                  borderBottom: '1px solid rgba(0,0,0,0.05)',
                  background: 'var(--surface)',
                }}>
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '11px', flexShrink: 0,
                    background: 'rgba(108,99,255,0.08)', border: '1px solid rgba(108,99,255,0.18)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <UploadCloud size={19} color="#6C63FF" />
                  </div>
                  <div>
                    <h3 style={{ margin: '0 0 2px', fontSize: '15px', fontWeight: '600', color: 'var(--txt)' }}>Verification Screenshot</h3>
                    <p style={{ margin: 0, color: 'var(--txt-muted)', fontSize: '13px', fontWeight: '400' }}>
                      {q.requirement}
                    </p>
                  </div>
                </div>

                <div style={{ padding: '22px 26px' }}>
                  {/* Drop zone */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
                    style={{
                      border: `1.5px dashed ${dragOver ? '#5b3ef0' : file ? '#059669' : 'var(--border-hi)'}`,
                      borderRadius: '12px', padding: '28px 22px',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px',
                      cursor: 'pointer', textAlign: 'center', marginBottom: '18px',
                      background: dragOver ? 'rgba(91,62,240,0.04)' : file ? 'rgba(5,150,105,0.04)' : 'var(--surface)',
                      transition: 'all 0.2s',
                      minHeight: '110px',
                    }}
                  >
                    <div style={{
                      width: '44px', height: '44px', borderRadius: '12px',
                      background: file ? 'rgba(5,150,105,0.10)' : 'rgba(91,62,240,0.06)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: file ? '1px solid rgba(5,150,105,0.22)' : '1px solid rgba(91,62,240,0.14)',
                    }}>
                      {file
                        ? <CheckCircle2 size={22} color="#059669" />
                        : <ImagePlus size={22} color="var(--brand)" />}
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: file ? '#059669' : 'var(--txt)', marginBottom: '3px' }}>
                        {file ? file.name : 'Click to upload or drag & drop'}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--txt-faint)' }}>
                        {file ? `${(file.size / 1024).toFixed(0)} KB` : 'PNG, JPG, WebP — max 5 MB'}
                      </div>
                    </div>
                    {file && (
                      <button
                        onClick={e => { e.stopPropagation(); setFile(null); }}
                        style={{ fontSize: '11px', color: 'var(--txt-faint)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600', textDecoration: 'underline' }}
                      >
                        Remove
                      </button>
                    )}
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={e => handleFile(e.target.files?.[0])} style={{ display: 'none' }} />
                  </div>

                  {/* Error */}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      style={{
                        color: '#ff4d4f', background: '#fff5f5',
                        borderLeft: '4px solid #ff4d4f', borderRadius: '10px',
                        padding: '12px 16px', fontSize: '14px', display: 'flex', alignItems: 'center',
                        gap: '10px', marginBottom: '16px', fontWeight: '500',
                      }}
                    >
                      <AlertTriangle size={16} color="#ff4d4f" /> {error}
                    </motion.div>
                  )}

                  {/* Submit */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <motion.button
                      whileHover={{ y: -2, boxShadow: '0 8px 20px rgba(108,99,255,0.3)' }}
                      whileTap={{ scale: 0.97 }}
                      onClick={handleSubmit}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '11px 26px', fontSize: '14px', fontWeight: '700',
                        borderRadius: '11px', border: 'none', cursor: 'pointer',
                        background: 'linear-gradient(135deg, #6C63FF, #5A54E8)',
                        color: '#fff', boxShadow: '0 4px 10px rgba(108,99,255,0.2)',
                        transition: 'all 0.2s ease',
                        minWidth: '160px', justifyContent: 'center',
                      }}
                    >
                      Submit <ArrowRight size={14} />
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Guide Panel ── */}
          {(choice === 'no' || (maxStep && user.currentStep < maxStep)) && (
            <motion.div key="guide"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
            >
              <div style={{
                borderRadius: '16px', overflow: 'hidden',
                background: '#ffffff',
                border: '1px solid rgba(0,0,0,0.05)',
                boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
                display: 'flex', flexDirection: 'column',
                maxHeight: 'calc(100vh - 240px)'
              }}>
                <div style={{ height: '3px', background: 'linear-gradient(90deg, #6C63FF, #5A54E8)', flexShrink: 0 }} />

                {/* Guide header */}
                <div style={{
                  padding: '18px 26px 16px',
                  display: 'flex', alignItems: 'center', gap: '14px',
                  borderBottom: '1px solid rgba(0,0,0,0.05)',
                  background: 'var(--surface)',
                  flexShrink: 0
                }}>
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '11px', flexShrink: 0,
                    background: 'rgba(108,99,255,0.08)', border: '1px solid rgba(108,99,255,0.18)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Info size={19} color="#6C63FF" />
                  </div>
                  <div>
                    <h3 style={{ margin: '0 0 2px', fontSize: '15px', fontWeight: '600', color: 'var(--txt)' }}>Implementation Guide</h3>
                    <p style={{ margin: 0, fontSize: '13px', fontWeight: '400', color: 'var(--txt-muted)' }}>
                      Follow each step carefully, then select <strong style={{ color: 'var(--green)' }}>"Yes, done!"</strong> above to submit proof
                    </p>
                  </div>
                </div>

                <div style={{ padding: '26px 30px', overflowY: 'auto', flex: 1 }} className="prose">
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
              background: 'rgba(255,255,255,0.92)',
              backdropFilter: 'blur(20px)',
            }}
          >
            <div style={{ textAlign: 'center', maxWidth: '480px', width: '100%', padding: '0 20px' }}>

              {/* Animated ring cluster */}
              <div style={{ position: 'relative', width: '180px', height: '180px', margin: '0 auto 40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {(uploadState === 'uploading' || uploadState === 'ocr' || uploadState === 'ai') && (
                  <motion.div
                    animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2.5, ease: 'linear' }}
                    style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2.5px solid transparent', borderTopColor: '#5b3ef0', opacity: 0.8 }}
                  />
                )}
                {(uploadState === 'ocr' || uploadState === 'ai') && (
                  <motion.div
                    animate={{ rotate: -360 }} transition={{ repeat: Infinity, duration: 3.5, ease: 'linear' }}
                    style={{ position: 'absolute', inset: '16px', borderRadius: '50%', border: '3px solid transparent', borderBottomColor: '#7c5cfc', borderLeftColor: 'rgba(91,62,240,0.3)' }}
                  />
                )}
                {uploadState === 'ai' && (
                  <motion.div
                    animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                    style={{ position: 'absolute', inset: '32px', borderRadius: '50%', border: '2px dashed rgba(91,62,240,0.18)' }}
                  />
                )}
                {uploadState === 'success' && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 14 }}
                    style={{ position: 'absolute', inset: '24px', background: 'var(--green)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 40px rgba(5,150,105,0.3)' }}>
                    <CheckCircle2 size={60} color="#fff" strokeWidth={1.5} />
                  </motion.div>
                )}
                {uploadState === 'error' && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 14 }}
                    style={{ position: 'absolute', inset: '24px', background: 'var(--red)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 40px rgba(220,38,38,0.25)' }}>
                    <XCircle size={60} color="#fff" strokeWidth={1.5} />
                  </motion.div>
                )}
                {(uploadState === 'uploading' || uploadState === 'ocr' || uploadState === 'ai') && (
                  <motion.div initial={{ scale: 0.8 }} animate={{ scale: [0.9, 1.06, 0.9] }} transition={{ repeat: Infinity, duration: 2 }} style={{ zIndex: 10 }}>
                    {uploadState === 'uploading' && <UploadCloud size={56} color="#5b3ef0" strokeWidth={1.2} />}
                    {uploadState === 'ocr' && <ScanLine size={56} color="#7c5cfc" strokeWidth={1.2} />}
                    {uploadState === 'ai' && <BrainCircuit size={56} color="#5b3ef0" strokeWidth={1.2} />}
                  </motion.div>
                )}
              </div>

              <h2 style={{ fontSize: '28px', fontWeight: '800', letterSpacing: '-0.025em', marginBottom: '12px', color: 'var(--txt)' }}>
                {uploadState === 'uploading' && 'Transmitting Data'}
                {uploadState === 'ocr' && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}>Extracting Text</motion.span>}
                {uploadState === 'ai' && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-gradient">AI Processing</motion.span>}
                {uploadState === 'success' && <span style={{ color: 'var(--green)' }}>Verification Passed!</span>}
                {uploadState === 'error' && <span style={{ color: 'var(--red)' }}>Verification Failed</span>}
              </h2>

              <p style={{ color: 'var(--txt-muted)', fontSize: '15px', lineHeight: 1.65, margin: '0 auto 32px', maxWidth: '380px' }}>
                {uploadState === 'uploading' && 'Securely transferring your screenshot to MongoDB Atlas.'}
                {uploadState === 'ocr' && 'Optical Character Recognition is processing your snapshot.'}
                {uploadState === 'ai' && 'Verifying your screenshot against the step requirements…'}
                {uploadState === 'success' && 'Your proof has been validated. You are cleared for the next step!'}
                {uploadState === 'error' && error}
              </p>

              {uploadState === 'error' && (
                <motion.button
                  whileHover={{ y: -1 }}
                  onClick={() => setUploadState('')}
                  style={{
                    padding: '13px 32px', fontSize: '14px', fontWeight: '700',
                    borderRadius: '11px', border: '1.5px solid var(--border)',
                    background: '#ffffff', cursor: 'pointer',
                    color: 'var(--txt)', boxShadow: 'var(--shadow-sm)',
                    transition: 'all 0.2s',
                  }}
                >
                  Try Again
                </motion.button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
}
