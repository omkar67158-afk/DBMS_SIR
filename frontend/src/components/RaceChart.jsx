import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Trophy, AlertTriangle } from 'lucide-react';

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
    // Sort racers basically by score
    const sortedRacers = [...racers].sort((a, b) => b.netScore - a.netScore);
    const maxScore = 800; // max possible score

    return (
        <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: COLORS.bg,
            zIndex: 50,
            display: 'flex',
            flexDirection: 'column',
            fontFamily: 'inherit',
            overflow: 'hidden',
        }}>
            {/* Header / Navbar */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                padding: '24px 32px',
                background: COLORS.card,
                borderBottom: `1px solid ${COLORS.border}`,
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                zIndex: 10,
                gap: 24,
            }}>
                <button style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '8px 16px',
                    borderRadius: '8px',
                    background: COLORS.bg,
                    border: `1px solid ${COLORS.border}`,
                    cursor: 'pointer',
                    color: COLORS.text,
                    fontWeight: 600,
                    fontSize: 14,
                    transition: 'all 0.2s',
                }}
                onClick={onClose}
                onMouseEnter={e => { e.currentTarget.style.background = '#f3f4f6'; }}
                onMouseLeave={e => { e.currentTarget.style.background = COLORS.bg; }}
                >
                    <ChevronLeft size={18} />
                    Back
                </button>

                <div style={{ width: 1, height: 32, background: COLORS.border }} />

                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{
                        width: 48,
                        height: 48,
                        borderRadius: '12px',
                        background: COLORS.brandLight,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: COLORS.brand,
                    }}>
                        <Trophy size={24} />
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: COLORS.text }}>Class Race Graph</h1>
                        <p style={{ margin: 0, fontSize: 14, color: COLORS.textMuted, marginTop: 4 }}>
                            Tracking progress for {racers.length} active students
                        </p>
                    </div>
                </div>
            </div>

            {/* Chart Area */}
            <div style={{
                flex: 1,
                padding: '32px',
                overflowY: 'auto',
                overflowX: 'hidden',
            }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative' }}>
                    
                    {/* Background Grid Lines */}
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        left: '250px', // offset for names
                        right: '100px', // offset for scores
                        display: 'flex',
                        justifyContent: 'space-between',
                        pointerEvents: 'none',
                        zIndex: 0,
                    }}>
                        {[0, 20, 40, 60, 80, 100].map(percent => (
                            <div key={percent} style={{
                                width: 1,
                                height: '100%',
                                background: COLORS.border,
                                position: 'relative',
                            }}>
                                <div style={{
                                    position: 'absolute',
                                    top: -20,
                                    left: -15,
                                    fontSize: 12,
                                    color: COLORS.textFaint,
                                    fontWeight: 600,
                                }}>
                                    {percent}%
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Bars Container */}
                    <div style={{ position: 'relative', zIndex: 1, marginTop: 20 }}>
                        <AnimatePresence>
                            {sortedRacers.map((racer, idx) => {
                                const avatarColor = AVATAR_PALETTE[idx % AVATAR_PALETTE.length];
                                const progressPercent = Math.max(2, racer.scorePercent); // At least 2% to show the bar

                                return (
                                    <motion.div
                                        key={racer.rollNumber || racer.name}
                                        layout
                                        initial={{ opacity: 0, x: -50 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        transition={{ 
                                            type: "spring", 
                                            stiffness: 300, 
                                            damping: 30,
                                            delay: idx * 0.05 
                                        }}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            marginBottom: 24,
                                            height: 48,
                                        }}
                                    >
                                        {/* Name & Avatar Area */}
                                        <div style={{
                                            width: 250,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 12,
                                            paddingRight: 16,
                                        }}>
                                            <div style={{
                                                width: 38,
                                                height: 38,
                                                minWidth: 38,
                                                borderRadius: '50%',
                                                background: avatarColor,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: '#fff',
                                                fontSize: 13,
                                                fontWeight: 700,
                                                boxShadow: `0 2px 8px ${avatarColor}44`,
                                                overflow: 'hidden',
                                                zIndex: 2,
                                            }}>
                                                {racer.picture ? (
                                                    <img src={racer.picture} alt={racer.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
                                                ) : (
                                                    getInitials(racer.name)
                                                )}
                                            </div>
                                            <div style={{ overflow: 'hidden' }}>
                                                <div style={{
                                                    fontSize: 14,
                                                    fontWeight: 600,
                                                    color: COLORS.text,
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                }}>
                                                    {racer.name}
                                                </div>
                                                <div style={{
                                                    fontSize: 11,
                                                    color: COLORS.textMuted,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 6,
                                                }}>
                                                    #{idx + 1} • {racer.rollNumber}
                                                    {racer.rejectionCount > 0 && (
                                                        <span style={{ color: COLORS.amber, display: 'flex', alignItems: 'center' }}>
                                                            <AlertTriangle size={10} style={{ marginRight: 2 }} />
                                                            {racer.rejectionCount}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Bar Track Area */}
                                        <div style={{
                                            flex: 1,
                                            position: 'relative',
                                            height: 24,
                                            background: `${COLORS.border}40`, // light track
                                            borderRadius: 12,
                                            display: 'flex',
                                            alignItems: 'center',
                                            marginRight: 16,
                                        }}>
                                            {/* Animated Bar */}
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${progressPercent}%` }}
                                                transition={{ 
                                                    duration: 1.5,
                                                    ease: "easeOut",
                                                    delay: 0.2 + (idx * 0.05)
                                                }}
                                                style={{
                                                    height: '100%',
                                                    background: `linear-gradient(90deg, ${avatarColor}dd, ${avatarColor})`,
                                                    borderRadius: 12,
                                                    boxShadow: `0 2px 10px ${avatarColor}40`,
                                                    position: 'relative',
                                                    minWidth: '24px',
                                                }}
                                            >
                                                {/* Shine Effect inside bar */}
                                                <div style={{
                                                    position: 'absolute',
                                                    top: 0, left: 0, right: 0, height: '50%',
                                                    background: 'linear-gradient(180deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 100%)',
                                                    borderRadius: '12px 12px 0 0',
                                                }} />
                                            </motion.div>
                                        </div>

                                        {/* Score Display Area */}
                                        <div style={{
                                            width: 80,
                                            textAlign: 'right',
                                        }}>
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ delay: 1 + (idx * 0.05) }}
                                                style={{
                                                    fontSize: 16,
                                                    fontWeight: 800,
                                                    color: avatarColor,
                                                }}
                                            >
                                                {racer.netScore}
                                            </motion.div>
                                            <div style={{ fontSize: 11, color: COLORS.textMuted, fontWeight: 500 }}>
                                                {racer.scorePercent}%
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                        
                        {sortedRacers.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '60px 0', color: COLORS.textMuted }}>
                                No students found for the selected filters.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
