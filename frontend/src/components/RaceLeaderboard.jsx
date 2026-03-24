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

function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

function getTier(scorePct) {
    if (scorePct >= 90) return { label: 'ELITE', color: '#d97706', bg: 'rgba(217,119,6,0.12)', glow: 'rgba(217,119,6,0.3)' };
    if (scorePct >= 70) return { label: 'ADVANCED', color: '#7c3aed', bg: 'rgba(124,58,237,0.12)', glow: 'rgba(124,58,237,0.25)' };
    if (scorePct >= 40) return { label: 'PROGRESSING', color: '#0284c7', bg: 'rgba(2,132,199,0.12)', glow: 'rgba(2,132,199,0.2)' };
    return { label: 'WARMING UP', color: '#6b7280', bg: 'rgba(107,114,128,0.1)', glow: 'transparent' };
}

function ScoreRing({ pct, size = 48, color, isYou, animated }) {
    const r = (size - 8) / 2;
    const circ = 2 * Math.PI * r;
    const dash = animated ? (pct / 100) * circ : 0;
    return (
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth="5" />
            <circle
                cx={size / 2} cy={size / 2} r={r} fill="none"
                stroke={color} strokeWidth="5"
                strokeDasharray={`${dash} ${circ}`}
                strokeLinecap="round"
                style={{ transition: 'stroke-dasharray 1.6s cubic-bezier(0.22,1,0.36,1)', filter: isYou ? `drop-shadow(0 0 4px ${color})` : 'none' }}
            />
            <text
                x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
                style={{ transform: `rotate(90deg)`, transformOrigin: `${size / 2}px ${size / 2}px`, fontSize: '10px', fontWeight: '700', fill: color, fontFamily: '"Orbitron","Courier New",monospace' }}
            >{pct}%</text>
        </svg>
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
                headers: { Authorization: `Bearer ${token}` }
            });
            setRacers(res.data);
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
        if (racers.length > 0) setTimeout(() => setAnimated(true), 120);
    }, [racers.length]);

    if (loading) return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', gap: '16px' }}>
            <div className="spin" style={{ width: '32px', height: '32px', border: '2px solid var(--border)', borderTopColor: 'var(--brand)', borderRadius: '50%' }} />
            <span style={{ fontSize: '13px', color: 'var(--txt-muted)' }}>Loading race standings...</span>
        </div>
    );

    const yourData = racers.find(r => r.rollNumber === user?.rollNumber);
    const yourPos = racers.findIndex(r => r.rollNumber === user?.rollNumber) + 1;
    const topRacer = racers[0];
    const scoreDiff = topRacer && yourData ? topRacer.netScore - yourData.netScore : 0;

    return (
        <div style={{ fontFamily: 'inherit', paddingBottom: '32px' }}>

            {/* ─── DARK HERO HEADER ─── */}
            <div style={{
                background: 'linear-gradient(135deg, #0f0f1a 0%, #1a0f2e 50%, #0a1a0f 100%)',
                borderRadius: 'var(--radius-lg)',
                padding: '24px 28px',
                marginBottom: '20px',
                position: 'relative',
                overflow: 'hidden',
                border: '1px solid rgba(124,92,252,0.25)',
            }}>
                <div style={{ position: 'absolute', top: '-60px', left: '-40px', width: '220px', height: '220px', background: 'radial-gradient(circle, rgba(124,92,252,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', bottom: '-40px', right: '80px', width: '180px', height: '180px', background: 'radial-gradient(circle, rgba(20,217,151,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                            <span style={{ fontSize: '24px' }}>🏎️</span>
                            <span style={{ fontFamily: '"Orbitron","Courier New",monospace', fontSize: '20px', fontWeight: '900', letterSpacing: '0.1em', color: '#fff' }}>
                                DATAPIPELINE GP
                            </span>
                        </div>
                        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                            {[
                                { icon: '✅', text: 'Step done = +100 pts' },
                                { icon: '❌', text: 'Wrong screenshot = −25 pts' },
                                { icon: '🏆', text: `Max ${MAX_SCORE} pts = 100%` },
                            ].map(({ icon, text }) => (
                                <span key={text} style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    {icon} {text}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {lastUpdate && (
                            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>
                                Updated {lastUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                        )}
                        <button onClick={() => fetchLeaderboard(true)} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', color: 'rgba(255,255,255,0.55)', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px' }}>
                            <RefreshCw size={11} style={{ animation: refreshing ? 'spinAnim 0.8s linear infinite' : 'none' }} />
                            Refresh
                        </button>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', fontSize: '11px', fontWeight: '700', padding: '5px 12px', borderRadius: '20px', letterSpacing: '0.08em' }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444', animation: 'racePulse 1.2s ease-in-out infinite' }} />
                            LIVE
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── YOUR STATS CARDS ─── */}
            {yourData && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                    style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' }}>
                    {[
                        { icon: <Trophy size={15} color="#d97706" />, label: 'YOUR RANK', value: `#${yourPos}`, sub: `of ${racers.length} racers`, color: '#d97706', border: 'rgba(217,119,6,0.3)', bg: 'rgba(217,119,6,0.07)' },
                        { icon: <TrendingUp size={15} color="var(--brand)" />, label: 'SCORE', value: `${yourData.scorePct}%`, sub: `${yourData.netScore} / ${MAX_SCORE} pts`, color: 'var(--brand)', border: 'rgba(124,92,252,0.3)', bg: 'rgba(124,92,252,0.07)' },
                        { icon: <Zap size={15} color="var(--green)" />, label: 'STEPS DONE', value: `${yourData.stepsCompleted}/${TOTAL_STEPS}`, sub: `${yourData.stepsCompleted * 100} raw pts`, color: 'var(--green)', border: 'rgba(20,217,151,0.25)', bg: 'rgba(20,217,151,0.07)' },
                        { icon: <AlertTriangle size={15} color={yourData.rejectionCount > 0 ? '#f87171' : 'var(--green)'} />, label: 'WRONG SHOTS', value: yourData.rejectionCount, sub: `−${yourData.rejectionCount * 25} pts penalty`, color: yourData.rejectionCount > 0 ? '#f87171' : 'var(--green)', border: yourData.rejectionCount > 0 ? 'rgba(248,113,113,0.3)' : 'rgba(20,217,151,0.25)', bg: yourData.rejectionCount > 0 ? 'rgba(248,113,113,0.07)' : 'rgba(20,217,151,0.07)' },
                    ].map(({ icon, label, value, sub, color, border, bg }) => (
                        <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 'var(--radius-md)', padding: '14px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                                {icon}
                                <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--txt-faint)', letterSpacing: '0.08em' }}>{label}</span>
                            </div>
                            <div style={{ fontFamily: '"Orbitron",monospace', fontSize: '22px', fontWeight: '700', color }}>{value}</div>
                            <div style={{ fontSize: '11px', color: 'var(--txt-muted)', marginTop: '3px' }}>{sub}</div>
                        </div>
                    ))}
                </motion.div>
            )}

            {/* ─── PODIUM TOP 3 ─── */}
            {racers.length >= 3 && (
                <div style={{ marginBottom: '20px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--txt-faint)', letterSpacing: '0.1em', marginBottom: '10px' }}>🏆 PODIUM</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1fr', gap: '10px', alignItems: 'end' }}>
                        {[1, 0, 2].map((dataIdx, gridIdx) => {
                            const r = racers[dataIdx];
                            if (!r) return null;
                            const isYou = r.rollNumber === user?.rollNumber;
                            const tier = getTier(r.scorePct);
                            const medals = ['🥇', '🥈', '🥉'];
                            const ranks = [1, 0, 2];
                            const rankNum = ranks[gridIdx] + 1;
                            const minH = ['168px', '200px', '152px'];
                            return (
                                <motion.div key={r.rollNumber}
                                    initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: gridIdx * 0.08 }}
                                    style={{
                                        background: isYou ? 'rgba(124,92,252,0.09)' : tier.bg,
                                        border: `1px solid ${isYou ? 'var(--brand)' : tier.color + '44'}`,
                                        borderRadius: 'var(--radius-md)', padding: '20px 14px 16px',
                                        textAlign: 'center', minHeight: minH[gridIdx],
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '7px',
                                        position: 'relative',
                                        boxShadow: `0 0 24px ${tier.glow}`,
                                    }}>
                                    {isYou && <div style={{ position: 'absolute', top: '8px', right: '8px', fontSize: '9px', fontWeight: '700', color: 'var(--brand)', background: 'rgba(124,92,252,0.15)', padding: '2px 6px', borderRadius: '6px' }}>YOU</div>}
                                    <div style={{ fontSize: '26px' }}>{medals[rankNum - 1]}</div>
                                    <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: AVATAR_COLORS[dataIdx % AVATAR_COLORS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '700', color: '#fff' }}>
                                        {getInitials(r.name)}
                                    </div>
                                    <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--txt)' }}>{r.name?.split(' ')[0]}</div>
                                    <div style={{ fontSize: '9px', color: 'var(--txt-faint)', fontFamily: 'monospace' }}>{r.rollNumber}</div>
                                    <div style={{ fontFamily: '"Orbitron",monospace', fontSize: '20px', fontWeight: '900', color: tier.color }}>{r.scorePct}%</div>
                                    <div style={{ fontSize: '11px', color: 'var(--txt-muted)' }}>{r.netScore} pts</div>
                                    {r.rejectionCount > 0 && (
                                        <div style={{ fontSize: '10px', color: '#f87171', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                            <AlertTriangle size={9} /> −{r.rejectionCount * 25} pts
                                        </div>
                                    )}
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ─── FULL RACE TABLE ─── */}
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--txt-faint)', letterSpacing: '0.1em', marginBottom: '10px' }}>
                ALL RACERS — SCORE RANKING
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <AnimatePresence>
                    {racers.map((racer, idx) => {
                        const isYou = racer.rollNumber === user?.rollNumber;
                        const pos = idx + 1;
                        const tier = getTier(racer.scorePct);
                        const avatarColor = AVATAR_COLORS[idx % AVATAR_COLORS.length];
                        const posLabel = pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : `#${pos}`;

                        return (
                            <motion.div
                                key={racer.rollNumber || racer._id}
                                layout
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.03, duration: 0.35 }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '12px',
                                    background: isYou ? 'rgba(124,92,252,0.05)' : 'var(--surface)',
                                    border: isYou ? '1.5px solid var(--brand)' : '1px solid var(--border)',
                                    borderRadius: 'var(--radius-md)',
                                    padding: '11px 16px',
                                    position: 'relative',
                                    boxShadow: isYou ? `0 0 0 3px rgba(124,92,252,0.08)` : 'none',
                                }}
                            >
                                {/* YOU accent bar */}
                                {isYou && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px', background: 'var(--brand)', borderRadius: '3px 0 0 3px' }} />}

                                {/* Rank */}
                                <div style={{ width: '34px', textAlign: 'center', flexShrink: 0, fontFamily: '"Orbitron",monospace', fontSize: pos <= 3 ? '15px' : '12px', fontWeight: '700', color: pos === 1 ? '#d97706' : pos === 2 ? '#9ca3af' : pos === 3 ? '#92400e' : 'var(--txt-muted)' }}>
                                    {posLabel}
                                </div>

                                {/* Score ring */}
                                <ScoreRing pct={racer.scorePct} size={46} color={tier.color} isYou={isYou} animated={animated} />

                                {/* Name */}
                                <div style={{ width: '130px', flexShrink: 0, overflow: 'hidden' }}>
                                    <div style={{ fontSize: '13px', fontWeight: '600', color: isYou ? 'var(--brand)' : 'var(--txt)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        {isYou && <Flame size={11} color="var(--brand)" />}
                                        {racer.name?.split(' ')[0]}
                                        {racer.isCompleted && <span>🏆</span>}
                                    </div>
                                    <div style={{ fontSize: '10px', color: 'var(--txt-faint)', fontFamily: 'monospace', marginTop: '1px' }}>{racer.rollNumber}</div>
                                </div>

                                {/* Score bar + breakdown */}
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <div style={{ height: '6px', background: 'var(--surface-3)', borderRadius: '3px', overflow: 'hidden' }}>
                                        <div style={{
                                            height: '100%', borderRadius: '3px',
                                            background: `linear-gradient(90deg, ${tier.color}bb, ${tier.color})`,
                                            width: animated ? `${racer.scorePct}%` : '0%',
                                            transition: 'width 1.6s cubic-bezier(0.22,1,0.36,1)',
                                        }} />
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '11px', color: 'var(--txt-muted)' }}>
                                            <span style={{ color: 'var(--green)', fontWeight: '600' }}>+{racer.stepsCompleted * 100}</span> steps
                                        </span>
                                        {racer.rejectionCount > 0 && (
                                            <span style={{ fontSize: '11px', color: '#f87171', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                <AlertTriangle size={9} />−{racer.rejectionCount * 25} ({racer.rejectionCount}×)
                                            </span>
                                        )}
                                        <span style={{ fontSize: '11px', fontWeight: '700', color: tier.color }}>= {racer.netScore} pts</span>
                                    </div>
                                </div>

                                {/* Tier badge */}
                                <div style={{ padding: '3px 9px', borderRadius: '12px', fontSize: '9px', fontWeight: '700', letterSpacing: '0.06em', flexShrink: 0, whiteSpace: 'nowrap', background: tier.bg, color: tier.color, border: `1px solid ${tier.color}44` }}>
                                    {tier.label}
                                </div>

                                {/* Step dots */}
                                <div style={{ display: 'flex', gap: '3px', flexShrink: 0 }}>
                                    {Array.from({ length: TOTAL_STEPS }, (_, i) => {
                                        const done = i < racer.stepsCompleted;
                                        const active = i === racer.stepsCompleted && !racer.isCompleted;
                                        return (
                                            <div key={i} style={{
                                                width: '9px', height: '9px', borderRadius: '2px',
                                                background: done ? tier.color : active ? `${tier.color}40` : 'var(--surface-3)',
                                                border: done ? 'none' : active ? `1px solid ${tier.color}` : '1px solid var(--border)',
                                                transition: `background 0.3s ease ${i * 0.04}s`,
                                            }} />
                                        );
                                    })}
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            <style>{`
        @keyframes racePulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.7)} }
        @keyframes spinAnim  { to { transform: rotate(360deg); } }
      `}</style>
        </div>
    );
}