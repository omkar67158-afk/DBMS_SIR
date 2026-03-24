import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Award, CheckCircle2, Download, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { STUDENTS } from '../students';

// ── Decorative SVG corner flourish ─────────────────────────────────
const Flourish = ({ rotate = 0, size = 56 }) => (
  <svg width={size} height={size} viewBox="0 0 56 56" style={{ transform: `rotate(${rotate}deg)`, display: 'block', flexShrink: 0 }}>
    <path fill="none" stroke="#d4af37" strokeWidth="1.2" opacity="0.8"
      d="M4 4 L4 20 M4 4 L20 4 M4 4 Q16 16 28 4 M4 4 Q4 16 4 28" />
    <circle cx="4" cy="4" r="2.5" fill="#d4af37" opacity="0.9" />
    <path fill="none" stroke="#d4af37" strokeWidth="0.6" opacity="0.4"
      d="M10 4 L10 14 M4 10 L14 10" />
  </svg>
);

// ── Wax Seal Component ──────────────────────────────────────────────
const WaxSeal = () => (
  <div style={{
    width: '120px', height: '120px', borderRadius: '50%', position: 'relative',
    background: 'radial-gradient(circle at 38% 35%, #c0392b, #7b1a1a)',
    boxShadow: '0 6px 24px rgba(0,0,0,0.5), inset 0 -4px 10px rgba(0,0,0,0.4), inset 0 4px 8px rgba(255,100,100,0.15)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
  }}>
    {/* Gear ring */}
    <div style={{
      position: 'absolute', inset: '8px', borderRadius: '50%',
      border: '2px dashed rgba(255,255,255,0.2)',
    }} />
    <div style={{
      position: 'absolute', inset: '14px', borderRadius: '50%',
      border: '1px solid rgba(255,255,255,0.15)',
    }} />
    <div style={{ textAlign: 'center', position: 'relative', zIndex: 2 }}>
      <div style={{ fontSize: '28px', lineHeight: 1, marginBottom: '2px' }}>⚜️</div>
      <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.9)', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Verified</div>
    </div>
  </div>
);

export default function Certificate({ name, email, completedAt, rollNumber }) {
  const certRef = useRef(null);
  const [downloading, setDownloading] = useState(false);

  // Use the OFFICIAL name from the class roll list if we have their roll number
  const officialName = (rollNumber && STUDENTS[rollNumber]) ? STUDENTS[rollNumber] : (name || 'Distinguished Engineer');
  const displayRoll = rollNumber || 'N/A';

  const dateStr = completedAt
    ? new Date(completedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const handleDownload = async () => {
    if (!certRef.current) return;
    try {
      setDownloading(true);
      const canvas = await html2canvas(certRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#0d1117'
      });
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `Certificate_${displayRoll}_${officialName.replace(/\s+/g, '_')}.png`;
      link.click();
    } catch (err) {
      console.error('Certificate export failed:', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', paddingBottom: '60px' }}>

      {/* ── Top Action Row ── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '36px', padding: '0 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <CheckCircle2 size={22} color="#14d997" />
          <div>
            <div style={{ fontSize: '16px', fontWeight: '700', color: '#fff' }}>Course Successfully Completed</div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Completion timestamp recorded in MongoDB Atlas</div>
          </div>
        </div>
        <button onClick={handleDownload} disabled={downloading}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 26px', border: 'none', borderRadius: '10px', cursor: 'pointer', background: 'linear-gradient(135deg, #b8860b, #d4af37, #aa8222)', color: '#000', fontWeight: '700', fontSize: '14px', letterSpacing: '0.04em', boxShadow: '0 4px 16px rgba(212,175,55,0.35)', opacity: downloading ? 0.6 : 1, transition: 'all 0.2s' }}>
          {downloading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={16} />}
          {downloading ? 'Generating HD PNG...' : 'Download Certificate'}
        </button>
      </motion.div>

      {/* ── Certificate Canvas ── */}
      <div style={{ overflowX: 'auto', padding: '0 20px' }}>
        <motion.div
          ref={certRef}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 100, damping: 15 }}
          style={{
            width: '920px',
            minHeight: '660px',
            background: '#0d1117',
            position: 'relative',
            overflow: 'hidden',
            borderRadius: '8px',
            boxShadow: '0 40px 80px -20px rgba(0,0,0,0.7)',
            margin: '0 auto',
            padding: '52px 64px',
            boxSizing: 'border-box',
            fontFamily: "'Georgia', 'Times New Roman', serif"
          }}
        >
          {/* Background texture stripes */}
          <div style={{
            position: 'absolute', inset: 0, opacity: 0.04,
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 28px, #d4af37 28px, #d4af37 29px)',
            pointerEvents: 'none'
          }} />

          {/* Outer gold border */}
          <div style={{ position: 'absolute', inset: '20px', border: '1.5px solid rgba(212,175,55,0.5)', borderRadius: '4px', pointerEvents: 'none' }} />
          {/* Inner thin border */}
          <div style={{ position: 'absolute', inset: '26px', border: '0.5px solid rgba(212,175,55,0.2)', borderRadius: '2px', pointerEvents: 'none' }} />

          {/* Corner Flourishes */}
          <div style={{ position: 'absolute', top: '30px', left: '30px' }}><Flourish rotate={0} /></div>
          <div style={{ position: 'absolute', top: '30px', right: '30px' }}><Flourish rotate={90} /></div>
          <div style={{ position: 'absolute', bottom: '30px', left: '30px' }}><Flourish rotate={270} /></div>
          <div style={{ position: 'absolute', bottom: '30px', right: '30px' }}><Flourish rotate={180} /></div>

          {/* Radial glow at center-top */}
          <div style={{
            position: 'absolute', top: '-80px', left: '50%', transform: 'translateX(-50%)',
            width: '600px', height: '300px', background: 'radial-gradient(ellipse at center, rgba(212,175,55,0.07) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} />

          {/* ── Content ── */}
          <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

            {/* Header Institution */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '18px', marginBottom: '28px' }}>
              <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.5))' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Award size={18} strokeWidth={1.5} color="#d4af37" />
                <span style={{ color: '#d4af37', fontSize: '11px', fontWeight: '700', fontFamily: 'system-ui, sans-serif', letterSpacing: '0.25em', textTransform: 'uppercase' }}>Data Pipeline Academy</span>
                <Award size={18} strokeWidth={1.5} color="#d4af37" />
              </div>
              <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(212,175,55,0.5), transparent)' }} />
            </div>

            {/* Main Title */}
            <div style={{ fontSize: '13px', fontFamily: 'system-ui, sans-serif', fontWeight: '700', color: '#94a3b8', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '14px' }}>
              Certificate of Professional Achievement
            </div>

            <h1 style={{ fontSize: '48px', color: '#fff', fontStyle: 'italic', fontWeight: 'normal', marginBottom: '32px', letterSpacing: '0.5px', lineHeight: 1.1 }}>
              Data Pipeline Masterclass
            </h1>

            {/* Middle decorative line with diamond */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', width: '100%', maxWidth: '680px', marginBottom: '24px' }}>
              <div style={{ flex: 1, height: '1px', background: 'rgba(212,175,55,0.35)' }} />
              <div style={{ width: '8px', height: '8px', background: '#d4af37', transform: 'rotate(45deg)', flexShrink: 0 }} />
              <div style={{ flex: 1, height: '1px', background: 'rgba(212,175,55,0.35)' }} />
            </div>

            <p style={{ color: '#64748b', fontSize: '14px', letterSpacing: '0.18em', textTransform: 'uppercase', fontFamily: 'system-ui, sans-serif', marginBottom: '20px' }}>
              This is to certify that
            </p>

            {/* Roll Number */}
            <div style={{ fontSize: '13px', fontFamily: 'system-ui, sans-serif', fontWeight: '700', color: '#94a3b8', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: '8px' }}>
              Roll No: <span style={{ color: '#d4af37' }}>{displayRoll}</span>
            </div>

            {/* Student Name (from official roll list) */}
            <h2 style={{ fontSize: '60px', color: '#d4af37', fontStyle: 'italic', fontWeight: 'bold', marginBottom: '12px', lineHeight: 1, textShadow: '0 2px 20px rgba(212,175,55,0.25)' }}>
              {officialName}
            </h2>
            
            {email && <p style={{ color: '#475569', fontSize: '13px', fontFamily: 'system-ui, sans-serif', marginBottom: '24px', letterSpacing: '0.05em' }}>{email}</p>}

            {/* Diamond divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', width: '100%', maxWidth: '640px', marginBottom: '24px' }}>
              <div style={{ flex: 1, height: '1px', background: 'rgba(212,175,55,0.35)' }} />
              <div style={{ width: '6px', height: '6px', background: 'rgba(212,175,55,0.5)', transform: 'rotate(45deg)', flexShrink: 0 }} />
              <div style={{ flex: 1, height: '1px', background: 'rgba(212,175,55,0.35)' }} />
            </div>

            <p style={{ color: '#94a3b8', fontSize: '15px', lineHeight: '1.85', maxWidth: '640px', fontStyle: 'italic', marginBottom: '44px' }}>
              has successfully demonstrated commanding proficiency in cloud database provisioning on MongoDB Atlas, network security configuration, and end-to-end ETL pipeline engineering using Node.js on a production dataset containing thousands of structured records.
            </p>

            {/* ── Footer Row: Date | Seal | Signature ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', width: '100%', maxWidth: '840px' }}>
              
              {/* Date column */}
              <div style={{ textAlign: 'center', width: '220px' }}>
                <div style={{ fontSize: '16px', color: '#e2e8f0', fontStyle: 'italic', marginBottom: '12px' }}>{dateStr}</div>
                <div style={{ height: '1px', background: 'rgba(212,175,55,0.45)', marginBottom: '8px' }} />
                <div style={{ fontSize: '10px', color: '#64748b', letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'system-ui, sans-serif', fontWeight: '700' }}>Date of Completion</div>
              </div>

              {/* Wax seal */}
              <WaxSeal />

              {/* Signature column */}
              <div style={{ textAlign: 'center', width: '220px' }}>
                <div style={{ fontSize: '40px', color: '#e2e8f0', fontStyle: 'italic', fontWeight: 'bold', marginBottom: '4px', lineHeight: 1.1, fontFamily: "'Georgia', serif" }}>S. Patil</div>
                <div style={{ height: '1px', background: 'rgba(212,175,55,0.45)', marginBottom: '8px' }} />
                <div style={{ fontSize: '10px', color: '#64748b', letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'system-ui, sans-serif', fontWeight: '700' }}>Prof. Sandeep Patil</div>
                <div style={{ fontSize: '10px', color: '#475569', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'system-ui, sans-serif', marginTop: '2px' }}>Course Instructor</div>
              </div>
            </div>

          </div>
        </motion.div>
      </div>
    </div>
  );
}
