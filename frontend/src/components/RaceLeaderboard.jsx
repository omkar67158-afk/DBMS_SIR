import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, ChevronDown, Minus, Calendar, Plus } from 'lucide-react';
import axios from 'axios';
import RaceChart from './RaceChart';

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
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
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

// ─ Podium Component ─
function PodiumStep({ racer, rank, height, color, isFirst }) {
    if (!racer) return <div style={{ width: 140, height }} />;
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', width: 140 }}>
            {/* Avatar & Name */}
            <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 + (rank * 0.1) }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 16 }}
            >
                <div style={{
                    width: isFirst ? 64 : 52,
                    height: isFirst ? 64 : 52,
                    borderRadius: '50%',
                    background: AVATAR_PALETTE[(rank - 1) % AVATAR_PALETTE.length],
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: isFirst ? 20 : 16,
                    fontWeight: 700,
                    boxShadow: isFirst ? '0 10px 25px -5px rgba(217, 119, 6, 0.4)' : '0 4px 6px -1px rgba(0,0,0,0.1)',
                    border: `4px solid ${COLORS.card}`,
                    overflow: 'hidden',
                    zIndex: 2,
                }}>
                    {racer.picture ? (
                        <img src={racer.picture} alt={racer.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
                    ) : (
                        getInitials(racer.name)
                    )}
                </div>
                <div style={{ 
                    fontWeight: 800, 
                    fontSize: isFirst ? 16 : 14, 
                    color: COLORS.text, 
                    marginTop: 8,
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    overflow: 'hidden',
                    maxWidth: 130
                }}>
                    {racer.name.split(' ')[0]} {/* Show First Name */}
                </div>
            </motion.div>
            
            {/* 3D Box */}
            <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: height, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 100, damping: 20, delay: rank * 0.1 }}
                style={{ 
                width: '100%', 
                background: color,
                border: `1px solid ${COLORS.border}`,
                borderBottom: 'none',
                borderTopRightRadius: 12,
                borderTopLeftRadius: 12,
                boxShadow: isFirst 
                    ? '0 -10px 20px -5px rgba(0,0,0,0.05), inset 0 2px 10px rgba(255,255,255,1)' 
                    : '0 -4px 6px -1px rgba(0,0,0,0.02), inset 0 2px 4px rgba(255,255,255,0.8)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                paddingTop: 20,
                position: 'relative',
                overflow: 'hidden',
            }}>
                <div style={{ 
                    fontSize: isFirst ? 40 : 28, 
                    fontWeight: 900, 
                    color: isFirst ? COLORS.amber : COLORS.textFaint,
                    textShadow: isFirst ? '0 2px 4px rgba(217, 119, 6, 0.2)' : 'none',
                }}>{rank}</div>
                <div style={{ 
                    fontSize: 13, 
                    color: COLORS.textMuted, 
                    fontWeight: 600,
                    marginTop: 4 
                }}>{racer.netScore} pts</div>

                {isFirst && (
                    <div style={{
                        position: 'absolute',
                        top: 0, left: 0, right: 0, height: '40%',
                        background: 'linear-gradient(180deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 100%)',
                        pointerEvents: 'none',
                    }} />
                )}
            </motion.div>
        </div>
    );
}

export default function RaceLeaderboard({ user }) {
    const [racers, setRacers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [showChartRace, setShowChartRace] = useState(false);
    const intervalRef = useRef(null);

    const fetchLeaderboard = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/leaderboard`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = (res.data || []).map((r, idx) => ({ ...normalise(r), originalRank: idx + 1 }));
            setRacers(data);
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

    // Filter racers
    const filteredRacers = racers.filter(r => {
        const matchesSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              (r.rollNumber && r.rollNumber.toLowerCase().includes(searchTerm.toLowerCase()));
        
        let matchesDate = true;
        const racerDate = r.completedAt ? new Date(r.completedAt) : (r.createdAt ? new Date(r.createdAt) : new Date());
        
        if (startDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            if (racerDate < start) matchesDate = false;
        }
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            if (racerDate > end) matchesDate = false;
        }
        return matchesSearch && matchesDate;
    });

    if (showChartRace) {
        return <RaceChart racers={filteredRacers} onClose={() => setShowChartRace(false)} />;
    }

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
                alignItems: 'flex-start',
                marginBottom: 24,
            }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <h1 style={{
                        fontSize: 28,
                        fontWeight: 800,
                        color: COLORS.text,
                        margin: 0,
                        letterSpacing: '-0.02em',
                    }}>
                        Leaderboard
                    </h1>
                </div>
                
                <div style={{
                    display: 'flex',
                    gap: 12,
                    alignItems: 'center',
                }}>
                    {/* Search Input */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 16px',
                        background: COLORS.card,
                        borderRadius: 8,
                        border: `1px solid ${COLORS.border}`,
                    }}>
                        <input 
                            type="text" 
                            placeholder="Search students..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            style={{
                                border: 'none',
                                outline: 'none',
                                background: 'transparent',
                                fontSize: 14,
                                color: COLORS.text,
                                width: '180px',
                            }}
                        />
                    </div>

                    {/* Avatars */}
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        {filteredRacers.slice(0, 3).map((racer, idx) => (
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
                                    overflow: 'hidden',
                                }}
                            >
                                {racer.picture ? (
                                    <img src={racer.picture} alt={racer.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
                                ) : (
                                    getInitials(racer.name)
                                )}
                            </div>
                        ))}
                        {filteredRacers.length > 3 && (
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
                                +{filteredRacers.length - 3}
                            </div>
                        )}
                    </div>

                    {/* Show Chart Race Button (Rightmost) */}
                    <button style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        padding: '8px 16px',
                        background: COLORS.card,
                        border: `1px solid ${COLORS.border}`,
                        borderRadius: 6,
                        cursor: 'pointer',
                        color: COLORS.text,
                        fontSize: 13,
                        fontWeight: 600,
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                        transition: 'all 0.2s',
                    }}
                    onClick={() => setShowChartRace(true)}
                    onMouseEnter={(e) => { e.target.style.background = '#f3f4f6'; }}
                    onMouseLeave={(e) => { e.target.style.background = COLORS.card; }}
                    >
                        <Plus size={14} />
                        Graph
                    </button>
                </div>
            </div>

            {/* Top 3 Podium (Google-style Minimalist White) */}
            {searchTerm === '' && startDate === '' && endDate === '' && racers.length >= 3 && (
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'flex-end',
                    gap: 24,
                    margin: '20px 0 40px 0',
                }}>
                    {/* Rank 2 */}
                    <PodiumStep racer={racers[1]} rank={2} height={140} color={COLORS.bg} />
                    {/* Rank 1 */}
                    <PodiumStep racer={racers[0]} rank={1} height={180} color={COLORS.card} isFirst />
                    {/* Rank 3 */}
                    <PodiumStep racer={racers[2]} rank={3} height={110} color={COLORS.bg} />
                </div>
            )}

            {/* Table Container */}
            <div style={{
                background: COLORS.card,
                borderRadius: 12,
                border: `1px solid ${COLORS.border}`,
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                position: 'relative',
            }}>
                {/* Table Header */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '14px 20px',
                    background: COLORS.bg,
                    borderBottom: `1px solid ${COLORS.border}`,
                    borderTopLeftRadius: 12,
                    borderTopRightRadius: 12,
                    fontSize: 13,
                    fontWeight: 600,
                    color: COLORS.textMuted,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    position: 'sticky',
                    top: -24, // Matches the 24px padding of the outer container
                    zIndex: 20,
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', // Added a small shadow when sticky
                }}>
                    <div style={{ width: 80 }}>Position</div>
                    <div style={{ width: 220 }}>Name</div>
                    <div style={{ flex: 1, textAlign: 'center' }}>Score</div>
                    <div style={{ flex: 1, textAlign: 'center' }}>Points</div>
                    <div style={{ flex: 1, textAlign: 'center' }}>Steps</div>
                    <div style={{ flex: 1, textAlign: 'center' }}>Flags</div>
                    <div style={{ width: 40 }} />
                </div>

                {/* Table Body */}
                <AnimatePresence>
                    {filteredRacers.map((racer, idx) => {
                        const avatarColor = AVATAR_PALETTE[idx % AVATAR_PALETTE.length];
                        const rankChange = 0; // Keeping 0 for now as prevRank is omitted in current backend
                        const displayRank = racer.originalRank || idx + 1;
                        
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
                                        width: 28,
                                    }}>
                                        #{displayRank}
                                    </span>
                                </div>

                                {/* Name & Avatar */}
                                <div style={{ width: 220, display: 'flex', alignItems: 'center', gap: 12 }}>
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
                                        overflow: 'hidden',
                                    }}>
                                        {racer.picture ? (
                                            <img src={racer.picture} alt={racer.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
                                        ) : (
                                            getInitials(racer.name)
                                        )}
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
                                <div style={{ flex: 1, textAlign: 'center', fontSize: 14, fontWeight: 700, color: racer.rollNumber === user?.rollNumber ? COLORS.brand : COLORS.text }}>
                                    {racer.scorePercent}%
                                </div>
                                <div style={{ flex: 1, textAlign: 'center', fontSize: 14, fontWeight: 700, color: COLORS.text }}>
                                    {racer.netScore}
                                </div>
                                <div style={{ flex: 1, textAlign: 'center', fontSize: 14, fontWeight: 600, color: COLORS.green }}>
                                    {racer.stepsCompleted}/{TOTAL_STEPS}
                                </div>
                                <div style={{ flex: 1, textAlign: 'center', fontSize: 14, fontWeight: 600, color: racer.rejectionCount > 0 ? COLORS.red : COLORS.textMuted }}>
                                    {racer.rejectionCount}
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
        </div>
    );
}
