import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, TrendingUp, AlertTriangle, Trophy, Zap, RefreshCw } from 'lucide-react';
import axios from 'axios';

const TOTAL_STEPS = 8;
const MAX_SCORE = 800;

const AVATAR_COLORS = [
    '#7c3aed', '#059669', '#0284c7', '#d97706', '#db2777',
    '#16a34a', '#9333ea', '#ea580c', '#0891b2', '#b45309',
    '#0f766e', '#1d4ed8', '#65a30d', '#be185d', '#6d28d9',
];

// ── Normalise a racer record — server may return currentStep instead of stepsCompleted ──
function normalise(r) {
    const stepsCompleted = typeof r.stepsCompleted === 'number'
        ? r.stepsCompleted
        : Math.max(0, (r.currentStep ?? 1) - 1);
    const rejectionCount = r.rejectionCount ?? 0;
    const netScore = typeof r.netScore === 'number'
        ? r.netScore
        : Math.max(0, stepsCompleted * 100 - rejectionCount * 25);
    const scorePercent = typeof r.scorePercent === 'number'
        ? r.scorePercent
        : Math.max(0, Math.round((netScore / MAX_SCORE) * 100));
    return { ...r, stepsCompleted, rejectionCount, netScore, scorePercent };
}

function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

function getTier(pct) {
    if (pct >= 90) return { label: 'ELITE', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', glow: 'rgba(245,158,11,0.25)' };
    if (pct >= 70) return { label: 'ADVANCED', color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', glow: 'rgba(167,139,250,0.2)' };
    if (pct >= 40) return { label: 'PROGRESSING', color: '#38bdf8', bg: 'rgba(56,189,248,0.1)', glow: 'rgba(56,189,248,0.15)' };
    return { label: 'WARMING UP', color: '#6b7280', bg: 'rgba(107,114,128,0.08)', glow: 'transparent' };
}

function ScoreRing({ pct, size = 48, color, isYou, animated }) {
    const r = (size - 7) / 2;
    const circ = 2 * Math.PI * r;
    const dash = animated ? (Math.min(pct, 100) / 100) * circ : 0;
    return (
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
            <circle
                cx={size / 2} cy={size / 2} r={r} fill="none"
                stroke={color} strokeWidth="5"
                strokeDasharray={`${dash} ${circ}`}
                strokeLinecap="round"
                style={{
                    transition: 'stroke-dasharray 1.6s cubic-bezier(0.22,1,0.36,1)',
                    filter: isYou ? `drop-shadow(0 0 5px ${color})` : 'none',
                }}
            />
            <text
                x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
                style={{
                    transform: `rotate(90deg)`,
                    transformOrigin: `${size / 2}px ${size / 2}px`,
                    fontSize: '9px', fontWeight: '700',
                    fill: color,
                    fontFamily: '"Orbitron","Courier New",monospace',
                }}
            >{pct}%</text>
        </svg>
    );
}

function ScoreBar({ pct, color, animated }) {
    return (
        <div style={{ height: '5px', borderRadius: '99px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden', width: '100%' }}>
            <div style={{
                height: '100%', borderRadius: '99px',
                background: `linear-gradient(90deg, ${color}77, ${color})`,
                width: animated ? `${Math.min(Math.max(pct, 0), 100)}%` : '0%',
                transition: 'width 1.6s cubic-bezier(0.22,1,0.36,1)',
                boxShadow: `0 0 8px ${color}44`,
            }} />
        </div>
    );
}

function StepDots({ stepsCompleted, isCompleted, color }) {
    return (
        <div style={{ display: 'flex', gap: '3px', flexShrink: 0 }}>
            {Array.from({ length: TOTAL_STEPS }, (_, i) => {
                const done = i < stepsCompleted;
                const active = i === stepsCompleted && !isCompleted;
                return (
                    <div key={i} style={{
                        width: '8px', height: '8px', borderRadius: '2px',
                        background: done ? color : active ? `${color}33` : 'rgba(255,255,255,0.05)',
                        border: done ? 'none' : active ? `1px solid ${color}88` : '1px solid rgba(255,255,255,0.08)',
                        transition: `background 0.3s ease ${i * 0.05}s`,
                        boxShadow: done ? `0 0 4px ${color}55` : 'none',
                    }} />
                );
            })}
        </div>
    );
}

export default function RaceLeaderboard({ user }) {
    const [racers, setRacers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [animated, setAnimated] = useState(false);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const intervalRef = useRef(null);

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
        }
    };

    useEffect(() => {
        fetchLeaderboard();
        intervalRef.current = setInterval(fetchLeaderboard, 15000);
        return () => clearInterval(intervalRef.current);
    }, []);

    useEffect(() => {
        if (racers.length > 0) setTimeout(() => setAnimated(true), 100);
    }, [racers.length]);

    if (loading) return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', gap: '16px' }}>
            <div className="spin" style={{ width: '28px', height: '28px', border: '2px solid rgba(255,255,255,0.08)', borderTopColor: 'var(--brand)', borderRadius: '50%' }} />
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em' }}>LOADING RACE DATA...</span>
        </div>
    );

    const yourData = racers.find(r => r.rollNumber === user?.rollNumber);
    const yourPos = racers.findIndex(r => r.rollNumber === user?.rollNumber) + 1;

    return (
        <div style={{ fontFamily: 'inherit', paddingBottom: '40px' }}>

            {/* ── HERO HEADER ── */}
            <div style={{
                background: 'linear-gradient(135deg, #0d0d1a 0%, #130d24 55%, #0a160d 100%)',
                borderRadius: '16px', padding: '22px 26px', marginBottom: '16px',
                position: 'relative', overflow: 'hidden',
                border: '1px solid rgba(124,92,252,0.2)',
            }}>
                <div style={{ position: 'absolute', top: '-60px', left: '-40px', width: '260px', height: '260px', background: 'radial-gradient(circle, rgba(124,92,252,0.14) 0%, transparent 70%)', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', bottom: '-50px', right: '60px', width: '200px', height: '200px', background: 'radial-gradient(circle, rgba(20,217,151,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />

                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                            <span style={{ fontSize: '22px' }}>🏎️</span>
                            <span style={{ fontFamily: '"Orbitron","Courier New",monospace', fontSize: '18px', fontWeight: '900', letterSpacing: '0.12em', color: '#fff' }}>
                                DATAPIPELINE RACE
                            </span>
                        </div>

                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {lastUpdate && (
                            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.22)', letterSpacing: '0.04em' }}>
                                Updated {lastUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                        )}
                        <button onClick={() => fetchLeaderboard(true)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', color: 'rgba(255,255,255,0.45)', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px' }}>
                            <RefreshCw size={11} style={{ animation: refreshing ? 'spinAnim 0.8s linear infinite' : 'none' }} />
                            Refresh
                        </button>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.28)', color: '#f87171', fontSize: '11px', fontWeight: '700', padding: '5px 12px', borderRadius: '20px', letterSpacing: '0.08em' }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444', animation: 'racePulse 1.2s ease-in-out infinite' }} />
                            LIVE
                        </div>
                    </div>
                </div>
            </div>

            {/* ── YOUR STATS CARDS ── */}
            {yourData ? (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
                    style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px', marginBottom: '16px' }}>
                    {[
                        { icon: <Trophy size={14} color="#f59e0b" />, label: 'YOUR RANK', value: `#${yourPos}`, sub: `of ${racers.length} racer${racers.length !== 1 ? 's' : ''}`, color: '#f59e0b', border: 'rgba(245,158,11,0.25)', bg: 'rgba(245,158,11,0.06)' },
                        { icon: <TrendingUp size={14} color="#a78bfa" />, label: 'SCORE', value: `${yourData.scorePercent}%`, sub: `${yourData.netScore} / ${MAX_SCORE} pts`, color: '#a78bfa', border: 'rgba(167,139,250,0.25)', bg: 'rgba(167,139,250,0.06)' },
                        { icon: <Zap size={14} color="#34d399" />, label: 'STEPS DONE', value: `${yourData.stepsCompleted}/${TOTAL_STEPS}`, sub: `${yourData.stepsCompleted * 100} raw pts`, color: '#34d399', border: 'rgba(52,211,153,0.22)', bg: 'rgba(52,211,153,0.06)' },
                        { icon: <AlertTriangle size={14} color={yourData.rejectionCount > 0 ? '#f87171' : '#34d399'} />, label: 'WRONG SHOTS', value: `${yourData.rejectionCount}`, sub: yourData.rejectionCount > 0 ? `−${yourData.rejectionCount * 25} pts penalty` : 'No penalties 🎯', color: yourData.rejectionCount > 0 ? '#f87171' : '#34d399', border: yourData.rejectionCount > 0 ? 'rgba(248,113,113,0.25)' : 'rgba(52,211,153,0.22)', bg: yourData.rejectionCount > 0 ? 'rgba(248,113,113,0.06)' : 'rgba(52,211,153,0.06)' },
                    ].map(({ icon, label, value, sub, color, border, bg }) => (
                        <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: '12px', padding: '14px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                                {icon}
                                <span style={{ fontSize: '9px', fontWeight: '700', color: 'rgba(255,255,255,0.28)', letterSpacing: '0.1em' }}>{label}</span>
                            </div>
                            <div style={{ fontFamily: '"Orbitron","Courier New",monospace', fontSize: '22px', fontWeight: '900', color, lineHeight: 1 }}>{value}</div>
                            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.28)', marginTop: '5px' }}>{sub}</div>
                        </div>
                    ))}
                </motion.div>
            ) : (
                <div style={{ marginBottom: '16px', padding: '14px 18px', borderRadius: '12px', background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.18)', fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
                    ⏳ Complete step 1 to appear on the leaderboard.
                </div>
            )}

            {/* ── PODIUM ── */}
            {racers.length >= 2 && (
                <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '10px', fontWeight: '700', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.12em', marginBottom: '10px' }}>🏆 PODIUM</div>
                    <div style={{ display: 'grid', gridTemplateColumns: racers.length >= 3 ? '1fr 1.15fr 1fr' : '1fr 1fr', gap: '10px', alignItems: 'end' }}>
                        {[1, 0, 2].map((dataIdx, gridIdx) => {
                            const r = racers[dataIdx];
                            if (!r) return null;
                            const isYou = r.rollNumber === user?.rollNumber;
                            const tier = getTier(r.scorePercent);
                            const medals = ['🥇', '🥈', '🥉'];
                            const rankNums = [2, 1, 3];
                            const rank = rankNums[gridIdx];
                            const heights = ['158px', '194px', '146px'];
                            return (
                                <motion.div key={r.rollNumber || dataIdx}
                                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: gridIdx * 0.07 }}
                                    style={{
                                        background: isYou ? 'rgba(124,92,252,0.1)' : tier.bg,
                                        border: `1px solid ${isYou ? 'rgba(124,92,252,0.4)' : tier.color + '30'}`,
                                        borderRadius: '14px', padding: '18px 12px 14px',
                                        textAlign: 'center', minHeight: heights[gridIdx],
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                        position: 'relative',
                                        boxShadow: isYou ? '0 0 28px rgba(124,92,252,0.14)' : `0 0 20px ${tier.glow}`,
                                    }}>
                                    {isYou && <div style={{ position: 'absolute', top: '8px', right: '8px', fontSize: '8px', fontWeight: '700', color: '#a78bfa', background: 'rgba(124,92,252,0.18)', padding: '2px 7px', borderRadius: '6px', letterSpacing: '0.08em' }}>YOU</div>}
                                    <div style={{ fontSize: '22px' }}>{medals[rank - 1]}</div>
                                    <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: AVATAR_COLORS[dataIdx % AVATAR_COLORS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', color: '#fff', flexShrink: 0 }}>
                                        {getInitials(r.name)}
                                    </div>
                                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#e5e7eb', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name?.split(' ')[0] ?? '—'}</div>
                                    <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.28)', fontFamily: 'monospace' }}>{r.rollNumber}</div>
                                    <div style={{ fontFamily: '"Orbitron","Courier New",monospace', fontSize: '20px', fontWeight: '900', color: tier.color }}>{r.scorePercent}%</div>
                                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>{r.netScore} pts</div>
                                    {r.rejectionCount > 0 && (
                                        <div style={{ fontSize: '9px', color: '#f87171', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                            <AlertTriangle size={8} /> −{r.rejectionCount * 25} pts
                                        </div>
                                    )}
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── FULL RACE TABLE ── */}
            <div style={{ fontSize: '10px', fontWeight: '700', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.12em', marginBottom: '8px' }}>
                ALL RACERS — SCORE RANKING
            </div>

            {racers.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: 'rgba(255,255,255,0.22)', fontSize: '13px', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px' }}>
                    No racers yet. Be the first to submit a step!
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
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
                                    initial={{ opacity: 0, x: -16 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.04, duration: 0.3 }}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '12px',
                                        background: isYou
                                            ? 'linear-gradient(90deg, rgba(124,92,252,0.1) 0%, rgba(124,92,252,0.03) 100%)'
                                            : 'rgba(255,255,255,0.02)',
                                        border: isYou ? '1px solid rgba(124,92,252,0.38)' : '1px solid rgba(255,255,255,0.06)',
                                        borderRadius: '12px', padding: '10px 14px',
                                        position: 'relative',
                                        boxShadow: isYou ? '0 0 0 3px rgba(124,92,252,0.07), 0 4px 16px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.18)',
                                    }}
                                >
                                    {isYou && <div style={{ position: 'absolute', left: 0, top: '6px', bottom: '6px', width: '3px', background: 'var(--brand)', borderRadius: '0 3px 3px 0' }} />}

                                    {/* Rank */}
                                    <div style={{ width: '32px', textAlign: 'center', flexShrink: 0, fontFamily: '"Orbitron","Courier New",monospace', fontSize: pos <= 3 ? '14px' : '11px', fontWeight: '700', color: pos === 1 ? '#f59e0b' : pos === 2 ? '#9ca3af' : pos === 3 ? '#b45309' : 'rgba(255,255,255,0.22)' }}>
                                        {posLabel}
                                    </div>

                                    {/* Score ring */}
                                    <ScoreRing pct={racer.scorePercent} size={44} color={tier.color} isYou={isYou} animated={animated} />

                                    {/* Avatar + name */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '9px', width: '150px', flexShrink: 0, overflow: 'hidden' }}>
                                        <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', color: '#fff', flexShrink: 0 }}>
                                            {getInitials(racer.name)}
                                        </div>
                                        <div style={{ overflow: 'hidden' }}>
                                            <div style={{ fontSize: '12px', fontWeight: '600', color: isYou ? '#a78bfa' : '#e5e7eb', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                {isYou && <Flame size={10} color="#a78bfa" />}
                                                {racer.name?.split(' ')[0] ?? '—'}
                                                {racer.isCompleted && <span style={{ fontSize: '11px' }}>🏆</span>}
                                            </div>
                                            <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.22)', fontFamily: 'monospace', marginTop: '1px' }}>{racer.rollNumber}</div>
                                        </div>
                                    </div>

                                    {/* Score bar + breakdown */}
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px', minWidth: 0 }}>
                                        <ScoreBar pct={racer.scorePercent} color={tier.color} animated={animated} />
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.38)' }}>
                                                <span style={{ color: '#34d399', fontWeight: '600' }}>+{racer.stepsCompleted * 100}</span> steps
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
                                    <div style={{ padding: '3px 9px', borderRadius: '20px', fontSize: '8px', fontWeight: '700', letterSpacing: '0.08em', flexShrink: 0, whiteSpace: 'nowrap', background: tier.bg, color: tier.color, border: `1px solid ${tier.color}30` }}>
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

            <style>{`
                @keyframes racePulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.35;transform:scale(0.65)} }
                @keyframes spinAnim  { to { transform:rotate(360deg); } }
            `}</style>
        </div>
    );
}