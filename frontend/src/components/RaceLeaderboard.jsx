import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    RefreshCw, Trophy, CheckCircle2, Clock, AlertCircle,
    TrendingUp, Zap, Target, Award, Medal
} from 'lucide-react';
import axios from 'axios';

const TOTAL_STEPS = 8;
const MAX_SCORE = 800;

const COLORS = {
    brand: '#2563eb',
    brandLight: '#eff6ff',
    brandBorder: '#bfdbfe',
    green: '#059669',
    greenLight: '#ecfdf5',
    greenBorder: '#6ee7b7',
    amber: '#d97706',
    amberLight: '#fffbeb',
    amberBorder: '#fcd34d',
    red: '#dc2626',
    redLight: '#fee2e2',
    gray: '#6b7280',
    grayLight: '#f9fafb',
    border: '#e5e7eb',
    text: '#111827',
    textMuted: '#6b7280',
    textFaint: '#9ca3af',
};

const AVATAR_PALETTE = [
    '#7c3aed', '#059669', '#2563eb', '#d97706', '#db2777',
    '#0891b2', '#16a34a', '#9333ea', '#ea580c', '#0f766e',
    '#1d4ed8', '#b45309', '#be185d', '#6d28d9', '#0284c7',
];

function normalise(r) {
    const stepsCompleted = typeof r.stepsCompleted === 'number'
        ? r.stepsCompleted : Math.max(0, (r.currentStep ?? 1) - 1);
    const rejectionCount = r.rejectionCount ?? 0;
    const netScore = typeof r.netScore === 'number'
        ? r.netScore : stepsCompleted * 100 - rejectionCount * 25;
    const scorePercent = typeof r.scorePercent === 'number'
        ? r.scorePercent : Math.round((netScore / MAX_SCORE) * 100);
    return { ...r, stepsCompleted, rejectionCount, netScore, scorePercent };
}

function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

function getTier(pct) {
    if (pct >= 80) return { label: 'Elite', color: COLORS.amber, bg: COLORS.amberLight, border: COLORS.amberBorder, icon: '⚡' };
    if (pct >= 60) return { label: 'Advanced', color: COLORS.brand, bg: COLORS.brandLight, border: COLORS.brandBorder, icon: '🚀' };
    if (pct >= 30) return { label: 'Rising', color: COLORS.green, bg: COLORS.greenLight, border: COLORS.greenBorder, icon: '🌱' };
    return { label: 'Active', color: COLORS.gray, bg: '#f3f4f6', border: '#d1d5db', icon: '💡' };
}

/* ── Smooth Progress Bar ── */
function ProgressBar({ pct, color, height = 6, animate = true }) {
    return (
        <div style={{ height, borderRadius: 99, background: '#f3f4f6', overflow: 'hidden', width: '100%' }}>
            <motion.div
                initial={{ width: animate ? 0 : `${pct}%` }}
                animate={{ width: `${Math.min(Math.max(pct, 0), 100)}%` }}
                transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                style={{ height: '100%', borderRadius: 99, background: color }}
            />
        </div>
    );
}

/* ── Step Squares ── */
function StepDots({ stepsCompleted, color }) {
    return (
        <div style={{ display: 'flex', gap: 3 }}>
            {Array.from({ length: TOTAL_STEPS }, (_, i) => (
                <div key={i} style={{
                    width: 8, height: 8, borderRadius: 2,
                    background: i < stepsCompleted ? color : '#e5e7eb',
                    transition: `background 0.3s ease ${i * 0.05}s`,
                }} />
            ))}
        </div>
    );
}

/* ── Skeleton ── */
function SkeletonRow({ delay = 0 }) {
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '13px 20px', borderRadius: 12,
            background: '#fafafa', border: '1px solid #f3f4f6',
            animation: `skeletonPulse 1.4s ease-in-out ${delay}s infinite alternate`,
        }}>
            <div style={{ width: 28, height: 14, borderRadius: 4, background: '#e5e7eb' }} />
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#e5e7eb' }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
                <div style={{ width: '38%', height: 10, borderRadius: 4, background: '#e5e7eb' }} />
                <div style={{ width: '100%', height: 5, borderRadius: 99, background: '#e5e7eb' }} />
            </div>
            <div style={{ width: 56, height: 22, borderRadius: 20, background: '#e5e7eb' }} />
        </div>
    );
}

/* ── Stat Tile ── */
function StatTile({ icon, label, value, color, bg, border }) {
    return (
        <div style={{
            background: bg, border: `1px solid ${border}`, borderRadius: 14,
            padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 6,
            flex: 1, minWidth: 80,
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {icon}
                <span style={{ fontSize: 11, fontWeight: 600, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
        </div>
    );
}

/* ═══════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════ */
export default function RaceLeaderboard({ user }) {
    const [racers, setRacers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [countdown, setCountdown] = useState(15);
    const intervalRef = useRef(null);
    const countdownRef = useRef(null);

    const fetchLeaderboard = async (showSpinner = false) => {
        if (showSpinner) setRefreshing(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/leaderboard`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setRacers((res.data || []).map(normalise));
            setLastUpdate(new Date());
            setLoading(false);
        } catch (err) {
            console.error('Leaderboard fetch failed', err);
            setLoading(false);
        } finally {
            setRefreshing(false);
            setCountdown(15);
        }
    };

    useEffect(() => {
        fetchLeaderboard();
        intervalRef.current = setInterval(() => fetchLeaderboard(), 15000);
        countdownRef.current = setInterval(() => setCountdown(c => c <= 1 ? 15 : c - 1), 1000);
        return () => { clearInterval(intervalRef.current); clearInterval(countdownRef.current); };
    }, []);

    if (loading) return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[0, 0.1, 0.2, 0.3, 0.4].map((d, i) => <SkeletonRow key={i} delay={d} />)}
            <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: COLORS.textFaint, fontWeight: 500 }}>
                Loading leaderboard…
            </div>
        </div>
    );

    const yourData = racers.find(r => r.rollNumber === user?.rollNumber);
    const yourPos = racers.findIndex(r => r.rollNumber === user?.rollNumber) + 1;

    return (
        <div style={{ fontFamily: 'inherit', paddingBottom: 48, maxWidth: 960, margin: '0 auto' }}>

            {/* ─── HERO HEADER ─── */}
            <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45 }}
                style={{
                    background: 'linear-gradient(135deg, #ffffff 0%, #f8faff 100%)',
                    border: `1px solid ${COLORS.border}`, borderRadius: 20,
                    padding: '24px 32px', marginBottom: 20,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(37,99,235,0.06)',
                    position: 'relative', overflow: 'hidden',
                }}
            >
                {/* Decorative top-left corner accent */}
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                    background: 'linear-gradient(90deg, #2563eb 0%, #3b82f6 40%, #60a5fa 100%)',
                    borderRadius: '20px 20px 0 0',
                }} />

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                    {/* Title */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{
                            width: 48, height: 48, borderRadius: 14,
                            background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 4px 14px rgba(37,99,235,0.3)',
                        }}>
                            <Trophy size={22} color="#fff" />
                        </div>
                        <div>
                            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: COLORS.text, letterSpacing: '-0.03em', lineHeight: 1.2 }}>
                                Course Leaderboard
                            </h1>
                            <p style={{ margin: '3px 0 0', fontSize: 13, color: COLORS.textMuted, fontWeight: 500 }}>
                                Live rankings · {racers.length} student{racers.length !== 1 ? 's' : ''} competing
                            </p>
                        </div>
                    </div>

                    {/* Controls */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {lastUpdate && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: COLORS.textFaint, fontWeight: 500 }}>
                                <Clock size={12} />
                                {lastUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </div>
                        )}
                        <button
                            onClick={() => fetchLeaderboard(true)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                background: '#fff', border: `1px solid ${COLORS.border}`,
                                borderRadius: 10, padding: '8px 16px', cursor: 'pointer',
                                fontSize: 13, fontWeight: 600, color: COLORS.text,
                                transition: 'all 0.15s', boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#f9fafb'; e.currentTarget.style.borderColor = '#d1d5db'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = COLORS.border; }}
                        >
                            <RefreshCw size={13} style={{ animation: refreshing ? 'spinAnim 0.7s linear infinite' : 'none', color: refreshing ? COLORS.brand : 'inherit' }} />
                            {refreshing ? 'Refreshing…' : `${countdown}s`}
                        </button>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            background: COLORS.redLight, border: '1px solid #fca5a5',
                            borderRadius: 20, padding: '6px 14px',
                            fontSize: 11, fontWeight: 700, color: COLORS.red, letterSpacing: '0.06em',
                        }}>
                            <div style={{ width: 7, height: 7, borderRadius: '50%', background: COLORS.red, animation: 'liveDot 1.2s ease-in-out infinite' }} />
                            LIVE
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* ─── YOU ARE HERE ─── */}
            {yourData ? (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.08 }}
                    style={{
                        background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)',
                        border: '1.5px solid #bfdbfe', borderRadius: 20,
                        padding: '22px 28px', marginBottom: 20,
                        boxShadow: '0 4px 20px rgba(37,99,235,0.08)',
                        position: 'relative', overflow: 'hidden',
                    }}
                >
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: 'linear-gradient(180deg, #2563eb, #3b82f6)', borderRadius: '20px 0 0 20px' }} />

                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: COLORS.brand, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Target size={15} color="#fff" />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.brand, letterSpacing: '0.02em' }}>Your Standing</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                        {/* Avatar */}
                        <div style={{ position: 'relative', flexShrink: 0 }}>
                            <div style={{
                                width: 54, height: 54, borderRadius: '50%',
                                background: 'linear-gradient(135deg, #2563eb, #60a5fa)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 18, fontWeight: 800, color: '#fff',
                                boxShadow: '0 4px 12px rgba(37,99,235,0.3)',
                                border: '3px solid #fff',
                            }}>
                                {getInitials(yourData.name)}
                            </div>
                            <div style={{
                                position: 'absolute', bottom: -4, left: '50%', transform: 'translateX(-50%)',
                                background: COLORS.brand, color: '#fff',
                                fontSize: 8, fontWeight: 800, letterSpacing: '0.06em',
                                padding: '2px 7px', borderRadius: 6, whiteSpace: 'nowrap',
                                boxShadow: '0 2px 6px rgba(37,99,235,0.35)',
                            }}>YOU</div>
                        </div>

                        {/* Name + rank */}
                        <div style={{ minWidth: 100 }}>
                            <div style={{ fontSize: 17, fontWeight: 800, color: COLORS.text, letterSpacing: '-0.02em' }}>{yourData.name?.split(' ')[0] ?? '—'}</div>
                            <div style={{ fontSize: 11, color: COLORS.textFaint, fontFamily: 'monospace', marginTop: 2 }}>{yourData.rollNumber}</div>
                        </div>

                        {/* Rank badge */}
                        <div style={{
                            background: '#fff', border: `1.5px solid ${COLORS.brandBorder}`,
                            borderRadius: 14, padding: '10px 18px', textAlign: 'center', flexShrink: 0,
                            boxShadow: '0 1px 4px rgba(37,99,235,0.08)',
                        }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: COLORS.textFaint, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Rank</div>
                            <div style={{ fontSize: 28, fontWeight: 900, color: COLORS.brand, lineHeight: 1.1 }}>#{yourPos}</div>
                            <div style={{ fontSize: 10, color: COLORS.textFaint }}>of {racers.length}</div>
                        </div>

                        <div style={{ width: 1, height: 48, background: COLORS.brandBorder, flexShrink: 0 }} />

                        {/* Mini stat tiles */}
                        <StatTile icon={<TrendingUp size={13} color={COLORS.brand} />} label="Score" value={`${yourData.scorePercent}%`} color={COLORS.brand} bg="#fff" border={COLORS.brandBorder} />
                        <StatTile icon={<Zap size={13} color={COLORS.green} />} label="Steps" value={`${yourData.stepsCompleted}/${TOTAL_STEPS}`} color={COLORS.green} bg="#fff" border={COLORS.greenBorder} />
                        <StatTile icon={<Award size={13} color={COLORS.amber} />} label="Points" value={yourData.netScore} color={COLORS.amber} bg="#fff" border={COLORS.amberBorder} />
                        {yourData.rejectionCount > 0 && (
                            <StatTile icon={<AlertCircle size={13} color={COLORS.red} />} label="Penalties" value={yourData.rejectionCount} color={COLORS.red} bg={COLORS.redLight} border="#fca5a5" />
                        )}

                        {/* Progress */}
                        <div style={{ flex: 1, minWidth: 140 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                <span style={{ fontSize: 11, color: COLORS.textMuted, fontWeight: 600 }}>Course Progress</span>
                                <span style={{ fontSize: 11, color: COLORS.brand, fontWeight: 700 }}>{yourData.scorePercent}%</span>
                            </div>
                            <ProgressBar pct={yourData.scorePercent} color={COLORS.brand} height={7} />
                            <div style={{ marginTop: 8 }}>
                                <StepDots stepsCompleted={yourData.stepsCompleted} color={COLORS.brand} />
                            </div>
                        </div>
                    </div>
                </motion.div>
            ) : (
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    style={{
                        marginBottom: 20, padding: '16px 24px', borderRadius: 14,
                        background: COLORS.amberLight, border: `1px solid ${COLORS.amberBorder}`,
                        fontSize: 14, color: '#92400e', fontWeight: 500,
                        display: 'flex', alignItems: 'center', gap: 10,
                    }}
                >
                    <AlertCircle size={16} color={COLORS.amber} />
                    Complete your first step to appear on the leaderboard.
                </motion.div>
            )}

            {/* ─── PODIUM ─── */}
            {racers.length >= 2 && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.14 }}
                    style={{ marginBottom: 20 }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                        <Medal size={15} color={COLORS.amber} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.text }}>Top Performers</span>
                        <div style={{ flex: 1, height: 1, background: COLORS.border }} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(racers.length, 3)}, 1fr)`, gap: 12 }}>
                        {racers.slice(0, 3).map((r, i) => {
                            const pos = i + 1;
                            const isYou = r.rollNumber === user?.rollNumber;
                            const tier = getTier(r.scorePercent);
                            const medalColors = ['#d97706', '#6b7280', '#b45309'];
                            const medals = ['🥇', '🥈', '🥉'];
                            const avatarColor = AVATAR_PALETTE[i % AVATAR_PALETTE.length];
                            const heightMap = ['180px', '155px', '135px'];

                            return (
                                <motion.div
                                    key={r.rollNumber || i}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.18 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                                    whileHover={{ y: -4, boxShadow: `0 12px 32px -8px ${pos === 1 ? 'rgba(217,119,6,0.2)' : 'rgba(0,0,0,0.1)'}` }}
                                    style={{
                                        background: '#fff',
                                        border: `1.5px solid ${isYou ? COLORS.brandBorder : pos === 1 ? COLORS.amberBorder : COLORS.border}`,
                                        borderRadius: 18, padding: '22px 16px',
                                        textAlign: 'center', display: 'flex', flexDirection: 'column',
                                        alignItems: 'center', gap: 8,
                                        boxShadow: pos === 1
                                            ? '0 4px 24px rgba(217,119,6,0.1), 0 1px 3px rgba(0,0,0,0.04)'
                                            : '0 1px 3px rgba(0,0,0,0.04)',
                                        transition: 'all 0.2s', cursor: 'default',
                                        position: 'relative', overflow: 'hidden',
                                        minHeight: heightMap[i],
                                        justifyContent: 'center',
                                    }}
                                >
                                    {/* Top accent line */}
                                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: pos === 1 ? `linear-gradient(90deg, #fbbf24, #d97706, #fbbf24)` : isYou ? `linear-gradient(90deg, #93c5fd, #2563eb, #93c5fd)` : `linear-gradient(90deg, transparent, #e5e7eb, transparent)`, borderRadius: '18px 18px 0 0' }} />

                                    {isYou && (
                                        <div style={{ position: 'absolute', top: 8, right: 10, background: COLORS.brand, color: '#fff', fontSize: 8, fontWeight: 700, padding: '2px 7px', borderRadius: 6, letterSpacing: '0.04em' }}>YOU</div>
                                    )}

                                    <div style={{ fontSize: 28, lineHeight: 1 }}>{medals[i]}</div>

                                    <div style={{
                                        width: 46, height: 46, borderRadius: '50%',
                                        background: avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 15, fontWeight: 800, color: '#fff',
                                        boxShadow: `0 4px 10px ${avatarColor}44`,
                                    }}>
                                        {getInitials(r.name)}
                                    </div>

                                    <div>
                                        <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text }}>{r.name?.split(' ')[0] ?? '—'}</div>
                                        <div style={{ fontSize: 10, color: COLORS.textFaint, fontFamily: 'monospace', marginTop: 2 }}>{r.rollNumber}</div>
                                    </div>

                                    <div style={{ fontSize: pos === 1 ? 26 : 22, fontWeight: 900, color: medalColors[i], lineHeight: 1 }}>{r.scorePercent}%</div>
                                    <div style={{ fontSize: 11, color: COLORS.textFaint }}>{r.netScore} pts</div>

                                    <div style={{ width: '80%' }}>
                                        <ProgressBar pct={r.scorePercent} color={medalColors[i]} height={5} />
                                    </div>

                                    <div style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 4,
                                        background: tier.bg, color: tier.color, border: `1px solid ${tier.border}`,
                                        borderRadius: 20, padding: '3px 10px', fontSize: 10, fontWeight: 700,
                                    }}>
                                        {tier.icon} {tier.label}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </motion.div>
            )}

            {/* ─── FULL TABLE ─── */}
            <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <TrendingUp size={15} color={COLORS.brand} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.text }}>All Rankings</span>
                    <div style={{ flex: 1, height: 1, background: COLORS.border }} />
                    <span style={{ fontSize: 12, color: COLORS.textFaint, fontWeight: 500 }}>{racers.length} students</span>
                </div>

                {/* Column headings */}
                <div style={{
                    display: 'grid', gridTemplateColumns: '50px 1fr 80px 80px 90px 90px 110px',
                    alignItems: 'center', padding: '8px 18px',
                    background: '#f9fafb', border: `1px solid ${COLORS.border}`,
                    borderRadius: '10px 10px 0 0',
                }}>
                    {['Rank', 'Student', 'Steps', 'Score', 'Points', 'Tier', 'Progress'].map(h => (
                        <div key={h} style={{ fontSize: 11, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</div>
                    ))}
                </div>

                {racers.length === 0 ? (
                    <div style={{ padding: '48px 24px', textAlign: 'center', color: COLORS.textFaint, fontSize: 14, border: `1px solid ${COLORS.border}`, borderTop: 'none', borderRadius: '0 0 12px 12px', background: '#fafafa' }}>
                        <div style={{ fontSize: 32, marginBottom: 10 }}>🏁</div>
                        No students yet. Be the first to submit!
                    </div>
                ) : (
                    <div style={{ border: `1px solid ${COLORS.border}`, borderTop: 'none', borderRadius: '0 0 14px 14px', overflow: 'hidden' }}>
                        <AnimatePresence>
                            {racers.map((racer, idx) => {
                                const isYou = racer.rollNumber === user?.rollNumber;
                                const pos = idx + 1;
                                const tier = getTier(racer.scorePercent);
                                const avatarColor = AVATAR_PALETTE[idx % AVATAR_PALETTE.length];
                                const posEmoji = pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : null;

                                return (
                                    <motion.div
                                        key={racer.rollNumber || racer._id || idx}
                                        layout
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ delay: Math.min(idx * 0.025, 0.4) }}
                                        style={{
                                            display: 'grid', gridTemplateColumns: '50px 1fr 80px 80px 90px 90px 110px',
                                            alignItems: 'center',
                                            padding: '13px 18px',
                                            background: isYou ? COLORS.brandLight : idx % 2 === 0 ? '#ffffff' : '#fafafa',
                                            borderBottom: idx < racers.length - 1 ? `1px solid ${COLORS.border}` : 'none',
                                            cursor: 'default',
                                            transition: 'background 0.15s',
                                            position: 'relative',
                                        }}
                                        onMouseEnter={e => { if (!isYou) e.currentTarget.style.background = '#f9fafb'; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = isYou ? COLORS.brandLight : idx % 2 === 0 ? '#ffffff' : '#fafafa'; }}
                                    >
                                        {/* You indicator stripe */}
                                        {isYou && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: COLORS.brand }} />}

                                        {/* Rank */}
                                        <div style={{ textAlign: 'center', fontSize: pos <= 3 ? 18 : 13, fontWeight: 700, color: pos <= 3 ? (pos === 1 ? COLORS.amber : COLORS.gray) : COLORS.textFaint }}>
                                            {posEmoji ?? `#${pos}`}
                                        </div>

                                        {/* Student */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                                            <div style={{
                                                width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                                                background: avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: 12, fontWeight: 700, color: '#fff',
                                            }}>
                                                {getInitials(racer.name)}
                                            </div>
                                            <div style={{ overflow: 'hidden' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'nowrap' }}>
                                                    <span style={{ fontSize: 13, fontWeight: 600, color: isYou ? COLORS.brand : COLORS.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {racer.name?.split(' ')[0] ?? '—'}
                                                    </span>
                                                    {isYou && <span style={{ background: COLORS.brand, color: '#fff', fontSize: 8, fontWeight: 700, padding: '2px 6px', borderRadius: 4, letterSpacing: '0.04em', flexShrink: 0 }}>YOU</span>}
                                                    {racer.isCompleted && <CheckCircle2 size={12} color={COLORS.green} style={{ flexShrink: 0 }} />}
                                                </div>
                                                <div style={{ fontSize: 10, color: COLORS.textFaint, fontFamily: 'monospace', marginTop: 1 }}>{racer.rollNumber}</div>
                                            </div>
                                        </div>

                                        {/* Steps */}
                                        <div>
                                            <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text }}>{racer.stepsCompleted}/{TOTAL_STEPS}</div>
                                            <StepDots stepsCompleted={racer.stepsCompleted} color={tier.color} />
                                        </div>

                                        {/* Score % */}
                                        <div style={{ fontSize: 14, fontWeight: 800, color: tier.color }}>{racer.scorePercent}%</div>

                                        {/* Points */}
                                        <div>
                                            <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text }}>{racer.netScore} pts</div>
                                            {racer.rejectionCount > 0 && (
                                                <div style={{ fontSize: 10, color: COLORS.red, fontWeight: 600 }}>-{racer.rejectionCount * 25} pen.</div>
                                            )}
                                        </div>

                                        {/* Tier badge */}
                                        <div style={{
                                            display: 'inline-flex', alignItems: 'center', gap: 4, justifyContent: 'center',
                                            background: tier.bg, color: tier.color, border: `1px solid ${tier.border}`,
                                            borderRadius: 20, padding: '4px 10px',
                                            fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap',
                                        }}>
                                            {tier.icon} {tier.label}
                                        </div>

                                        {/* Progress bar */}
                                        <div style={{ paddingRight: 8 }}>
                                            <ProgressBar pct={racer.scorePercent} color={tier.color} height={5} />
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 12, color: COLORS.textFaint }}>
                <RefreshCw size={11} />
                Auto-refreshes every 15 seconds · {racers.length} students tracked
            </div>

            <style>{`
                @keyframes liveDot    { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.6)} }
                @keyframes spinAnim   { to { transform:rotate(360deg); } }
                @keyframes skeletonPulse { 0%{opacity:0.5} 100%{opacity:0.9} }
            `}</style>
        </div>
    );
}
