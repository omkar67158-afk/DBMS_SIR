import { useEffect, useState, useRef, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, OrbitControls, ContactShadows, Environment } from '@react-three/drei';
import { TrendingUp, Zap, Award, AlertCircle, Hash } from 'lucide-react';
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

/* ── Skeleton ── */
function SkeletonRow({ delay = 0 }) {
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '13px 20px', borderRadius: 12,
            background: '#fafafa', border: '1px solid #f3f4f6',
            animation: `skeletonPulse 1.4s ease-in-out ${delay}s infinite alternate`,
        }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#e5e7eb' }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
                <div style={{ width: '38%', height: 10, borderRadius: 4, background: '#e5e7eb' }} />
                <div style={{ width: '100%', height: 5, borderRadius: 99, background: '#e5e7eb' }} />
            </div>
            <div style={{ width: 56, height: 22, borderRadius: 20, background: '#e5e7eb' }} />
        </div>
    );
}

/* ── Animated Flip Button ── */
function AnimatedStatButton({ label, value, color, icon, small }) {
    const [revealed, setRevealed] = useState(false);

    useEffect(() => {
        if (revealed) {
            const t = setTimeout(() => setRevealed(false), 10000);
            return () => clearTimeout(t);
        }
    }, [revealed]);

    const w = small ? 110 : 130;
    const h = small ? 52 : 60;

    return (
        <div
            style={{ perspective: 1000, width: w, height: h, zIndex: 20, cursor: 'pointer' }}
            onClick={() => setRevealed(r => !r)}
        >
            <motion.div
                initial={false}
                animate={{ rotateX: revealed ? 180 : 0 }}
                transition={{ duration: 0.6, type: 'spring', stiffness: 200, damping: 20 }}
                style={{ width: '100%', height: '100%', position: 'relative', transformStyle: 'preserve-3d' }}
            >
                {/* Front */}
                <div style={{
                    position: 'absolute', inset: 0, backfaceVisibility: 'hidden',
                    background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)',
                    borderRadius: 14, border: `1px solid ${COLORS.border}`,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.07)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                }}>
                    {icon}
                    <span style={{ fontWeight: 800, color: COLORS.textMuted, fontSize: small ? 11 : 13 }}>{label}</span>
                </div>
                {/* Back */}
                <div style={{
                    position: 'absolute', inset: 0, backfaceVisibility: 'hidden',
                    background: color, transform: 'rotateX(180deg)',
                    borderRadius: 14, border: `1px solid ${color}`,
                    boxShadow: `0 8px 28px ${color}66`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <span style={{ fontSize: small ? 16 : 20, fontWeight: 900, color: '#fff' }}>{value}</span>
                </div>
            </motion.div>
        </div>
    );
}

/* ── Attractive 3D Stages (Redesigned) ── */
const Podium3D = ({ racer, pos, isSelected, onClick }) => {
    if (!racer) return null;

    const cfg = {
        1: {
            h: 140, w: 120,
            base: 'linear-gradient(180deg, #fcd34d 0%, #b45309 100%)',
            top: '#fde68a',
            bottom: '#78350f',
            glow: 'rgba(251, 191, 36, 0.6)',
            color: '#fbbf24',
            emoji: '👑',
        },
        2: {
            h: 100, w: 110,
            base: 'linear-gradient(180deg, #cbd5e1 0%, #334155 100%)',
            top: '#e2e8f0',
            bottom: '#1e293b',
            glow: 'rgba(148, 163, 184, 0.6)',
            color: '#94a3b8',
            emoji: '⭐',
        },
        3: {
            h: 70, w: 100,
            base: 'linear-gradient(180deg, #fdba74 0%, #7c2d12 100%)',
            top: '#ffedd5',
            bottom: '#431407',
            glow: 'rgba(217, 119, 6, 0.6)',
            color: '#d97706',
            emoji: '🔥',
        },
    }[pos];

    const lift = isSelected ? -15 : 0;
    const scale = isSelected ? 1.05 : 0.95;

    return (
        <div
            onClick={onClick}
            style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'flex-end', cursor: 'pointer', userSelect: 'none',
                transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                transform: `translateY(${lift}px) scale(${scale})`,
                opacity: isSelected ? 1 : 0.7,
                zIndex: pos === 1 ? 10 : 5,
                margin: '0 -5px',
            }}
        >
            {/* ── Suspended Racer Card ── */}
            <div style={{
                textAlign: 'center', marginBottom: 16,
                position: 'relative', zIndex: 10,
                animation: isSelected ? 'floatRacer 3s ease-in-out infinite' : 'none',
            }}>
                <div style={{
                    fontSize: pos === 1 ? 48 : 36,
                    filter: `drop-shadow(0 10px 10px rgba(0,0,0,0.2))`,
                }}>
                    {cfg.emoji}
                </div>
                <div style={{
                    marginTop: 8, padding: '6px 18px', borderRadius: 24,
                    background: 'rgba(255, 255, 255, 1)',
                    border: `2px solid ${cfg.color}`,
                    boxShadow: `0 8px 24px ${cfg.glow}, 0 4px 8px rgba(0,0,0,0.1)`,
                    fontSize: pos === 1 ? 16 : 14,
                    fontWeight: 900, color: '#0f172a',
                    whiteSpace: 'nowrap',
                }}>
                    {racer.name?.split(' ')[0]}
                </div>
                <div style={{
                    fontSize: pos === 1 ? 16 : 14, fontWeight: 900,
                    color: '#fff', marginTop: 8,
                    background: cfg.color, padding: '4px 12px', borderRadius: 12,
                    display: 'inline-block',
                    boxShadow: `0 4px 12px ${cfg.glow}`,
                }}>
                    #{pos} • {racer.scorePercent}%
                </div>
            </div>

            {/* ── True 3D CSS Cylinder Pedestal ── */}
            <div style={{
                position: 'relative',
                width: cfg.w,
                height: cfg.h + (cfg.w * 0.25),
                filter: `drop-shadow(0 20px 20px rgba(0,0,0,0.15))`,
            }}>
                {/* Top Ellipse (The Platform) */}
                <div style={{
                    position: 'absolute', top: 0, left: 0,
                    width: '100%', height: cfg.w * 0.3,
                    background: cfg.top,
                    borderRadius: '50%',
                    border: '2px solid rgba(255,255,255,0.8)',
                    boxShadow: `inset 0 -10px 20px rgba(0,0,0,0.1)`,
                    zIndex: 3,
                }} />

                {/* Body (The Extrusion) */}
                <div style={{
                    position: 'absolute', top: cfg.w * 0.15, left: 0,
                    width: '100%', height: cfg.h,
                    background: cfg.base,
                    zIndex: 2,
                }}>
                    {/* Vertical Highlight for 3D Specular effect */}
                    <div style={{
                        position: 'absolute', top: 0, left: '20%', width: '15%', height: '100%',
                        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                    }} />
                     <div style={{
                        position: 'absolute', top: 0, right: '10%', width: '10%', height: '100%',
                        background: 'linear-gradient(90deg, transparent, rgba(0,0,0,0.15), transparent)',
                    }} />
                </div>

                {/* Bottom Ellipse (The Curved Base) */}
                <div style={{
                    position: 'absolute', top: cfg.h, left: 0,
                    width: '100%', height: cfg.w * 0.3,
                    background: cfg.bottom,
                    borderRadius: '50%',
                    zIndex: 1,
                }} />
            </div>
            
            {/* ── Ground Glow ── */}
            <div style={{
                position: 'absolute', bottom: -10, left: '50%',
                transform: 'translateX(-50%)',
                width: cfg.w * 1.5, height: 20,
                background: `radial-gradient(ellipse, ${cfg.glow} 0%, transparent 70%)`,
                zIndex: 0,
            }} />
        </div>
    );
};


/* ── 3D Model ── */
function StudentModel() {
    const { scene } = useGLTF('/models/ai_aesthetic_apocalypse.glb');
    const ref = useRef();
    useFrame((state) => {
        if (ref.current) {
            ref.current.position.y = Math.sin(state.clock.elapsedTime * 1.5) * 0.05 - 2.6;
        }
    });
    return (
        <group ref={ref} dispose={null} scale={2.2} position={[0, -2.6, 0]}>
            <primitive object={scene} />
        </group>
    );
}

/* ══ MAIN COMPONENT ══ */
export default function RaceLeaderboard({ user }) {
    const [racers, setRacers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedStudentId, setSelectedStudentId] = useState(null);
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

    const yourData = racers.find(r => r.rollNumber === user?.rollNumber);

    useEffect(() => {
        if (!selectedStudentId && yourData) setSelectedStudentId(yourData.rollNumber);
        else if (!selectedStudentId && racers.length > 0) setSelectedStudentId(racers[0].rollNumber);
    }, [racers, selectedStudentId, yourData]);

    if (loading) return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '40px 24px' }}>
            {[0, 0.1, 0.2, 0.3, 0.4].map((d, i) => <SkeletonRow key={i} delay={d} />)}
        </div>
    );

    const top3 = racers.slice(0, 3);
    const restOfStudents = racers.slice(3);
    const selectedStudentData = racers.find(r => r.rollNumber === selectedStudentId) || racers[0];
    const selectedStudentRank = racers.findIndex(r => r.rollNumber === selectedStudentId) + 1;

    return (
        <div style={{
            display: 'flex',
            flex: 1,
            height: '100%',
            width: '100%',
            overflow: 'hidden',
            background: '#f8fafc',
            fontFamily: 'inherit',
            position: 'relative',
        }}>
            {/* ═══ LEFT COLUMN ═══ */}
            <div style={{
                width: '30%',
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                borderRight: '1px solid #e5e7eb',
                background: 'transparent',
                overflow: 'hidden',
            }}>

                {/* ── 3D Podium ── */}
                <div style={{
                    padding: '28px 16px 16px',
                    background: 'transparent',
                    borderBottom: '1px solid #e5e7eb',
                    flexShrink: 0,
                }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'flex-end',
                        gap: 6,
                        minHeight: 240,
                        paddingBottom: 8,
                    }}>
                        {/* Order: 2nd, 1st, 3rd — 1st in center */}
                        <Podium3D
                            racer={top3[1]}
                            pos={2}
                            isSelected={selectedStudentId === top3[1]?.rollNumber}
                            onClick={() => top3[1] && setSelectedStudentId(top3[1].rollNumber)}
                        />
                        <Podium3D
                            racer={top3[0]}
                            pos={1}
                            isSelected={selectedStudentId === top3[0]?.rollNumber}
                            onClick={() => top3[0] && setSelectedStudentId(top3[0].rollNumber)}
                        />
                        <Podium3D
                            racer={top3[2]}
                            pos={3}
                            isSelected={selectedStudentId === top3[2]?.rollNumber}
                            onClick={() => top3[2] && setSelectedStudentId(top3[2].rollNumber)}
                        />
                    </div>
                </div>

                {/* ── Scrollable List ── */}
                <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', background: 'transparent' }}>
                    {restOfStudents.length === 0 && (
                        <div style={{ padding: 24, textAlign: 'center', color: COLORS.textFaint, fontSize: 13 }}>
                            No other racers yet
                        </div>
                    )}
                    <AnimatePresence>
                        {restOfStudents.map((racer, idx) => {
                            const isSelected = selectedStudentId === racer.rollNumber;
                            const avatarColor = AVATAR_PALETTE[(idx + 3) % AVATAR_PALETTE.length];

                            return (
                                <motion.div
                                    key={racer.rollNumber}
                                    layout
                                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                                    onClick={() => setSelectedStudentId(racer.rollNumber)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px',
                                        background: isSelected ? '#eff6ff' : 'transparent',
                                        borderBottom: `1px solid ${COLORS.border}`,
                                        borderLeft: `4px solid ${isSelected ? COLORS.brand : 'transparent'}`,
                                        cursor: 'pointer', transition: 'background 0.2s',
                                    }}
                                    whileHover={{ background: isSelected ? COLORS.brandLight : '#f8fafc' }}
                                >
                                    <div style={{ fontSize: 12, fontWeight: 800, color: COLORS.textFaint, width: 24, flexShrink: 0 }}>
                                        #{idx + 4}
                                    </div>
                                    <div style={{
                                        width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                                        background: avatarColor, display: 'flex', alignItems: 'center',
                                        justifyContent: 'center', fontSize: 12, fontWeight: 800,
                                        color: '#fff', boxShadow: `0 3px 8px ${avatarColor}44`,
                                    }}>
                                        {getInitials(racer.name)}
                                    </div>
                                    <div style={{ flex: 1, overflow: 'hidden' }}>
                                        <div style={{
                                            fontSize: 14, fontWeight: 700,
                                            color: isSelected ? COLORS.brand : COLORS.text,
                                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                        }}>
                                            {racer.name?.split(' ')[0]}
                                        </div>
                                    </div>
                                    <div style={{ fontSize: 14, fontWeight: 900, color: COLORS.text, flexShrink: 0 }}>
                                        {racer.scorePercent}%
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            </div>

            {/* ═══ RIGHT PANEL — Full Screen 3D Viewer ═══ */}
            <div style={{
                flex: 1,
                position: 'relative',
                overflow: 'hidden',
                background: 'transparent',
            }}>
                {/* ── Name subtitle + Rank title at top center ── */}
                {selectedStudentData && (
                    <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0,
                        textAlign: 'center', zIndex: 20, pointerEvents: 'none',
                        paddingTop: 20,
                    }}>
                        <AnimatePresence mode="wait">
                            <motion.p
                                key={`sub-${selectedStudentData.rollNumber}`}
                                initial={{ opacity: 0, y: -12 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.35 }}
                                style={{
                                    margin: 0,
                                    fontSize: 16,
                                    fontWeight: 600,
                                    color: '#374151',
                                    letterSpacing: '-0.01em',
                                    lineHeight: 1,
                                    textShadow: '0 1px 8px rgba(255,255,255,0.9), 0 0 20px rgba(255,255,255,0.6)',
                                }}
                            >
                                {selectedStudentData.name ?? '—'}
                            </motion.p>
                        </AnimatePresence>

                        <AnimatePresence mode="wait">
                            <motion.h2
                                key={`rank-${selectedStudentData.rollNumber}`}
                                initial={{ opacity: 0, scale: 0.85 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ duration: 0.35, delay: 0.06 }}
                                style={{
                                    margin: '6px 0 0',
                                    fontSize: 22,
                                    fontWeight: 900,
                                    color: COLORS.brand,
                                    letterSpacing: '-0.025em',
                                    lineHeight: 1,
                                    textShadow: '0 2px 12px rgba(255,255,255,0.95), 0 0 30px rgba(37,99,235,0.15)',
                                }}
                            >
                                Rank #{selectedStudentRank}
                            </motion.h2>
                        </AnimatePresence>
                    </div>
                )}

                {/* ── Left side buttons: Score (top) + Roll No (bottom) ── */}
                {selectedStudentData && (
                    <div style={{
                        position: 'absolute',
                        left: 28,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        zIndex: 20,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 14,
                        alignItems: 'flex-start',
                    }}>
                        <AnimatedStatButton
                            label="Score"
                            value={`${selectedStudentData.scorePercent}%`}
                            color={COLORS.brand}
                            icon={<TrendingUp size={15} color={COLORS.textMuted} />}
                        />
                        <AnimatedStatButton
                            label="Points"
                            value={selectedStudentData.netScore}
                            color={COLORS.amber}
                            icon={<Award size={15} color={COLORS.textMuted} />}
                        />
                        <AnimatedStatButton
                            label="Roll No"
                            value={selectedStudentData.rollNumber}
                            color={COLORS.indigo}
                            icon={<Hash size={15} color={COLORS.textMuted} />}
                        />
                    </div>
                )}

                {/* ── Right side buttons: Steps + Flags ── */}
                {selectedStudentData && (
                    <div style={{
                        position: 'absolute',
                        right: 28,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        zIndex: 20,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 14,
                        alignItems: 'flex-end',
                    }}>
                        <AnimatedStatButton
                            label="Steps"
                            value={`${selectedStudentData.stepsCompleted}/${TOTAL_STEPS}`}
                            color={COLORS.green}
                            icon={<Zap size={15} color={COLORS.textMuted} />}
                        />
                        <AnimatedStatButton
                            label="Flags"
                            value={selectedStudentData.rejectionCount}
                            color={COLORS.red}
                            icon={<AlertCircle size={15} color={COLORS.textMuted} />}
                        />
                    </div>
                )}

                {/* ── Full Screen Canvas ── */}
                <div style={{ position: 'absolute', inset: 0, top: 80, zIndex: 5 }}>
                    <Canvas camera={{ position: [0, 1, 6], fov: 45 }}>
                        <ambientLight intensity={0.7} />
                        <spotLight position={[10, 10, 10]} angle={0.2} penumbra={1} intensity={1.8} castShadow />
                        <spotLight position={[-10, 10, -10]} angle={0.2} penumbra={1} intensity={0.5} />
                        <Environment preset="city" />
                        <Suspense fallback={null}>
                            <StudentModel />
                            <ContactShadows resolution={1024} scale={20} blur={2.5} opacity={0.5} far={10} color="#000000" />
                        </Suspense>
                        <OrbitControls
                            enableZoom={false}
                            enablePan={false}
                            autoRotate
                            autoRotateSpeed={1.5}
                            maxPolarAngle={Math.PI / 2 + 0.1}
                            minPolarAngle={Math.PI / 3}
                        />
                    </Canvas>
                </div>
            </div>

            <style>{`
                @keyframes skeletonPulse { 0%{opacity:0.5} 100%{opacity:0.9} }
                @keyframes floatRacer {
                    0% { transform: translateY(0px); }
                    50% { transform: translateY(-8px); }
                    100% { transform: translateY(0px); }
                }
                ::-webkit-scrollbar { width: 5px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
                ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
            `}</style>
        </div>
    );
}
