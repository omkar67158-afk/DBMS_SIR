import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const TOTAL_STEPS = 8;

function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

function getSpeed(step) {
    if (step > TOTAL_STEPS) return { label: 'FINISHED', color: '#d97706', bg: '#fef3c7' };
    if (step >= 6) return { label: 'ON FIRE', color: '#065f46', bg: '#d1fae5' };
    if (step >= 3) return { label: 'CRUISING', color: '#92400e', bg: '#fef3c7' };
    return { label: 'WARMING UP', color: '#991b1b', bg: '#fee2e2' };
}

const AVATAR_COLORS = [
    '#7c3aed', '#059669', '#0284c7', '#d97706', '#db2777',
    '#16a34a', '#9333ea', '#ea580c', '#0891b2', '#65a30d',
    '#be185d', '#6d28d9', '#b45309', '#0f766e', '#1d4ed8',
];

export default function RaceLeaderboard({ user }) {
    const [racers, setRacers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [animated, setAnimated] = useState(false);
    const intervalRef = useRef(null);

    const fetchLeaderboard = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/leaderboard`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const sorted = res.data.sort((a, b) => b.currentStep - a.currentStep);
            setRacers(sorted);
            setLoading(false);
        } catch (err) {
            console.error('Leaderboard fetch failed', err);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeaderboard();
        intervalRef.current = setInterval(fetchLeaderboard, 15000); // refresh every 15s
        return () => clearInterval(intervalRef.current);
    }, []);

    useEffect(() => {
        if (racers.length > 0) {
            setTimeout(() => setAnimated(true), 100);
        }
    }, [racers]);

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px', color: 'var(--txt-muted)', fontSize: '14px' }}>
            Loading race standings...
        </div>
    );

    const yourPos = racers.findIndex(r => r.rollNumber === user?.rollNumber) + 1;
    const yourData = racers.find(r => r.rollNumber === user?.rollNumber);
    const topRacer = racers[0];
    const stepsAhead = topRacer && yourData ? topRacer.currentStep - yourData?.currentStep : 0;

    return (
        <div style={{ fontFamily: 'inherit' }}>

            {/* ── Header ── */}
            <div style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                padding: '20px 24px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
            }}>
                <div>
                    <div style={{
                        fontFamily: '"Orbitron", "Courier New", monospace',
                        fontSize: '16px',
                        fontWeight: '900',
                        letterSpacing: '0.08em',
                        color: 'var(--txt)',
                    }}>
                        DATAPIPELINE GP
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--txt-muted)', marginTop: '2px' }}>
                        {racers.length} racers · {TOTAL_STEPS} checkpoints · updates every 15s
                    </div>
                </div>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    background: '#fee2e2', color: '#b91c1c',
                    fontSize: '11px', fontWeight: '700',
                    padding: '5px 12px', borderRadius: '20px',
                    letterSpacing: '0.05em',
                }}>
                    <div style={{
                        width: '7px', height: '7px', borderRadius: '50%', background: '#ef4444',
                        animation: 'racePulse 1.2s ease-in-out infinite',
                    }} />
                    LIVE
                </div>
            </div>

            {/* ── Your Position Summary ── */}
            {yourData && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '10px',
                    marginBottom: '16px',
                }}>
                    {[
                        { label: 'YOUR POSITION', value: `#${yourPos}`, sub: `of ${racers.length} racers`, color: 'var(--brand)' },
                        { label: 'YOUR STEP', value: `${Math.min(yourData.currentStep, TOTAL_STEPS)}/${TOTAL_STEPS}`, sub: 'completed', color: 'var(--green)' },
                        { label: 'AHEAD OF YOU', value: yourPos - 1, sub: 'racers to pass', color: '#f59e0b' },
                        { label: 'STEPS BEHIND LEADER', value: stepsAhead > 0 ? stepsAhead : '🏆', sub: stepsAhead > 0 ? 'catch up!' : 'You\'re leading!', color: stepsAhead === 0 ? 'var(--green)' : '#ef4444' },
                    ].map(({ label, value, sub, color }) => (
                        <div key={label} style={{
                            background: 'var(--surface)',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-md)',
                            padding: '14px 16px',
                        }}>
                            <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--txt-faint)', letterSpacing: '0.08em', marginBottom: '6px' }}>{label}</div>
                            <div style={{ fontFamily: '"Orbitron", monospace', fontSize: '22px', fontWeight: '700', color }}>{value}</div>
                            <div style={{ fontSize: '11px', color: 'var(--txt-muted)', marginTop: '2px' }}>{sub}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Step Labels ── */}
            <div style={{ display: 'flex', paddingLeft: '200px', paddingRight: '32px', marginBottom: '6px' }}>
                {Array.from({ length: TOTAL_STEPS }, (_, i) => (
                    <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: '10px', fontWeight: '600', color: 'var(--txt-faint)', letterSpacing: '0.04em' }}>
                        S{i + 1}
                    </div>
                ))}
                <div style={{ width: '28px', textAlign: 'center', fontSize: '12px' }}>🏁</div>
            </div>

            {/* ── Race Rows ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <AnimatePresence>
                    {racers.map((racer, idx) => {
                        const isYou = racer.rollNumber === user?.rollNumber;
                        const pct = Math.min(((racer.currentStep - 1) / TOTAL_STEPS) * 100, 100);
                        const pos = idx + 1;
                        const spd = getSpeed(racer.currentStep);
                        const avatarColor = AVATAR_COLORS[idx % AVATAR_COLORS.length];
                        const posLabel = pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : `#${pos}`;

                        return (
                            <motion.div
                                key={racer.rollNumber || racer._id}
                                layout
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.04 }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    background: 'var(--surface)',
                                    border: isYou ? '1.5px solid var(--brand)' : '1px solid var(--border)',
                                    borderRadius: 'var(--radius-md)',
                                    height: '56px',
                                    overflow: 'hidden',
                                    position: 'relative',
                                    boxShadow: isYou ? '0 0 0 3px rgba(124,92,252,0.1)' : 'none',
                                }}
                            >
                                {/* Position */}
                                <div style={{
                                    width: '48px',
                                    textAlign: 'center',
                                    flexShrink: 0,
                                    fontFamily: '"Orbitron", monospace',
                                    fontSize: pos <= 3 ? '16px' : '12px',
                                    fontWeight: '700',
                                    color: pos === 1 ? '#d97706' : pos === 2 ? '#6b7280' : pos === 3 ? '#92400e' : 'var(--txt-muted)',
                                }}>
                                    {posLabel}
                                </div>

                                {/* Avatar */}
                                <div style={{
                                    width: '32px', height: '32px', borderRadius: '50%',
                                    background: isYou ? 'var(--brand)' : avatarColor,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '11px', fontWeight: '700', color: '#fff',
                                    flexShrink: 0, marginRight: '10px',
                                }}>
                                    {getInitials(isYou ? 'You' : racer.name)}
                                </div>

                                {/* Name + Roll */}
                                <div style={{ width: '120px', flexShrink: 0, overflow: 'hidden', marginRight: '12px' }}>
                                    <div style={{ fontSize: '13px', fontWeight: '600', color: isYou ? 'var(--brand)' : 'var(--txt)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {isYou ? '⚡ You' : racer.name?.split(' ')[0]}
                                    </div>
                                    <div style={{ fontSize: '10px', color: 'var(--txt-faint)', fontFamily: 'monospace' }}>
                                        {racer.rollNumber}
                                    </div>
                                </div>

                                {/* Track */}
                                <div style={{ flex: 1, position: 'relative', height: '100%', display: 'flex', alignItems: 'center', paddingRight: '32px' }}>
                                    {/* Grid lines */}
                                    <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
                                        {Array.from({ length: TOTAL_STEPS + 1 }).map((_, gi) => (
                                            <div key={gi} style={{ flex: 1, borderLeft: gi === 0 ? 'none' : '0.5px solid var(--border)', height: '100%' }} />
                                        ))}
                                    </div>

                                    {/* Progress bar */}
                                    <div style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', height: '8px', width: '100%', background: 'var(--surface-3)', borderRadius: '4px', overflow: 'hidden', paddingRight: '32px' }}>
                                        <div style={{
                                            height: '100%',
                                            borderRadius: '4px',
                                            background: isYou ? 'var(--brand)' : avatarColor,
                                            opacity: 0.4,
                                            width: animated ? `${pct}%` : '0%',
                                            transition: 'width 1.5s cubic-bezier(0.22, 1, 0.36, 1)',
                                        }} />
                                    </div>

                                    {/* Car */}
                                    <div style={{
                                        position: 'absolute',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        left: animated ? `calc(${pct}% - 12px)` : '0%',
                                        fontSize: '20px',
                                        transition: 'left 1.5s cubic-bezier(0.22, 1, 0.36, 1)',
                                        zIndex: 2,
                                        filter: isYou ? 'drop-shadow(0 0 6px rgba(124,92,252,0.6))' : 'none',
                                    }}>
                                        {racer.isCompleted ? '🏆' : '🏎️'}
                                    </div>

                                    {/* Speed badge */}
                                    <div style={{
                                        position: 'absolute',
                                        right: 36,
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        fontSize: '9px',
                                        fontWeight: '700',
                                        padding: '2px 7px',
                                        borderRadius: '10px',
                                        letterSpacing: '0.04em',
                                        background: spd.bg,
                                        color: spd.color,
                                        whiteSpace: 'nowrap',
                                    }}>
                                        {spd.label}
                                    </div>

                                    {/* Finish flag */}
                                    <div style={{ position: 'absolute', right: 0, top: 0, height: '100%', width: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
                                        🏁
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            {/* ── CSS animation ── */}
            <style>{`
        @keyframes racePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.7); }
        }
      `}</style>
        </div>
    );
}