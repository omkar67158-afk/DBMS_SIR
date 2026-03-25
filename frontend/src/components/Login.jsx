import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { motion } from 'framer-motion';
import { Database, Shield, BookOpen, CheckCircle2, CloudUpload, Award, ArrowRight } from 'lucide-react';
import axios from 'axios';

const features = [
  { icon: BookOpen,     text: 'Step-by-step guided labs with detailed instructions' },
  { icon: CloudUpload,  text: 'Screenshot proof submitted directly to MongoDB Atlas' },
  { icon: CheckCircle2, text: 'Progress saved automatically at every step' },
  { icon: Award,        text: 'Earn a personalized digital certificate upon completion' },
];

const stats = [
  { value: '8', label: 'Lab Steps' },
  { value: 'AI', label: 'Verified' },
  { value: '100%', label: 'Free' },
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
    <div className="login-root">
      {/* Subtle background geometry */}
      <div className="login-bg-geo" aria-hidden="true">
        <div className="login-bg-circle login-bg-circle-1" />
        <div className="login-bg-circle login-bg-circle-2" />
        <div className="login-bg-grid" />
      </div>

      <div className="login-grid">

        {/* ══ LEFT PANEL ══ */}
        <motion.div
          className="login-left"
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Instructor badge */}
          <div className="login-instructor">
            <div className="login-logo-wrap">
              <img src="/logo.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div>
              <div className="login-taught-by">Taught by</div>
              <div className="login-instructor-name">Sandeep Patil</div>
            </div>
          </div>

          {/* Course title */}
          <div className="login-title-block">
            <h1 className="login-h1">
              Data Pipeline<br />
              <span className="login-h1-accent">Masterclass</span>
            </h1>
            <p className="login-desc">
              A complete course on acquiring Kaggle datasets, provisioning a MongoDB Atlas cluster,
              and executing a production-ready ETL pipeline using Node.js.
            </p>
          </div>

          {/* Stats row */}
          <div className="login-stats">
            {stats.map((s, i) => (
              <div key={i} className="login-stat">
                <div className="login-stat-value">{s.value}</div>
                <div className="login-stat-label">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Feature list */}
          <ul className="login-features">
            {features.map(({ icon: Icon, text }) => (
              <li key={text} className="login-feature-item">
                <div className="login-feature-icon">
                  <Icon size={14} strokeWidth={2} />
                </div>
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* ══ RIGHT PANEL ══ */}
        <motion.div
          className="login-right"
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="login-card">
            {/* Card header */}
            <div className="login-card-header">
              <div className="login-card-eyebrow">
                <span className="login-card-dot" />
                Student Portal
              </div>
              <h2 className="login-card-title">Continue as a Student</h2>
              <p className="login-card-sub">
                Sign in to save and track your pipeline verification progress.
              </p>
            </div>

            {/* Divider */}
            <div className="login-card-divider" />

            {/* OAuth section */}
            <div className="login-oauth-section">
              <div className="login-oauth-label">
                <Shield size={11} strokeWidth={2.5} />
                <span>Secure OAuth 2.0 — no password needed</span>
              </div>

              <div className="login-google-wrap">
                <GoogleLogin
                  onSuccess={handleSuccess}
                  onError={() => setError('Google sign-in failed. Please try again.')}
                  theme="filled_black"
                  shape="rectangular"
                  width="320"
                  text="continue_with"
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <motion.div
                className="login-error"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {error}
              </motion.div>
            )}

            {/* Footer note */}
            <p className="login-card-footer">
              Your Google profile (name + email) is stored securely in MongoDB and is
              only visible to Sandeep Patil.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
