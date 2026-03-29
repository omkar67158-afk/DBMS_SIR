import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Trophy, AlertTriangle, Info } from 'lucide-react';

const COLORS = {
    brand: '#2563eb',
    brandLight: '#eff6ff',
    green: '#059669',
    amber: '#d97706',
    red: '#dc2626',
    indigo: '#6366f1',
    border: '#e5e7eb',
    text: '#111827',
    textMuted: '#6b7280',
    bg: '#f9fafb',
    card: '#ffffff',
};

const AVATAR_PALETTE = [
    '#7c3aed', '#059669', '#2563eb', '#d97706', '#db2777',
    '#0891b2', '#16a34a', '#9333ea', '#ea580c', '#0f766e',
    '#1d4ed8', '#b45309', '#be185d', '#6d28d9', '#0284c7',
];

function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

export default function RaceChart({ racers, onClose }) {
    // Sort racers basically by score to handle z-index logic if we wanted, but not strictly needed.
    const sortedRacers = [...racers].sort((a, b) => b.netScore - a.netScore);
    const TOTAL_STEPS = 8;
    const MAX_SCORE = 800;

    return (
        <div style={{
            width: '100%', height: '100%',
            background: COLORS.bg, // Sleek Light Theme
            display: 'flex', flexDirection: 'column',
            fontFamily: 'inherit', overflow: 'hidden',
        }}>
            {/* Header / Navbar */}
            <div style={{
                display: 'flex', alignItems: 'center', padding: '20px 32px',
                background: COLORS.card, borderBottom: `1px solid ${COLORS.border}`,
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', zIndex: 10, gap: 24,
            }}>
                <button style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    padding: '8px 16px', borderRadius: '8px', background: COLORS.bg,
                    border: `1px solid ${COLORS.border}`, cursor: 'pointer',
                    color: COLORS.text, fontWeight: 600, fontSize: 14, transition: 'all 0.2s',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
                    onClick={onClose}
                    onMouseEnter={e => { e.currentTarget.style.background = '#f3f4f6'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = COLORS.bg; }}
                >
                    <ChevronLeft size={18} />
                    Back to Leaderboard
                </button>

                <div style={{ width: 1, height: 32, background: COLORS.border }} />

                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{
                        width: 44, height: 44, borderRadius: '12px', background: COLORS.brandLight,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.brand,
                    }}>
                        <Trophy size={22} />
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: COLORS.text, letterSpacing: '-0.02em' }}>Live Motion Graph</h1>
                        <p style={{ margin: 0, fontSize: 13, color: COLORS.textMuted, marginTop: 2, fontWeight: 500 }}>
                            Watch the race unfold. Students diverge based on steps completed and active penalties.
                        </p>
                    </div>
                </div>
            </div>

            {/* Chart Area */}
            <div style={{
                flex: 1, padding: '40px 60px 80px 80px', position: 'relative',
                display: 'flex', flexDirection: 'column',
            }}>
                <div style={{
                    flex: 1, position: 'relative', borderLeft: `2px solid ${COLORS.border}`,
                    borderBottom: `2px solid ${COLORS.border}`,
                }}>

                    {/* background ambient glow */}
                    <div style={{
                        position: 'absolute', bottom: 0, left: 0, width: '400px', height: '400px',
                        background: `radial-gradient(circle at bottom left, ${COLORS.brandLight} 0%, transparent 60%)`,
                        pointerEvents: 'none', zIndex: 0
                    }} />

                    {/* Y-Axis Grid Lines (Score) */}
                    {[0, 200, 400, 600, 800].map(score => {
                        const bottomPct = (score / MAX_SCORE) * 100;
                        return (
                            <div key={`y-${score}`} style={{
                                position: 'absolute', left: 0, right: 0, bottom: `${bottomPct}%`,
                                height: 1, background: score === 0 ? 'transparent' : 'rgba(229, 231, 235, 0.6)', zIndex: 1, pointerEvents: 'none'
                            }}>
                                <span style={{
                                    position: 'absolute', left: -50, top: -10, color: COLORS.textMuted,
                                    fontSize: 12, fontWeight: 600, textAlign: 'right', width: 40
                                }}>
                                    {score}
                                </span>
                            </div>
                        );
                    })}
                    <div style={{ position: 'absolute', left: -90, top: '50%', transform: 'translateY(-50%) rotate(-90deg)', color: COLORS.textMuted, fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', width: 80, textAlign: 'center' }}>
                        Net Score
                    </div>

                    {/* X-Axis Grid Lines (Steps) */}
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(step => {
                        const leftPct = (step / TOTAL_STEPS) * 100;
                        return (
                            <div key={`x-${step}`} style={{
                                position: 'absolute', top: 0, bottom: 0, left: `${leftPct}%`,
                                width: 1, background: 'rgba(229, 231, 235, 0.6)', zIndex: 1, pointerEvents: 'none'
                            }}>
                                <span style={{
                                    position: 'absolute', bottom: -30, left: -10, color: COLORS.textMuted,
                                    fontSize: 12, fontWeight: 600, width: 20, textAlign: 'center'
                                }}>
                                    S{step}
                                </span>
                            </div>
                        );
                    })}
                    <div style={{ position: 'absolute', bottom: -55, left: '50%', transform: 'translateX(-50%)', color: COLORS.textMuted, fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                        Steps Completed
                    </div>

                    {/* Ideal Path Line (Dash) */}
                    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}>
                        <line x1="0" y1="100%" x2="100%" y2="0" stroke="rgba(37, 99, 235, 0.15)" strokeWidth="2" strokeDasharray="8 8" />
                    </svg>

                    {/* Plot Nodes */}
                    <AnimatePresence>
                        {sortedRacers.map((racer, idx) => {
                            const avatarColor = AVATAR_PALETTE[idx % AVATAR_PALETTE.length];

                            // Prevent overlapping exactly by applying a tiny deterministic offset
                            const offsetX = Math.sin(idx * 21.5) * 14;
                            const offsetY = Math.cos(idx * 21.5) * 14;

                            // X = steps completed percentage
                            const rawX = (racer.stepsCompleted / TOTAL_STEPS) * 100;
                            // Y = net score percentage
                            const rawY = Math.max(-5, (racer.netScore / MAX_SCORE) * 100); // allow slightly going below 0 visually

                            // Spawn animation starts from 0,0
                            const isPenalized = racer.rejectionCount > 0;

                            return (
                                <motion.div
                                    key={racer.rollNumber || racer.name}
                                    initial={{ left: '0%', bottom: '0%', x: 0, y: 0, opacity: 0, scale: 0 }}
                                    animate={{
                                        left: `${rawX}%`,
                                        bottom: `${rawY}%`,
                                        x: `calc(-50% + ${offsetX}px)`,
                                        y: `calc(50% + ${offsetY}px)`,
                                        opacity: 1, scale: 1
                                    }}
                                    transition={{
                                        type: "spring", stiffness: 60, damping: 14,
                                        delay: idx * 0.05,
                                    }}
                                    style={{
                                        position: 'absolute',
                                        zIndex: 10 + racer.netScore, // higher score = rendered on top
                                        cursor: 'pointer',
                                    }}
                                >
                                    <div className="racer-node-group" style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

                                        {/* Avatar Node */}
                                        <div style={{
                                            width: 36, height: 36, borderRadius: '50%', background: avatarColor,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: '#fff', fontSize: 13, fontWeight: 700,
                                            boxShadow: isPenalized ? `0 0 0 3px rgba(220, 38, 38, 0.15)` : `0 4px 10px rgba(0,0,0,0.1), inset 0 2px 4px rgba(255,255,255,0.3)`,
                                            border: isPenalized ? `2px solid ${COLORS.red}` : `2px solid #fff`,
                                            overflow: 'hidden', position: 'relative', zIndex: 2
                                        }}>
                                            {racer.picture ? (
                                                <img src={racer.picture} alt={racer.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
                                            ) : (
                                                getInitials(racer.name)
                                            )}
                                        </div>

                                        {/* Name Label */}
                                        <div style={{
                                            position: 'absolute', top: 'calc(100% + 6px)',
                                            background: COLORS.card, border: `1px solid ${isPenalized ? COLORS.red : COLORS.border}`,
                                            borderRadius: 6, padding: '4px 8px', display: 'flex', flexDirection: 'column',
                                            alignItems: 'center', whiteSpace: 'nowrap',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.08)', zIndex: 3, pointerEvents: 'none'
                                        }}>
                                            <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.text }}>
                                                {racer.name.split(' ')[0]}
                                            </div>
                                            <div style={{ fontSize: 10, color: COLORS.textMuted, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <span style={{ color: isPenalized ? COLORS.red : COLORS.brand, fontWeight: 700 }}>{racer.netScore} pts</span>
                                                {isPenalized && (
                                                    <span style={{ display: 'flex', alignItems: 'center', color: COLORS.red, fontWeight: 600 }}>
                                                        <AlertTriangle size={10} style={{ marginLeft: 2, marginRight: 2 }} /> {racer.rejectionCount}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>

                {/* Info Legend */}
                <div style={{ position: 'absolute', top: 40, right: 60, display: 'flex', flexDirection: 'column', gap: 8, background: 'rgba(255, 255, 255, 0.8)', padding: '16px', borderRadius: 12, border: `1px solid ${COLORS.border}`, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', backdropFilter: 'blur(4px)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: COLORS.text, fontWeight: 600 }}>
                        <div style={{ width: 12, height: 12, borderRadius: '50%', background: COLORS.brand, border: '2px solid #fff', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }} /> Perfect Trajectory
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: COLORS.text, fontWeight: 600 }}>
                        <div style={{ width: 12, height: 12, borderRadius: '50%', background: COLORS.border, border: `2px solid ${COLORS.red}`, boxShadow: '0 1px 3px rgba(220,38,38,0.2)' }} /> Penalties Deducted
                    </div>
                </div>

            </div>
        </div>
    );
}
