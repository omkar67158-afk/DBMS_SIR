import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, ChevronDown, Minus, Calendar, Plus, Search, BarChart3, X } from 'lucide-react';
import axios from 'axios';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';

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

/* ─ Full Screen Graph Component ─ */
function FullScreenGraph({ racers, onClose }) {
    const [chartType, setChartType] = useState('area'); // 'line', 'bar', 'area'
    const [viewMode, setViewMode] = useState('comparison'); // 'comparison', 'timeline'
    
    // Prepare comparison data
    const comparisonData = racers.map(racer => ({
        name: racer.name.split(' ').slice(0, 2).join(' '),
        rollNumber: racer.rollNumber,
        score: racer.netScore,
        steps: racer.stepsCompleted,
        percentage: racer.scorePercent,
    })).slice(0, 15); // Show top 15 for better visualization

    // Prepare timeline data (progression through steps)
    const timelineData = [];
    const maxSteps = Math.max(...racers.map(r => r.stepsCompleted), 8);
    
    for (let step = 1; step <= maxSteps; step++) {
        const stepData = { step: `Step ${step}` };
        racers.forEach((racer, idx) => {
            if (racer.stepsCompleted >= step) {
                const key = racer.name.split(' ').slice(0, 2).join(' ');
                stepData[key] = step * 100 - (racer.rejectionCount || 0) * 25;
            }
        });
        timelineData.push(stepData);
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.85)',
                backdropFilter: 'blur(8px)',
                zIndex: 99999,
                display: 'flex',
                flexDirection: 'column',
                padding: '40px',
            }}
            onClick={onClose}
        >
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 32,
            }}>
                <div>
                    <h2 style={{
                        fontSize: 32,
                        fontWeight: 700,
                        color: '#fff',
                        margin: '0 0 8px 0',
                    }}>
                        Performance Analytics 📊
                    </h2>
                    <p style={{
                        fontSize: 16,
                        color: '#9ca3af',
                        margin: 0,
                    }}>
                        Real-time comparison of all students
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    {/* View Mode Selector */}
                    <div style={{
                        display: 'flex',
                        gap: 4,
                        padding: '6px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: 10,
                    }}>
                        {[
                            { id: 'comparison', label: '📊 Comparison', icon: '📊' },
                            { id: 'timeline', label: '⏱️ Timeline', icon: '⏱️' }
                        ].map(mode => (
                            <button
                                key={mode.id}
                                onClick={(e) => { e.stopPropagation(); setViewMode(mode.id); }}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: 8,
                                    border: 'none',
                                    cursor: 'pointer',
                                    background: viewMode === mode.id ? '#fff' : 'transparent',
                                    color: viewMode === mode.id ? '#2563eb' : '#fff',
                                    fontSize: 13,
                                    fontWeight: 600,
                                    transition: 'all 0.2s',
                                }}
                            >
                                {mode.label}
                            </button>
                        ))}
                    </div>
                    
                    {/* Chart Type Selector */}
                    <div style={{
                        display: 'flex',
                        gap: 4,
                        padding: '6px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: 10,
                    }}>
                        {['area', 'line', 'bar'].map(type => (
                            <button
                                key={type}
                                onClick={(e) => { e.stopPropagation(); setChartType(type); }}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: 8,
                                    border: 'none',
                                    cursor: 'pointer',
                                    background: chartType === type ? '#fff' : 'transparent',
                                    color: chartType === type ? '#2563eb' : '#fff',
                                    fontSize: 13,
                                    fontWeight: 600,
                                    transition: 'all 0.2s',
                                }}
                            >
                                {type.charAt(0).toUpperCase() + type.slice(1)}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.2)'}
                        onMouseLeave={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.1)'}
                    >
                        <X size={20} />
                    </button>
                </div>
            </div>

            {/* Charts */}
            {viewMode === 'comparison' ? (
                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                    {/* Score Comparison Chart */}
                    <div style={{
                        background: '#fff',
                        borderRadius: 16,
                        padding: 24,
                        boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
                    }}>
                        <h3 style={{
                            fontSize: 18,
                            fontWeight: 700,
                            color: '#111827',
                            margin: '0 0 20px 0',
                        }}>
                            Net Score Comparison (Top 15)
                        </h3>
                        <ResponsiveContainer width="100%" height={350}>
                            {chartType === 'area' ? (
                                <AreaChart data={comparisonData}>
                                    <defs>
                                        <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.8}/>
                                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} tick={{ fontSize: 11 }} />
                                    <YAxis stroke="#6b7280" />
                                    <Tooltip 
                                        contentStyle={{ 
                                            borderRadius: 12, 
                                            border: 'none',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                        }}
                                    />
                                    <Area 
                                        type="monotone" 
                                        dataKey="score" 
                                        stroke="#2563eb" 
                                        fillOpacity={1} 
                                        fill="url(#colorScore)" 
                                    />
                                </AreaChart>
                            ) : chartType === 'line' ? (
                                <LineChart data={comparisonData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} tick={{ fontSize: 11 }} />
                                    <YAxis stroke="#6b7280" />
                                    <Tooltip 
                                        contentStyle={{ 
                                            borderRadius: 12, 
                                            border: 'none',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                        }}
                                    />
                                    <Legend />
                                    <Line 
                                        type="monotone" 
                                        dataKey="score" 
                                        stroke="#2563eb" 
                                        strokeWidth={3}
                                        dot={{ fill: '#2563eb', strokeWidth: 2, r: 6 }}
                                    />
                                </LineChart>
                            ) : (
                                <BarChart data={comparisonData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} tick={{ fontSize: 11 }} />
                                    <YAxis stroke="#6b7280" />
                                    <Tooltip 
                                        contentStyle={{ 
                                            borderRadius: 12, 
                                            border: 'none',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                        }}
                                    />
                                    <Legend />
                                    <Bar 
                                        dataKey="score" 
                                        fill="#2563eb" 
                                        radius={[8, 8, 0, 0]}
                                    />
                                </BarChart>
                            )}
                        </ResponsiveContainer>
                    </div>

                    {/* Steps Progress Chart */}
                    <div style={{
                        background: '#fff',
                        borderRadius: 16,
                        padding: 24,
                        boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
                    }}>
                        <h3 style={{
                            fontSize: 18,
                            fontWeight: 700,
                            color: '#111827',
                            margin: '0 0 20px 0',
                        }}>
                            Steps Completed Progress
                        </h3>
                        <ResponsiveContainer width="100%" height={350}>
                            {chartType === 'area' ? (
                                <AreaChart data={comparisonData}>
                                    <defs>
                                        <linearGradient id="colorSteps" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#059669" stopOpacity={0.8}/>
                                            <stop offset="95%" stopColor="#059669" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} tick={{ fontSize: 11 }} />
                                    <YAxis stroke="#6b7280" domain={[0, 8]} />
                                    <Tooltip 
                                        contentStyle={{ 
                                            borderRadius: 12, 
                                            border: 'none',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                        }}
                                    />
                                    <Area 
                                        type="monotone" 
                                        dataKey="steps" 
                                        stroke="#059669" 
                                        fillOpacity={1} 
                                        fill="url(#colorSteps)" 
                                    />
                                </AreaChart>
                            ) : chartType === 'line' ? (
                                <LineChart data={comparisonData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} tick={{ fontSize: 11 }} />
                                    <YAxis stroke="#6b7280" domain={[0, 8]} />
                                    <Tooltip 
                                        contentStyle={{ 
                                            borderRadius: 12, 
                                            border: 'none',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                        }}
                                    />
                                    <Legend />
                                    <Line 
                                        type="monotone" 
                                        dataKey="steps" 
                                        stroke="#059669" 
                                        strokeWidth={3}
                                        dot={{ fill: '#059669', strokeWidth: 2, r: 6 }}
                                    />
                                </LineChart>
                            ) : (
                                <BarChart data={comparisonData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} tick={{ fontSize: 11 }} />
                                    <YAxis stroke="#6b7280" domain={[0, 8]} />
                                    <Tooltip 
                                        contentStyle={{ 
                                            borderRadius: 12, 
                                            border: 'none',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                        }}
                                    />
                                    <Legend />
                                    <Bar 
                                        dataKey="steps" 
                                        fill="#059669" 
                                        radius={[8, 8, 0, 0]}
                                    />
                                </BarChart>
                            )}
                        </ResponsiveContainer>
                    </div>
                </div>
            ) : (
                /* Timeline View - Step Progression */
                <div style={{
                    flex: 1,
                    background: '#fff',
                    borderRadius: 16,
                    padding: 24,
                    boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
                }}>
                    <h3 style={{
                        fontSize: 18,
                        fontWeight: 700,
                        color: '#111827',
                        margin: '0 0 20px 0',
                    }}>
                        Step-by-Step Progression Race 🏎️
                    </h3>
                    <ResponsiveContainer width="100%" height={500}>
                        {chartType === 'area' ? (
                            <AreaChart data={timelineData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis dataKey="step" stroke="#6b7280" />
                                <YAxis stroke="#6b7280" />
                                <Tooltip 
                                    contentStyle={{ 
                                        borderRadius: 12, 
                                        border: 'none',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                    }}
                                />
                                <Legend />
                                {Object.keys(timelineData[0] || {}).filter(key => key !== 'step').slice(0, 10).map((key, idx) => (
                                    <Area
                                        key={key}
                                        type="monotone"
                                        dataKey={key}
                                        stroke={AVATAR_PALETTE[idx % AVATAR_PALETTE.length]}
                                        fill={`${AVATAR_PALETTE[idx % AVATAR_PALETTE.length]}20`}
                                        strokeWidth={2}
                                    />
                                ))}
                            </AreaChart>
                        ) : chartType === 'line' ? (
                            <LineChart data={timelineData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis dataKey="step" stroke="#6b7280" />
                                <YAxis stroke="#6b7280" />
                                <Tooltip 
                                    contentStyle={{ 
                                        borderRadius: 12, 
                                        border: 'none',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                    }}
                                />
                                <Legend />
                                {Object.keys(timelineData[0] || {}).filter(key => key !== 'step').slice(0, 10).map((key, idx) => (
                                    <Line
                                        key={key}
                                        type="monotone"
                                        dataKey={key}
                                        stroke={AVATAR_PALETTE[idx % AVATAR_PALETTE.length]}
                                        strokeWidth={3}
                                        dot={false}
                                    />
                                ))}
                            </LineChart>
                        ) : (
                            <BarChart data={timelineData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis dataKey="step" stroke="#6b7280" />
                                <YAxis stroke="#6b7280" />
                                <Tooltip 
                                    contentStyle={{ 
                                        borderRadius: 12, 
                                        border: 'none',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                    }}
                                />
                                <Legend />
                                {Object.keys(timelineData[0] || {}).filter(key => key !== 'step').slice(0, 6).map((key, idx) => (
                                    <Bar
                                        key={key}
                                        dataKey={key}
                                        fill={AVATAR_PALETTE[idx % AVATAR_PALETTE.length]}
                                    />
                                ))}
                            </BarChart>
                        )}
                    </ResponsiveContainer>
                </div>
            )}

            {/* Footer Stats */}
            <div style={{
                display: 'flex',
                gap: 24,
                marginTop: 24,
                padding: '20px 24px',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: 16,
                border: '1px solid rgba(255, 255, 255, 0.1)',
            }}>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 4 }}>Total Students</div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: '#fff' }}>{racers.length}</div>
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 4 }}>Average Score</div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: '#fff' }}>
                        {Math.round(racers.reduce((sum, r) => sum + r.netScore, 0) / racers.length)}
                    </div>
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 4 }}>Top Performer</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#fbbf24' }}>
                        {racers[0]?.name.split(' ').slice(0, 2).join(' ') || 'N/A'}
                    </div>
                </div>
            </div>
        </motion.div>
    );
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
    const [searchQuery, setSearchQuery] = useState('');
    const [showGraph, setShowGraph] = useState(false);
    const [dateRange, setDateRange] = useState({
        start: new Date('2025-01-01'),
        end: new Date()
    });
    const intervalRef = useRef(null);

    const fetchLeaderboard = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/leaderboard`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = (res.data || []).map(normalise);
            
            // Set date range based on actual submission data
            if (data.length > 0) {
                const allDates = data.flatMap(r => [
                    r.firstSubmission ? new Date(r.firstSubmission).getTime() : null,
                    r.lastSubmission ? new Date(r.lastSubmission).getTime() : null,
                ].filter(Boolean));
                
                if (allDates.length > 0) {
                    const minDate = Math.min(...allDates);
                    const maxDate = Math.max(...allDates);
                    setDateRange({
                        start: new Date(minDate),
                        end: new Date(maxDate),
                    });
                }
            }
            
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

    // Filter racers based on search query
    const filteredRacers = racers.filter(racer => {
        const query = searchQuery.toLowerCase();
        return (
            racer.name.toLowerCase().includes(query) ||
            racer.rollNumber.toLowerCase().includes(query)
        );
    });

    // Filter by date range (assuming submissions have dates)
    const dateFilteredRacers = filteredRacers.filter(racer => {
        const racerDate = racer.completedAt ? new Date(racer.completedAt) : new Date();
        return racerDate >= dateRange.start && racerDate <= dateRange.end;
    });

    const displayRacers = dateFilteredRacers.length > 0 ? dateFilteredRacers : filteredRacers;

    return (
        <>
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
                    {/* Search Box */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 16px',
                        background: COLORS.card,
                        borderRadius: 8,
                        border: `1px solid ${COLORS.border}`,
                        minWidth: 250,
                    }}>
                        <Search size={16} color={COLORS.textMuted} />
                        <input
                            type="text"
                            placeholder="Search by name or roll number..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                border: 'none',
                                outline: 'none',
                                fontSize: 14,
                                color: COLORS.text,
                                background: 'transparent',
                                flex: 1,
                            }}
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: 4,
                                    color: COLORS.textMuted,
                                }}
                            >
                                <X size={14} />
                            </button>
                        )}
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
                        position: 'relative',
                        cursor: 'pointer',
                    }}>
                        <Calendar size={16} color={COLORS.textMuted} />
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 4,
                        }}>
                            <div style={{
                                fontSize: 11,
                                fontWeight: 600,
                                color: COLORS.textMuted,
                                textTransform: 'uppercase',
                            }}>
                                From
                            </div>
                            <input
                                type="date"
                                value={dateRange.start.toISOString().split('T')[0]}
                                onChange={(e) => setDateRange(prev => ({ ...prev, start: new Date(e.target.value) }))}
                                style={{
                                    border: 'none',
                                    outline: 'none',
                                    fontSize: 12,
                                    color: COLORS.text,
                                    background: 'transparent',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                }}
                            />
                            <div style={{
                                fontSize: 11,
                                fontWeight: 600,
                                color: COLORS.textMuted,
                                textTransform: 'uppercase',
                            }}>
                                To
                            </div>
                            <input
                                type="date"
                                value={dateRange.end.toISOString().split('T')[0]}
                                onChange={(e) => setDateRange(prev => ({ ...prev, end: new Date(e.target.value) }))}
                                style={{
                                    border: 'none',
                                    outline: 'none',
                                    fontSize: 12,
                                    color: COLORS.text,
                                    background: 'transparent',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                }}
                            />
                        </div>
                    </div>

                    {/* View Graph Button */}
                    <button
                        onClick={() => setShowGraph(true)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '8px 16px',
                            background: COLORS.brand,
                            border: 'none',
                            borderRadius: 8,
                            cursor: 'pointer',
                            color: '#fff',
                            fontSize: 14,
                            fontWeight: 600,
                            transition: 'all 0.2s',
                            boxShadow: '0 2px 8px rgba(37, 99, 235, 0.2)',
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.background = '#1d4ed8';
                            e.target.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.background = COLORS.brand;
                            e.target.style.transform = 'translateY(0)';
                        }}
                    >
                        <BarChart3 size={16} />
                        View Analytics
                    </button>

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
                    {displayRacers.map((racer, idx) => {
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
                    Showing {displayRacers.length} racer{displayRacers.length !== 1 ? 's' : ''}
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

            {/* Full Screen Graph Modal */}
            <AnimatePresence>
                {showGraph && (
                    <FullScreenGraph racers={racers} onClose={() => setShowGraph(false)} />
                )}
            </AnimatePresence>
        </>
    );
}
