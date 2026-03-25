import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, TrendingUp, AlertTriangle, Trophy, Zap, RefreshCw, Crown, Star, Target } from 'lucide-react';
import axios from 'axios';

const TOTAL_STEPS = 8;
const MAX_SCORE = 800;

const AVATAR_COLORS = [
    '#7c3aed', '#059669', '#0284c7', '#d97706', '#db2777',
    '#16a34a', '#9333ea', '#ea580c', '#0891b2', '#b45309',
    '#0f766e', '#1d4ed8', '#65a30d', '#be185d', '#6d28d9',
];

function normalise(r) {
    const stepsCompleted = typeof r.stepsCompleted === 'number'
        ? r.stepsCompleted
        : Math.max(0, (r.currentStep ?? 1) - 1);
    const rejectionCount = r.rejectionCount ?? 0;
    const netScore = typeof r.netScore === 'number'
        ? r.netScore
        : stepsCompleted * 100 - rejectionCount * 25;
    const scorePercent = typeof r.scorePercent === 'number'
        ? r.scorePercent
        : Math.round((netScore / MAX_SCORE) * 100);
    return { ...r, stepsCompleted, rejectionCount, netScore, scorePercent };
}

function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

function getTier(pct) {
    if (pct >= 90) return { label: 'ELITE', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', glow: 'rgba(245,158,11,0.3)', border: 'rgba(245,158,11,0.25)' };
    if (pct >= 70) return { label: 'ADVANCED', color: '#a78bfa', bg: 'rgba(167,139,250,0.08)', glow: 'rgba(167,139,250,0.25)', border: 'rgba(167,139,250,0.25)' };
    if (pct >= 40) return { label: 'RISING', color: '#38bdf8', bg: 'rgba(56,189,248,0.08)', glow: 'rgba(56,189,248,0.2)', border: 'rgba(56,189,248,0.2)' };
    return { label: 'ACTIVE', color: '#6b7280', bg: 'rgba(107,114,128,0.06)', glow: 'transparent', border: 'rgba(107,114,128,0.18)' };
}

/* ── Animated Score Ring ── */
function ScoreRing({ pct, size = 52, color, isYou, animated }) {
    const r = (size - 8) / 2;
    const circ = 2 * Math.PI * r;
    const dash = animated ? (Math.min(pct, 100) / 100) * circ : 0;
    return (
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5.5" />
            <circle
                cx={size / 2} cy={size / 2} r={r} fill="none"
                stroke={color} strokeWidth="5.5"
                strokeDasharray={`${dash} ${circ}`}
                strokeLinecap="round"
                style={{
                    transition: 'stroke-dasharray 1.8s cubic-bezier(0.22,1,0.36,1)',
                    filter: `drop-shadow(0 0 ${isYou ? 6 : 3}px ${color})`,
                }}
            />
            <text
                x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
                style={{
                    transform: `rotate(90deg)`,
                    transformOrigin: `${size / 2}px ${size / 2}px`,
                    fontSize: '9px', fontWeight: '800',
                    fill: color,
                    fontFamily: '"Orbitron","Courier New",monospace',
                }}
            >{pct}%</text>
        </svg>
    );
}

/* ── Animated Score Bar ── */
function ScoreBar({ pct, color, animated }) {
    return (
        <div style={{ height: '6px', borderRadius: '99px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden', width: '100%', position: 'relative' }}>
            <div style={{
                height: '100%', borderRadius: '99px',
                background: `linear-gradient(90deg, ${color}55, ${color}dd, ${color})`,
                width: animated ? `${Math.min(Math.max(pct, 0), 100)}%` : '0%',
                transition: 'width 1.8s cubic-bezier(0.22,1,0.36,1)',
                boxShadow: `0 0 10px ${color}66`,
                position: 'relative',
            }}>
                <div style={{
                    position: 'absolute', inset: 0, borderRadius: '99px',
                    background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.25) 50%, transparent 100%)',
                    animation: 'barShimmer 2.4s ease-in-out infinite',
                }} />
            </div>
        </div>
    );
}

/* ── Step Progress Dots ── */
function StepDots({ stepsCompleted, isCompleted, color }) {
    return (
        <div style={{ display: 'flex', gap: '3px', flexShrink: 0 }}>
            {Array.from({ length: TOTAL_STEPS }, (_, i) => {
                const done = i < stepsCompleted;
                const active = i === stepsCompleted && !isCompleted;
                return (
                    <div key={i} style={{
                        width: '9px', height: '9px', borderRadius: '3px',
                        background: done ? color : active ? `${color}28` : 'rgba(255,255,255,0.04)',
                        border: done ? 'none' : active ? `1px solid ${color}66` : '1px solid rgba(255,255,255,0.07)',
                        transition: `all 0.35s ease ${i * 0.06}s`,
                        boxShadow: done ? `0 0 5px ${color}66` : 'none',
                    }} />
                );
            })}
        </div>
    );
}

/* ── Skeleton Loading Row ── */
function SkeletonRow({ delay = 0 }) {
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: '14px',
            padding: '12px 16px', borderRadius: '14px',
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
            animation: `skeletonFade 1.6s ease-in-out ${delay}s infinite alternate`,
        }}>
            <div style={{ width: '32px', height: '16px', borderRadius: '6px', background: 'rgba(255,255,255,0.06)' }} />
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ width: '40%', height: '10px', borderRadius: '6px', background: 'rgba(255,255,255,0.06)' }} />
                <div style={{ width: '100%', height: '6px', borderRadius: '99px', background: 'rgba(255,255,255,0.06)' }} />
            </div>
            <div style={{ width: '56px', height: '22px', borderRadius: '20px', background: 'rgba(255,255,255,0.06)' }} />
        </div>
    );
}

/* ── Speed Lines SVG ── */
function SpeedLines() {
    return (
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.06, pointerEvents: 'none' }} preserveAspectRatio="none">
            {[8, 18, 29, 41, 52, 62, 73, 84, 93].map((y, i) => (
                <line key={i} x1="-10%" y1={`${y}%`} x2="110%" y2={`${y + 2}%`}
                    stroke="white" strokeWidth={i % 3 === 0 ? '1.5' : '0.8'}
                    style={{ animation: `speedLine 3.5s ease-in-out ${i * 0.35}s infinite alternate` }}
                />
            ))}
        </svg>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN EXPORT
═══════════════════════════════════════════════════════════════════════════ */
export default function RaceLeaderboard({ user }) {
    const [racers, setRacers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [animated, setAnimated] = useState(false);
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
        return () => {
            clearInterval(intervalRef.current);
            clearInterval(countdownRef.current);
        };
    }, []);

    useEffect(() => {
        if (racers.length > 0) setTimeout(() => setAnimated(true), 120);
    }, [racers.length]);

    /* ── LOADING STATE ── */
    if (loading) return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '12px' }}>
            {[0, 0.15, 0.3].map((d, i) => <SkeletonRow key={i} delay={d} />)}
            <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '11px', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.12em', fontFamily: '"Orbitron",monospace' }}>
                LOADING RACE DATA...
            </div>
        </div>
    );

    const yourData = racers.find(r => r.rollNumber === user?.rollNumber);
    const yourPos = racers.findIndex(r => r.rollNumber === user?.rollNumber) + 1;
    const circumference = 2 * Math.PI * 9;

    return (
        <div style={{ fontFamily: 'inherit', paddingBottom: '52px' }}>

            {/* ══════════════ HERO HEADER ══════════════ */}
            <motion.div
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                style={{
                    background: 'linear-gradient(135deg, #06040f 0%, #100824 45%, #030e0a 100%)',
                    borderRadius: '20px', padding: '28px 32px', marginBottom: '20px',
                    position: 'relative', overflow: 'hidden',
                    border: '1px solid rgba(124,92,252,0.22)',
                    boxShadow: '0 0 60px -20px rgba(124,92,252,0.25), 0 32px 64px -24px rgba(0,0,0,0.7)',
                }}
            >
                {/* Glows */}
                <div style={{ position: 'absolute', top: '-80px', left: '-60px', width: '320px', height: '320px', background: 'radial-gradient(circle, rgba(124,92,252,0.18) 0%, transparent 65%)', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', bottom: '-60px', right: '40px', width: '260px', height: '260px', background: 'radial-gradient(circle, rgba(20,217,151,0.08) 0%, transparent 65%)', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '200px', height: '200px', background: 'radial-gradient(circle, rgba(245,158,11,0.06) 0%, transparent 65%)', pointerEvents: 'none' }} />
                <SpeedLines />

                {/* Top accent bar */}
                <div style={{ position: 'absolute', top: 0, left: '32px', right: '32px', height: '2px', background: 'linear-gradient(90deg, transparent, #7c5cfc, #14d997, transparent)', borderRadius: '0 0 2px 2px' }} />

                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                    {/* Title block */}
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                            <div style={{
                                width: '42px', height: '42px', borderRadius: '12px',
                                background: 'linear-gradient(135deg, #7c5cfc, #a78bfa)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 0 20px rgba(124,92,252,0.5)',
                                flexShrink: 0,
                            }}>
                                <span style={{ fontSize: '22px', lineHeight: 1 }}>🏎️</span>
                            </div>
                            <div>
                                <div style={{
                                    fontFamily: '"Orbitron","Courier New",monospace',
                                    fontSize: '22px', fontWeight: '900', letterSpacing: '0.10em',
                                    background: 'linear-gradient(90deg, #e0d7ff 0%, #a78bfa 40%, #14d997 100%)',
                                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                                    lineHeight: 1.1,
                                }}>
                                    DATAPIPELINE RACE
                                </div>
                                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.12em', marginTop: '3px', fontWeight: '600' }}>
                                    LIVE STUDENT LEADERBOARD · {racers.length} RACER{racers.length !== 1 ? 'S' : ''}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Controls */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        {lastUpdate && (
                            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.05em' }}>
                                Updated {lastUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                        )}

                        {/* Countdown ring button */}
                        <button
                            onClick={() => fetchLeaderboard(true)}
                            style={{
                                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '10px', padding: '7px 13px', cursor: 'pointer',
                                color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: '6px',
                                fontSize: '11px', fontWeight: '600', transition: 'all 0.2s',
                                backdropFilter: 'blur(8px)',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
                        >
                            <svg width="16" height="16" viewBox="0 0 22 22" style={{ transform: 'rotate(-90deg)' }}>
                                <circle cx="11" cy="11" r="9" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
                                <circle cx="11" cy="11" r="9" fill="none" stroke="#7c5cfc" strokeWidth="2"
                                    strokeDasharray={`${(countdown / 15) * circumference} ${circumference}`}
                                    strokeLinecap="round"
                                    style={{ transition: 'stroke-dasharray 0.9s ease' }}
                                />
                            </svg>
                            <RefreshCw size={11} style={{ animation: refreshing ? 'spinAnim 0.7s linear infinite' : 'none' }} />
                            {refreshing ? 'Refreshing...' : `${countdown}s`}
                        </button>

                        {/* LIVE badge */}
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '7px',
                            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                            color: '#f87171', fontSize: '11px', fontWeight: '800',
                            padding: '6px 14px', borderRadius: '20px', letterSpacing: '0.1em',
                            backdropFilter: 'blur(8px)',
                        }}>
                            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#ef4444', animation: 'racePulse 1.2s ease-in-out infinite', boxShadow: '0 0 6px #ef4444' }} />
                            LIVE
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* ══════════════ YOUR STAT CARDS ══════════════ */}
            {yourData ? (
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: 0.1 }}
                    style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '20px' }}
                >
                    {[
                        { icon: <Trophy size={15} color="#f59e0b" />, label: 'YOUR RANK', value: `#${yourPos}`, sub: `of ${racers.length} racers`, color: '#f59e0b', border: 'rgba(245,158,11,0.22)', bg: 'rgba(245,158,11,0.05)' },
                        { icon: <TrendingUp size={15} color="#a78bfa" />, label: 'NET SCORE', value: `${yourData.scorePercent}%`, sub: `${yourData.netScore} / ${MAX_SCORE} pts`, color: '#a78bfa', border: 'rgba(167,139,250,0.22)', bg: 'rgba(167,139,250,0.05)' },
                        { icon: <Zap size={15} color="#34d399" />, label: 'STEPS DONE', value: `${yourData.stepsCompleted}/${TOTAL_STEPS}`, sub: `${yourData.stepsCompleted * 100} raw pts`, color: '#34d399', border: 'rgba(52,211,153,0.22)', bg: 'rgba(52,211,153,0.05)' },
                        {
                            icon: <Target size={15} color={yourData.rejectionCount > 0 ? '#f87171' : '#34d399'} />,
                            label: 'WRONG SHOTS',
                            value: `${yourData.rejectionCount}`,
                            sub: yourData.rejectionCount > 0 ? `−${yourData.rejectionCount * 25} pts` : 'No penalties 🎯',
                            color: yourData.rejectionCount > 0 ? '#f87171' : '#34d399',
                            border: yourData.rejectionCount > 0 ? 'rgba(248,113,113,0.22)' : 'rgba(52,211,153,0.22)',
                            bg: yourData.rejectionCount > 0 ? 'rgba(248,113,113,0.05)' : 'rgba(52,211,153,0.05)',
                        },
                    ].map(({ icon, label, value, sub, color, border, bg }, i) => (
                        <motion.div
                            key={label}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.12 + i * 0.06 }}
                            whileHover={{ y: -3, boxShadow: `0 8px 28px -8px ${color}44` }}
                            style={{
                                background: bg, border: `1px solid ${border}`, borderRadius: '16px',
                                padding: '16px 18px', position: 'relative', overflow: 'hidden',
                                backdropFilter: 'blur(12px)', cursor: 'default',
                                transition: 'box-shadow 0.25s',
                            }}
                        >
                            {/* left stripe */}
                            <div style={{ position: 'absolute', left: 0, top: '12px', bottom: '12px', width: '3px', background: color, borderRadius: '0 3px 3px 0', opacity: 0.7 }} />
                            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '10px', paddingLeft: '6px' }}>
                                {icon}
                                <span style={{ fontSize: '9px', fontWeight: '700', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.12em' }}>{label}</span>
                            </div>
                            <div style={{ fontFamily: '"Orbitron","Courier New",monospace', fontSize: '24px', fontWeight: '900', color, lineHeight: 1, paddingLeft: '6px' }}>{value}</div>
                            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '5px', paddingLeft: '6px' }}>{sub}</div>
                        </motion.div>
                    ))}
                </motion.div>
            ) : (
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    style={{ marginBottom: '20px', padding: '16px 20px', borderRadius: '14px', background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.18)', fontSize: '13px', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    <span style={{ fontSize: '18px' }}>⏳</span>
                    Complete step 1 to appear on the leaderboard and see your stats.
                </motion.div>
            )}

            {/* ══════════════ F1 PODIUM ══════════════ */}
            {racers.length >= 2 && (
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    style={{ marginBottom: '20px' }}
                >
                    {/* Section header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                        <div style={{ height: '1px', flex: 1, background: 'linear-gradient(90deg, rgba(245,158,11,0.4), transparent)' }} />
                        <span style={{ fontSize: '10px', fontWeight: '700', color: 'rgba(245,158,11,0.7)', letterSpacing: '0.14em', fontFamily: '"Orbitron",monospace' }}>🏆 PODIUM</span>
                        <div style={{ height: '1px', flex: 1, background: 'linear-gradient(90deg, transparent, rgba(245,158,11,0.4))' }} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: racers.length >= 3 ? '1fr 1.2fr 1fr' : '1fr 1fr', gap: '12px', alignItems: 'end' }}>
                        {[1, 0, 2].map((dataIdx, gridIdx) => {
                            const r = racers[dataIdx];
                            if (!r) return null;
                            const isYou = r.rollNumber === user?.rollNumber;
                            const tier = getTier(r.scorePercent);
                            const medals = ['🥇', '🥈', '🥉'];
                            const rankNums = [2, 1, 3];
                            const rank = rankNums[gridIdx];
                            const platformHeights = ['140px', '180px', '120px'];
                            const isWinner = rank === 1;

                            return (
                                <motion.div
                                    key={r.rollNumber || dataIdx}
                                    initial={{ opacity: 0, y: 32 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.25 + gridIdx * 0.1, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                                    whileHover={{ y: -4 }}
                                    style={{
                                        background: isWinner
                                            ? 'linear-gradient(160deg, rgba(245,158,11,0.1) 0%, rgba(245,158,11,0.04) 100%)'
                                            : isYou
                                                ? 'rgba(124,92,252,0.08)'
                                                : tier.bg,
                                        border: `1px solid ${isWinner ? 'rgba(245,158,11,0.3)' : isYou ? 'rgba(124,92,252,0.35)' : tier.border}`,
                                        borderRadius: '18px', padding: '24px 16px 20px',
                                        textAlign: 'center', minHeight: platformHeights[gridIdx],
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '7px',
                                        position: 'relative', overflow: 'hidden',
                                        boxShadow: isWinner
                                            ? '0 0 40px -12px rgba(245,158,11,0.35)'
                                            : isYou
                                                ? '0 0 32px -10px rgba(124,92,252,0.3)'
                                                : `0 0 24px -10px ${tier.glow}`,
                                        backdropFilter: 'blur(12px)',
                                        transition: 'box-shadow 0.25s',
                                        cursor: 'default',
                                    }}
                                >
                                    {/* Winner shimmer overlay */}
                                    {isWinner && (
                                        <div style={{
                                            position: 'absolute', inset: 0, borderRadius: 'inherit',
                                            background: 'linear-gradient(135deg, rgba(245,158,11,0.06) 0%, transparent 50%, rgba(245,158,11,0.04) 100%)',
                                            animation: 'podiumGlow 3s ease-in-out infinite alternate',
                                            pointerEvents: 'none',
                                        }} />
                                    )}

                                    {/* Top accent */}
                                    <div style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: '2px', background: isWinner ? 'linear-gradient(90deg, transparent, #f59e0b, transparent)' : `linear-gradient(90deg, transparent, ${tier.color}66, transparent)`, borderRadius: '0 0 2px 2px' }} />

                                    {isYou && <div style={{ position: 'absolute', top: '8px', right: '10px', fontSize: '7px', fontWeight: '800', color: '#a78bfa', background: 'rgba(124,92,252,0.2)', padding: '2px 8px', borderRadius: '8px', letterSpacing: '0.1em', border: '1px solid rgba(124,92,252,0.3)' }}>YOU</div>}

                                    {isWinner && <Crown size={18} color="#f59e0b" style={{ filter: 'drop-shadow(0 0 6px rgba(245,158,11,0.6))', animation: 'crownFloat 2.5s ease-in-out infinite' }} />}
                                    <div style={{ fontSize: '28px', lineHeight: 1 }}>{medals[rank - 1]}</div>

                                    <div style={{
                                        width: '44px', height: '44px', borderRadius: '50%',
                                        background: AVATAR_COLORS[dataIdx % AVATAR_COLORS.length],
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '14px', fontWeight: '800', color: '#fff',
                                        boxShadow: `0 0 16px ${AVATAR_COLORS[dataIdx % AVATAR_COLORS.length]}66`,
                                        border: '2px solid rgba(255,255,255,0.15)',
                                    }}>
                                        {getInitials(r.name)}
                                    </div>

                                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#f0f0f8', maxWidth: '110px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name?.split(' ')[0] ?? '—'}</div>
                                    <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace', letterSpacing: '0.05em' }}>{r.rollNumber}</div>

                                    <div style={{ fontFamily: '"Orbitron","Courier New",monospace', fontSize: isWinner ? '26px' : '22px', fontWeight: '900', color: isWinner ? '#f59e0b' : tier.color, lineHeight: 1, filter: `drop-shadow(0 0 6px ${isWinner ? 'rgba(245,158,11,0.4)' : tier.glow})` }}>
                                        {r.scorePercent}%
                                    </div>
                                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.28)' }}>{r.netScore} pts</div>

                                    {r.rejectionCount > 0 && (
                                        <div style={{ fontSize: '9px', color: '#f87171', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                            <AlertTriangle size={8} /> −{r.rejectionCount * 25} pts
                                        </div>
                                    )}

                                    {/* Platform base */}
                                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '4px', background: isWinner ? 'linear-gradient(90deg, transparent, #f59e0b88, transparent)' : `linear-gradient(90deg, transparent, ${tier.color}44, transparent)` }} />
                                </motion.div>
                            );
                        })}
                    </div>
                </motion.div>
            )}

            {/* ══════════════ FULL RACE TABLE ══════════════ */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <div style={{ height: '1px', flex: 1, background: 'linear-gradient(90deg, rgba(124,92,252,0.4), transparent)' }} />
                <span style={{ fontSize: '10px', fontWeight: '700', color: 'rgba(124,92,252,0.7)', letterSpacing: '0.14em', fontFamily: '"Orbitron",monospace' }}>ALL RACERS — SCORE RANKING</span>
                <div style={{ height: '1px', flex: 1, background: 'linear-gradient(90deg, transparent, rgba(124,92,252,0.4))' }} />
            </div>

            {racers.length === 0 ? (
                <div style={{ padding: '48px 24px', textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '13px', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', background: 'rgba(255,255,255,0.01)' }}>
                    <div style={{ fontSize: '32px', marginBottom: '10px' }}>🏁</div>
                    No racers yet. Be the first to submit a step!
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <AnimatePresence>
                        {racers.map((racer, idx) => {
                            const isYou = racer.rollNumber === user?.rollNumber;
                            const pos = idx + 1;
                            const tier = getTier(racer.scorePercent);
                            const avatarColor = AVATAR_COLORS[idx % AVATAR_COLORS.length];
                            const posLabel = pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : `#${pos}`;

                            return (
                                <motion.div
                                    key={racer.rollNumber || racer._id || idx}
                                    layout
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    transition={{ delay: idx * 0.035, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                                    whileHover={{ x: 3, boxShadow: isYou ? '0 0 0 1px rgba(124,92,252,0.4), 0 8px 24px rgba(0,0,0,0.4)' : '0 4px 20px rgba(0,0,0,0.3)' }}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '14px',
                                        background: isYou
                                            ? 'linear-gradient(90deg, rgba(124,92,252,0.1) 0%, rgba(124,92,252,0.03) 100%)'
                                            : pos <= 3
                                                ? 'rgba(255,255,255,0.025)'
                                                : 'rgba(255,255,255,0.015)',
                                        border: isYou ? '1px solid rgba(124,92,252,0.38)' : `1px solid rgba(255,255,255,${pos <= 3 ? '0.07' : '0.04'})`,
                                        borderRadius: '14px', padding: '12px 16px',
                                        position: 'relative', overflow: 'hidden',
                                        boxShadow: isYou
                                            ? '0 0 0 1px rgba(124,92,252,0.1), 0 4px 20px rgba(0,0,0,0.35)'
                                            : '0 2px 10px rgba(0,0,0,0.18)',
                                        cursor: 'default',
                                        backdropFilter: isYou ? 'blur(6px)' : 'none',
                                        transition: 'box-shadow 0.2s',
                                    }}
                                >
                                    {/* YOUR indicator stripe */}
                                    {isYou && <div style={{ position: 'absolute', left: 0, top: '8px', bottom: '8px', width: '3px', background: 'linear-gradient(180deg, #7c5cfc, #a78bfa)', borderRadius: '0 3px 3px 0', boxShadow: '0 0 8px rgba(124,92,252,0.6)' }} />}

                                    {/* Top-3 glow line */}
                                    {pos <= 3 && !isYou && <div style={{ position: 'absolute', top: 0, left: '60px', right: '60px', height: '1px', background: `linear-gradient(90deg, transparent, ${pos === 1 ? '#f59e0b' : pos === 2 ? '#9ca3af' : '#b45309'}44, transparent)` }} />}

                                    {/* Rank */}
                                    <div style={{
                                        width: '36px', textAlign: 'center', flexShrink: 0,
                                        fontFamily: '"Orbitron","Courier New",monospace',
                                        fontSize: pos <= 3 ? '16px' : '12px', fontWeight: '700',
                                        color: pos === 1 ? '#f59e0b' : pos === 2 ? '#9ca3af' : pos === 3 ? '#b45309' : 'rgba(255,255,255,0.2)',
                                        filter: pos <= 3 ? `drop-shadow(0 0 4px ${pos === 1 ? '#f59e0b' : pos === 2 ? '#9ca3af' : '#b45309'}66)` : 'none',
                                    }}>
                                        {posLabel}
                                    </div>

                                    {/* Score ring */}
                                    <ScoreRing pct={racer.scorePercent} size={48} color={tier.color} isYou={isYou} animated={animated} />

                                    {/* Avatar */}
                                    <div style={{
                                        width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0,
                                        background: avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '12px', fontWeight: '700', color: '#fff',
                                        boxShadow: `0 0 10px ${avatarColor}55`,
                                        border: `2px solid ${avatarColor}44`,
                                    }}>
                                        {getInitials(racer.name)}
                                    </div>

                                    {/* Name block */}
                                    <div style={{ width: '130px', flexShrink: 0, overflow: 'hidden' }}>
                                        <div style={{
                                            fontSize: '13px', fontWeight: '600',
                                            color: isYou ? '#c4b5fd' : pos <= 3 ? '#f0f0f8' : '#d1d5db',
                                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                            display: 'flex', alignItems: 'center', gap: '5px',
                                        }}>
                                            {isYou && <Flame size={11} color="#a78bfa" />}
                                            {racer.name?.split(' ')[0] ?? '—'}
                                            {racer.isCompleted && <span style={{ fontSize: '12px' }}>🏆</span>}
                                        </div>
                                        <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace', marginTop: '2px', letterSpacing: '0.04em' }}>{racer.rollNumber}</div>
                                    </div>

                                    {/* Score bar + breakdown */}
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
                                        <ScoreBar pct={racer.scorePercent} color={tier.color} animated={animated} />
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)' }}>
                                                <span style={{ color: '#34d399', fontWeight: '700' }}>+{racer.stepsCompleted * 100}</span> steps
                                            </span>
                                            {racer.rejectionCount > 0 && (
                                                <span style={{ fontSize: '10px', color: '#f87171', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                    <AlertTriangle size={8} />−{racer.rejectionCount * 25} ({racer.rejectionCount}×)
                                                </span>
                                            )}
                                            <span style={{ fontSize: '10px', fontWeight: '700', color: tier.color }}>= {racer.netScore} pts</span>
                                        </div>
                                    </div>

                                    {/* Tier badge */}
                                    <div style={{
                                        padding: '4px 10px', borderRadius: '20px',
                                        fontSize: '8px', fontWeight: '800', letterSpacing: '0.1em',
                                        flexShrink: 0, whiteSpace: 'nowrap',
                                        background: tier.bg, color: tier.color,
                                        border: `1px solid ${tier.border}`,
                                        boxShadow: `0 0 10px -2px ${tier.glow}`,
                                        fontFamily: '"Orbitron",monospace',
                                    }}>
                                        {tier.label}
                                    </div>

                                    {/* Step dots */}
                                    <StepDots stepsCompleted={racer.stepsCompleted} isCompleted={racer.isCompleted} color={tier.color} />
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            )}

            {/* Footer */}
            <div style={{ marginTop: '28px', textAlign: 'center', fontSize: '10px', color: 'rgba(255,255,255,0.1)', letterSpacing: '0.1em', fontFamily: '"Orbitron",monospace' }}>
                AUTO-REFRESH · 15s INTERVAL · {racers.length} RACER{racers.length !== 1 ? 'S' : ''} TRACKED
            </div>

            <style>{`
                @keyframes racePulse   { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.6)} }
                @keyframes spinAnim    { to { transform:rotate(360deg); } }
                @keyframes speedLine   { 0%{opacity:0.03;transform:scaleX(0.8) translateX(-2%)} 100%{opacity:0.09;transform:scaleX(1.05) translateX(2%)} }
                @keyframes barShimmer  { 0%{transform:translateX(-120%)} 60%{transform:translateX(120%)} 100%{transform:translateX(120%)} }
                @keyframes crownFloat  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
                @keyframes podiumGlow  { 0%{opacity:0.6} 100%{opacity:1} }
                @keyframes skeletonFade{ 0%{opacity:0.4} 100%{opacity:0.7} }
            `}</style>
        </div>
    );
}
