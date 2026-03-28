import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, ChevronDown, Minus, Calendar, Plus } from 'lucide-react';
import axios from 'axios';

const TOTAL_STEPS = 8;
const MAX_SCORE = 800;

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
    textFaint: '#9ca3af',
    bg: '#f9fafb',
    card: '#ffffff',
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
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
        // Single name - use first two characters
        return name.substring(0, 2).toUpperCase();
    }
    // Multiple names - use first letter of first and last name
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/* ─ Skeleton Row ─ */
function SkeletonRow() {
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 16,
            padding: '16px 20px',
            background: COLORS.card,
            borderBottom: `1px solid ${COLORS.border}`,
        }}>
            <div style={{ width: 40, height: 20, borderRadius: 4, background: '#e5e7eb' }} />
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#e5e7eb' }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ width: '30%', height: 12, borderRadius: 4, background: '#e5e7eb' }} />
                <div style={{ width: '20%', height: 10, borderRadius: 4, background: '#e5e7eb' }} />
            </div>
            {[120, 100, 100, 100].map((w, i) => (
                <div key={i} style={{ width: w, height: 20, borderRadius: 4, background: '#e5e7eb' }} />
            ))}
        </div>
    );
}

export default function RaceLeaderboard({ user }) {
    const [racers, setRacers] = useState([]);
    const [loading, setLoading] = useState(true);
    const intervalRef = useRef(null);

    const fetchLeaderboard = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/leaderboard`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setRacers((res.data || []).map(normalise));
            setLoading(false);
        } catch {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeaderboard();
        intervalRef.current = setInterval(fetchLeaderboard, 15000);
        return () => clearInterval(intervalRef.current);
    }, []);

    if (loading) return (
        <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            background: COLORS.card,
            borderRadius: 16,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            overflow: 'hidden',
        }}>
            {[...Array(8)].map((_, i) => <SkeletonRow key={i} />)}
        </div>
    );

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            height: '100%',
            width: '100%',
            background: COLORS.bg,
            fontFamily: 'inherit',
            padding: '24px',
            overflow: 'auto',
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 24,
            }}>
                <h1 style={{
                    fontSize: 24,
                    fontWeight: 700,
                    color: COLORS.text,
                    margin: 0,
                }}>
                    Leaderboard
                </h1>
                
                <div style={{
                    display: 'flex',
                    gap: 12,
                    alignItems: 'center',
                }}>
                    {/* Team Filter */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 16px',
                        background: COLORS.card,
                        borderRadius: 8,
                        border: `1px solid ${COLORS.border}`,
                        cursor: 'pointer',
                    }}>
                        <div style={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            background: COLORS.brand,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontSize: 12,
                            fontWeight: 700,
                        }}>
                            A
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 500, color: COLORS.text }}>All Teams</span>
                        <ChevronDown size={16} color={COLORS.textMuted} />
                    </div>

                    {/* Date Range */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '8px 16px',
                        background: COLORS.card,
                        borderRadius: 8,
                        border: `1px solid ${COLORS.border}`,
                    }}>
                        <button style={{ 
                            background: 'none', 
                            border: 'none', 
                            cursor: 'pointer',
                            padding: 4,
                        }}>
                            <ChevronUp size={16} color={COLORS.textMuted} />
                        </button>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            fontSize: 14,
                            fontWeight: 500,
                            color: COLORS.text,
                        }}>
                            <Calendar size={16} color={COLORS.textMuted} />
                            Dec 27, 2022 - Jan 03, 2023
                        </div>
                        <button style={{ 
                            background: 'none', 
                            border: 'none', 
                            cursor: 'pointer',
                            padding: 4,
                        }}>
                            <ChevronDown size={16} color={COLORS.textMuted} />
                        </button>
                    </div>

                    {/* Avatars */}
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        {racers.slice(0, 3).map((racer, idx) => (
                            <div
                                key={racer.rollNumber}
                                style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: '50%',
                                    background: AVATAR_PALETTE[idx % AVATAR_PALETTE.length],
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#fff',
                                    fontSize: 11,
                                    fontWeight: 700,
                                    marginLeft: idx > 0 ? -8 : 0,
                                    border: `2px solid ${COLORS.card}`,
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                }}
                            >
                                {getInitials(racer.name)}
                            </div>
                        ))}
                        {racers.length > 3 && (
                            <div style={{
                                width: 32,
                                height: 32,
                                borderRadius: '50%',
                                background: COLORS.bg,
                                border: `1px solid ${COLORS.border}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 11,
                                fontWeight: 600,
                                color: COLORS.textMuted,
                                marginLeft: -8,
                            }}>
                                +{racers.length - 3}
                            </div>
                        )}
                    </div>

                    {/* Add Members Button */}
                    <button style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 16px',
                        background: COLORS.brandLight,
                        border: `1px solid ${COLORS.brand}`,
                        borderRadius: 8,
                        cursor: 'pointer',
                        color: COLORS.brand,
                        fontSize: 14,
                        fontWeight: 600,
                        transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                        e.target.style.background = COLORS.brand;
                        e.target.style.color = '#fff';
                    }}
                    onMouseLeave={(e) => {
                        e.target.style.background = COLORS.brandLight;
                        e.target.style.color = COLORS.brand;
                    }}
                    >
                        <Plus size={16} />
                        Add members
                    </button>
                </div>
            </div>

            {/* Table Container */}
            <div style={{
                background: COLORS.card,
                borderRadius: 12,
                border: `1px solid ${COLORS.border}`,
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}>
                {/* Table Header */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '14px 20px',
                    background: COLORS.bg,
                    borderBottom: `1px solid ${COLORS.border}`,
                    fontSize: 13,
                    fontWeight: 600,
                    color: COLORS.textMuted,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                }}>
                    <div style={{ width: 80, display: 'flex', alignItems: 'center', gap: 4 }}>
                        Positions
                    </div>
                    <div style={{ width: 200, display: 'flex', alignItems: 'center', gap: 4 }}>
                        Name
                    </div>
                    <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', paddingRight: 24 }}>
                        <div style={{ width: 100, textAlign: 'right' }}>Score</div>
                    </div>
                    <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', paddingRight: 24 }}>
                        <div style={{ width: 100, textAlign: 'right' }}>Points</div>
                    </div>
                    <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', paddingRight: 24 }}>
                        <div style={{ width: 100, textAlign: 'right' }}>Steps</div>
                    </div>
                    <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', paddingRight: 24 }}>
                        <div style={{ width: 100, textAlign: 'right' }}>Flags</div>
                    </div>
                    <div style={{ width: 40 }} />
                </div>

                {/* Table Body */}
                <AnimatePresence>
                    {racers.map((racer, idx) => {
                        const avatarColor = AVATAR_PALETTE[idx % AVATAR_PALETTE.length];
                        const prevRank = racer.prevRank || idx + 1;
                        const rankChange = prevRank - (idx + 1);
                        
                        return (
                            <motion.div
                                key={racer.rollNumber}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: idx * 0.03 }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '16px 20px',
                                    borderBottom: `1px solid ${COLORS.border}`,
                                    background: racer.rollNumber === user?.rollNumber ? COLORS.brandLight : 'transparent',
                                    transition: 'background 0.2s',
                                    cursor: 'pointer',
                                }}
                                whileHover={{ background: COLORS.bg }}
                            >
                                {/* Position */}
                                <div style={{ width: 80, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{
                                        fontSize: 14,
                                        fontWeight: 700,
                                        color: COLORS.text,
                                        width: 24,
                                    }}>
                                        #{idx + 1}
                                    </span>
                                    {rankChange > 0 ? (
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            color: COLORS.green,
                                            background: `${COLORS.green}15`,
                                            padding: '2px 6px',
                                            borderRadius: 4,
                                            fontSize: 11,
                                            fontWeight: 700,
                                        }}>
                                            <ChevronUp size={12} />
                                            {rankChange}
                                        </div>
                                    ) : rankChange < 0 ? (
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            color: COLORS.red,
                                            background: `${COLORS.red}15`,
                                            padding: '2px 6px',
                                            borderRadius: 4,
                                            fontSize: 11,
                                            fontWeight: 700,
                                        }}>
                                            <ChevronDown size={12} />
                                            {Math.abs(rankChange)}
                                        </div>
                                    ) : (
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            color: COLORS.textMuted,
                                            background: `${COLORS.textMuted}15`,
                                            padding: '2px 6px',
                                            borderRadius: 4,
                                            fontSize: 11,
                                            fontWeight: 700,
                                        }}>
                                            <Minus size={12} />
                                        </div>
                                    )}
                                </div>

                                {/* Name & Avatar */}
                                <div style={{ width: 200, display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: '50%',
                                        background: avatarColor,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#fff',
                                        fontSize: 13,
                                        fontWeight: 700,
                                        boxShadow: `0 2px 8px ${avatarColor}44`,
                                    }}>
                                        {getInitials(racer.name)}
                                    </div>
                                    <div>
                                        <div style={{
                                            fontSize: 14,
                                            fontWeight: 700,
                                            color: racer.rollNumber === user?.rollNumber ? COLORS.brand : COLORS.text,
                                        }}>
                                            {racer.name}
                                        </div>
                                        <div style={{
                                            fontSize: 12,
                                            color: COLORS.textMuted,
                                            marginTop: 2,
                                        }}>
                                            Roll: {racer.rollNumber}
                                        </div>
                                    </div>
                                </div>

                                {/* Stats */}
                                <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', paddingRight: 24 }}>
                                    <div style={{
                                        width: 100,
                                        textAlign: 'right',
                                        fontSize: 14,
                                        fontWeight: 700,
                                        color: racer.rollNumber === user?.rollNumber ? COLORS.brand : COLORS.text,
                                    }}>
                                        {racer.scorePercent}%
                                    </div>
                                </div>
                                <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', paddingRight: 24 }}>
                                    <div style={{
                                        width: 100,
                                        textAlign: 'right',
                                        fontSize: 14,
                                        fontWeight: 700,
                                        color: COLORS.text,
                                    }}>
                                        {racer.netScore}
                                    </div>
                                </div>
                                <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', paddingRight: 24 }}>
                                    <div style={{
                                        width: 100,
                                        textAlign: 'right',
                                        fontSize: 14,
                                        fontWeight: 600,
                                        color: COLORS.green,
                                    }}>
                                        {racer.stepsCompleted}/{TOTAL_STEPS}
                                    </div>
                                </div>
                                <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', paddingRight: 24 }}>
                                    <div style={{
                                        width: 100,
                                        textAlign: 'right',
                                        fontSize: 14,
                                        fontWeight: 600,
                                        color: racer.rejectionCount > 0 ? COLORS.red : COLORS.textMuted,
                                    }}>
                                        {racer.rejectionCount}
                                    </div>
                                </div>

                                {/* Menu Dots */}
                                <div style={{
                                    width: 40,
                                    display: 'flex',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    opacity: 0,
                                    transition: 'opacity 0.2s',
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                                onMouseLeave={(e) => e.currentTarget.style.opacity = 0}
                                >
                                    <div style={{
                                        display: 'flex',
                                        gap: 4,
                                        padding: '4px 8px',
                                        borderRadius: 4,
                                        background: COLORS.bg,
                                    }}>
                                        <div style={{ width: 4, height: 4, borderRadius: '50%', background: COLORS.textMuted }} />
                                        <div style={{ width: 4, height: 4, borderRadius: '50%', background: COLORS.textMuted }} />
                                        <div style={{ width: 4, height: 4, borderRadius: '50%', background: COLORS.textMuted }} />
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            {/* Footer Info */}
            <div style={{
                marginTop: 16,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: 13,
                color: COLORS.textMuted,
            }}>
                <div>
                    Showing {racers.length} racer{racers.length !== 1 ? 's' : ''}
                </div>
                <div style={{
                    display: 'flex',
                    gap: 16,
                    alignItems: 'center',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 12, height: 12, borderRadius: '50%', background: COLORS.green }} />
                        <span>Improving</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 12, height: 12, borderRadius: '50%', background: COLORS.red }} />
                        <span>Declining</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
