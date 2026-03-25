import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { motion } from 'framer-motion';
import { Database, Shield, BookOpen, CheckCircle2, CloudUpload, Award } from 'lucide-react';
import axios from 'axios';

const features = [
  { icon: BookOpen,     text: 'Step-by-step guided labs with detailed instructions' },
  { icon: CloudUpload,  text: 'Screenshot proof submitted directly to MongoDB Atlas' },
  { icon: CheckCircle2, text: 'Your progress is saved automatically every step' },
  { icon: Award,        text: 'Earn a personalized digital certificate upon completion' },
];

export default function Login({ onLoginSuccess }) {
  const [error, setError] = useState(null);

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
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      minHeight: 'calc(100vh - 60px)',
      maxWidth: '1100px',
      margin: '0 auto',
      padding: '60px 40px',
      gap: '80px',
      alignItems: 'center',
    }}>

      {/* ── LEFT: Branding Panel ── */}
      <motion.div initial={{ opacity:0, x:-30 }} animate={{ opacity:1, x:0 }} transition={{ duration:0.5 }}>
        <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'32px' }}>
          <div style={{ width:'44px', height:'44px', background:'linear-gradient(135deg,#7c5cfc,#5b3fe0)', borderRadius:'12px', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:'0 8px 24px rgba(124,92,252,0.4)', overflow:'hidden' }}>
            <img src="/logo.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div>
            <div style={{ fontSize:'13px', fontWeight:'700', color:'var(--txt-muted)', letterSpacing:'0.08em', textTransform:'uppercase' }}>Taught by</div>
            <div style={{ fontSize:'16px', fontWeight:'700', color:'var(--txt)', letterSpacing:'-0.01em' }}>Sandeep Patil</div>
          </div>
        </div>

        <h1 style={{ fontSize:'46px', fontWeight:'800', lineHeight:'1.15', letterSpacing:'-0.04em', marginBottom:'20px' }}>
          Data Pipeline<br />
          <span className="text-gradient">Masterclass</span>
        </h1>
        <p style={{ color:'var(--txt-muted)', fontSize:'16px', lineHeight:'1.75', marginBottom:'40px', maxWidth:'420px' }}>
          A complete course on acquiring Kaggle datasets, provisioning a MongoDB Atlas cluster, and executing a production-ready ETL pipeline using Node.js.
        </p>

        <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
          {features.map(({ icon: Icon, text }) => (
            <div key={text} style={{ display:'flex', alignItems:'center', gap:'14px' }}>
              <div style={{ width:'34px', height:'34px', borderRadius:'8px', background:'var(--brand-fade)', border:'1px solid rgba(124,92,252,0.2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Icon size={16} color="var(--brand)" />
              </div>
              <span style={{ fontSize:'14px', color:'var(--txt-muted)' }}>{text}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── RIGHT: Login Card ── */}
      <motion.div initial={{ opacity:0, x:30 }} animate={{ opacity:1, x:0 }} transition={{ duration:0.5, delay:0.1 }}>
        <div className="card" style={{ padding:'48px 40px' }}>

          <div style={{ marginBottom:'28px' }}>
            <h2 style={{ fontSize:'22px', fontWeight:'700', letterSpacing:'-0.03em', marginBottom:'8px' }}>
              Continue as a Student
            </h2>
            <p style={{ color:'var(--txt-muted)', fontSize:'14px', lineHeight:'1.6' }}>
              Sign in to save and track your pipeline verification progress.
            </p>
          </div>

          <div className="divider" />

          <div style={{ display:'flex', flexDirection:'column', gap:'12px', padding:'24px 0' }}>
            <p style={{ fontSize:'11px', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--txt-faint)', display:'flex', alignItems:'center', gap:'6px' }}>
              <Shield size={11} /> Secure OAuth 2.0
            </p>
            <div style={{ display:'flex', justifyContent:'center', backgroundColor:'var(--surface)', padding:'12px', borderRadius:'var(--radius-md)', border:'1px solid var(--border)' }}>
              <GoogleLogin
                onSuccess={handleSuccess}
                onError={() => setError('Google sign-in failed. Please try again.')}
                theme="filled_black" shape="rectangular" width="320" text="continue_with"
              />
            </div>
          </div>

          <div className="divider" />

          {error && (
            <motion.p initial={{ opacity:0 }} animate={{ opacity:1 }}
              style={{ color:'var(--red)', background:'var(--red-fade)', border:'1px solid rgba(248,113,113,0.25)', borderRadius:'var(--radius-sm)', padding:'12px 14px', fontSize:'13px', marginTop:'16px', fontWeight:'500' }}
            >
              {error}
            </motion.p>
          )}

          <p style={{ fontSize:'12px', color:'var(--txt-faint)', textAlign:'center', marginTop:'20px', lineHeight:'1.6' }}>
            Your Google profile (name + email) is stored securely in MongoDB and only visible to Sandeep Patil.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
