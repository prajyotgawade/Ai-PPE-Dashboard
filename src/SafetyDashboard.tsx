import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  AlertTriangle,
  Users,
  Camera as CameraIcon,
  CheckCircle,
  HardHat,
  Cpu,
  Settings,
  Bell,
  Monitor,
  LayoutDashboard,
  ShieldCheck,
  Zap
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  AreaChart,
  Area,
  LineChart,
  Line
} from 'recharts';

// ═══════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════

interface Worker {
  id: string;
  x: number;           // 0–1 normalized canvas position
  y: number;
  compliant: boolean;
  violation: string | null;  // "No Helmet" | "No Vest" | "No Gloves" | null
  jitterSeed: number;  // unique per worker for sin() variation
}

interface Camera {
  id: string;
  label: string;
  location: string;
  bgColor: string;     // dark hex unique per camera
  floorColor: string;
  workers: Worker[];
}

interface Alert {
  id: string;          // uuid via crypto.randomUUID()
  timestamp: Date;
  camera: string;
  message: string;
  severity: 'critical' | 'warning';
  isNew: boolean;      // true for 2s then false (drives CSS animation)
}

interface PPEViolation {
  type: string;
  count: number;
  color: string;
}

interface ZoneCell {
  id: string;
  name: string;
  level: 'high' | 'medium' | 'low' | 'clear';
  violations: number;
}

interface SystemMetric {
  label: string;
  value: number;
  unit: string;
  status: 'online' | 'warning' | 'offline';
  showBar: boolean;
}

interface TimeSeriesPoint {
  time: string;
  violations: number;
  compliance: number;
}

// ═══════════════════════════════════════════
// INITIAL DATA CONSTANTS
// ═══════════════════════════════════════════

const INITIAL_CAMERAS: Camera[] = [
  {
    id: 'CAM01',
    label: 'CAM 01',
    location: 'Loading Bay A',
    bgColor: '#0a1a0a',
    floorColor: '#122212',
    workers: [
      { id: 'W1', x: 0.15, y: 0.52, compliant: true, violation: null, jitterSeed: 0.0 },
      { id: 'W2', x: 0.35, y: 0.47, compliant: false, violation: 'No Helmet', jitterSeed: 1.1 },
      { id: 'W3', x: 0.58, y: 0.54, compliant: true, violation: null, jitterSeed: 2.2 },
      { id: 'W4', x: 0.78, y: 0.49, compliant: true, violation: null, jitterSeed: 3.3 },
    ]
  },
  {
    id: 'CAM02',
    label: 'CAM 02',
    location: 'Warehouse Zone B',
    bgColor: '#0a0f1a',
    floorColor: '#101828',
    workers: [
      { id: 'W1', x: 0.22, y: 0.50, compliant: true, violation: null, jitterSeed: 0.5 },
      { id: 'W2', x: 0.52, y: 0.46, compliant: true, violation: null, jitterSeed: 1.6 },
      { id: 'W3', x: 0.76, y: 0.54, compliant: true, violation: null, jitterSeed: 2.7 },
    ]
  },
  {
    id: 'CAM03',
    label: 'CAM 03',
    location: 'Assembly Floor',
    bgColor: '#1a0f0a',
    floorColor: '#281810',
    workers: [
      { id: 'W1', x: 0.10, y: 0.46, compliant: true, violation: null, jitterSeed: 0.2 },
      { id: 'W2', x: 0.25, y: 0.54, compliant: true, violation: null, jitterSeed: 1.3 },
      { id: 'W3', x: 0.42, y: 0.49, compliant: false, violation: 'No Vest', jitterSeed: 2.4 },
      { id: 'W4', x: 0.58, y: 0.52, compliant: true, violation: null, jitterSeed: 3.5 },
      { id: 'W5', x: 0.72, y: 0.47, compliant: true, violation: null, jitterSeed: 4.6 },
      { id: 'W6', x: 0.87, y: 0.53, compliant: true, violation: null, jitterSeed: 5.7 },
    ]
  },
  {
    id: 'CAM04',
    label: 'CAM 04',
    location: 'Exit Gate C',
    bgColor: '#0f0a1a',
    floorColor: '#181028',
    workers: [
      { id: 'W1', x: 0.32, y: 0.50, compliant: true, violation: null, jitterSeed: 0.8 },
      { id: 'W2', x: 0.68, y: 0.50, compliant: true, violation: null, jitterSeed: 1.9 },
    ]
  },
];

const INITIAL_TIMESERIES: TimeSeriesPoint[] = [
  { time: '8AM', violations: 12, compliance: 88 },
  { time: '9AM', violations: 18, compliance: 85 },
  { time: '10AM', violations: 14, compliance: 87 },
  { time: '11AM', violations: 22, compliance: 90 },
  { time: '12PM', violations: 28, compliance: 86 },
  { time: '1PM', violations: 19, compliance: 91 },
  { time: '2PM', violations: 24, compliance: 89 },
  { time: '3PM', violations: 30, compliance: 88 },
  { time: '4PM', violations: 26, compliance: 92 },
  { time: '5PM', violations: 34, compliance: 90 },
  { time: '6PM', violations: 38, compliance: 91 },
  { time: '7PM', violations: 32, compliance: 93 },
  { time: 'Now', violations: 34, compliance: 92 },
];

const INITIAL_PPE: PPEViolation[] = [
  { type: 'No Helmet', count: 18, color: '#ff1744' },
  { type: 'No Vest', count: 9, color: '#ffab00' },
  { type: 'No Gloves', count: 6, color: '#ffab00' },
  { type: 'No Boots', count: 3, color: '#00b8ff' },
  { type: 'No Goggles', count: 2, color: '#00b8ff' },
];

const INITIAL_ZONES: ZoneCell[] = [
  { id: '1', name: 'Loading A', level: 'high', violations: 12 },
  { id: '2', name: 'Loading B', level: 'medium', violations: 8 },
  { id: '3', name: 'WH-C', level: 'low', violations: 3 },
  { id: '4', name: 'Office', level: 'clear', violations: 0 },
  { id: '5', name: 'Load Bay', level: 'medium', violations: 7 },
  { id: '6', name: 'Central', level: 'high', violations: 15 },
  { id: '7', name: 'Zone B', level: 'low', violations: 2 },
  { id: '8', name: 'WH-D', level: 'medium', violations: 6 },
  { id: '9', name: 'Exit A', level: 'clear', violations: 0 },
  { id: '10', name: 'Assembly', level: 'high', violations: 22 },
  { id: '11', name: 'Storage', level: 'medium', violations: 5 },
  { id: '12', name: 'WH-E', level: 'low', violations: 4 },
];

const INITIAL_METRICS: SystemMetric[] = [
  { label: 'AI Compute Load', value: 68, unit: '%', status: 'online', showBar: true },
  { label: 'Network Latency', value: 12, unit: 'ms', status: 'online', showBar: false },
  { label: 'Sensor Integrity', value: 99, unit: '%', status: 'online', showBar: true },
  { label: 'Buffer Usage', value: 42, unit: '%', status: 'warning', showBar: true },
];

const ALERT_MESSAGE_POOL = [
  { camera: 'CAM 01', message: 'No helmet detected — Worker near Loading Bay', severity: 'critical' as const },
  { camera: 'CAM 03', message: 'Safety vest missing — Assembly station', severity: 'critical' as const },
  { camera: 'CAM 02', message: 'No gloves detected — Warehouse picker', severity: 'warning' as const },
  { camera: 'CAM 04', message: 'Safety boots absent — Exit checkpoint', severity: 'warning' as const },
  { camera: 'CAM 01', message: 'Multiple workers without helmets — Bay A', severity: 'critical' as const },
  { camera: 'CAM 03', message: 'Eye protection missing — Grinding operation', severity: 'warning' as const },
  { camera: 'CAM 02', message: 'High-vis vest absent — Forklift zone', severity: 'critical' as const },
  { camera: 'CAM 04', message: 'No helmet — Worker entering restricted area', severity: 'critical' as const },
  { camera: 'CAM 01', message: 'Gloves not worn — Chemical handling zone', severity: 'warning' as const },
  { camera: 'CAM 03', message: 'Hard hat missing — Scaffolding area', severity: 'critical' as const },
  { camera: 'CAM 02', message: 'No safety vest — Near moving machinery', severity: 'critical' as const },
  { camera: 'CAM 04', message: 'Full PPE violation — Multiple items missing', severity: 'critical' as const },
];

const INITIAL_ALERTS: Alert[] = [
  { id: '1', timestamp: new Date(Date.now() - 30 * 60000), camera: 'CAM 01', message: 'No helmet detected — Worker near Loading Bay', severity: 'critical', isNew: false },
  { id: '2', timestamp: new Date(Date.now() - 25 * 60000), camera: 'CAM 03', message: 'Safety vest missing — Assembly station', severity: 'critical', isNew: false },
  { id: '3', timestamp: new Date(Date.now() - 15 * 60000), camera: 'CAM 02', message: 'No gloves detected — Warehouse picker', severity: 'warning', isNew: false },
  { id: '4', timestamp: new Date(Date.now() - 10 * 60000), camera: 'CAM 04', message: 'Safety boots absent — Exit checkpoint', severity: 'warning', isNew: false },
  { id: '5', timestamp: new Date(Date.now() - 5 * 60000), camera: 'CAM 01', message: 'Multiple workers without helmets — Bay A', severity: 'critical', isNew: false },
];

// ═══════════════════════════════════════════
// CHILD COMPONENTS
// ═══════════════════════════════════════════

const DashboardHeader: React.FC<{ time: Date }> = ({ time }) => {
  const [systemMode, setSystemMode] = useState<'Automated' | 'Manual' | 'Assisted'>('Automated');

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-white/5 backdrop-blur-xl sticky top-0 z-50 shadow-2xl" style={{ background: 'rgba(10, 11, 16, 0.85)' }}>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-indigo-500 blur-lg opacity-20"></div>
            <div className="relative p-2 bg-gradient-to-br from-indigo-500/20 to-blue-600/20 rounded-lg border border-indigo-500/30">
              <ShieldCheck className="w-6 h-6 text-indigo-400" />
            </div>
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-[0.2em] text-white uppercase font-rajdhani leading-none">SENTINEL-X</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></span>
              <span className="text-[9px] font-mono text-emerald-400 uppercase tracking-widest font-bold">CORE ONLINE</span>
            </div>
          </div>
        </div>

        <div className="h-8 w-px bg-white/10 mx-2"></div>

        <nav className="flex items-center gap-6">
          <button className="flex items-center gap-2 text-indigo-400 border-b-2 border-indigo-400 pb-1 px-1 transition-all">
            <LayoutDashboard size={14} />
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono">Live Monitor</span>
          </button>
        </nav>
      </div>

      <div className="flex items-center gap-6 font-mono">
        {/* Working Mode Selector */}
        <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 shadow-inner">
          <div className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mr-2">System Mode</div>
          {(['Automated', 'Assisted', 'Manual'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setSystemMode(mode)}
              className={`text-[9px] px-2 py-0.5 rounded-md transition-all font-bold uppercase tracking-tighter ${systemMode === mode
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                  : 'text-slate-500 hover:text-slate-300'
                }`}
            >
              {mode}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-full transition-all relative group">
            <Bell size={18} className="group-hover:scale-110 transition-transform" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-[#0a0b10] animate-pulse"></span>
          </button>
          <div className="flex items-center gap-3 bg-white/5 px-2 py-1 rounded-full border border-white/5">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-600 to-blue-700 flex items-center justify-center text-white text-[10px] font-bold">
              PG
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-[10px] font-bold text-slate-200 leading-none">P. GAWADE</div>
              <div className="text-[8px] text-slate-500 uppercase tracking-widest mt-1 font-bold">Super Admin</div>
            </div>
          </div>
        </div>

        <div className="h-8 w-px bg-white/10 mx-2"></div>

        <div className="text-right min-w-[80px]">
          <div className="text-[9px] text-indigo-400 font-bold uppercase tracking-widest leading-none mb-1">Session</div>
          <div className="text-sm text-white font-bold tabular-nums tracking-wider">
            {time.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
        </div>
      </div>
    </header>
  );
};

const StatCard: React.FC<{
  label: string;
  value: string | number;
  subtext: string;
  accentColor: 'cyan' | 'green' | 'red' | 'amber';
  icon: React.ElementType;
}> = ({ label, value, subtext, accentColor, icon: Icon }) => {
  const accentClasses = {
    cyan: 'border-indigo-500/40 text-indigo-400 bg-indigo-500/5',
    green: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/5',
    red: 'border-rose-500/40 text-rose-400 bg-rose-500/5',
    amber: 'border-amber-500/40 text-amber-400 bg-amber-500/5'
  };

  const glowClasses = {
    cyan: 'shadow-[0_0_30px_-15px_rgba(99,102,241,0.3)] hover:shadow-[0_0_40px_-10px_rgba(99,102,241,0.4)]',
    green: 'shadow-[0_0_30px_-15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_40px_-10px_rgba(16,185,129,0.4)]',
    red: 'shadow-[0_0_30px_-15px_rgba(244,63,94,0.3)] hover:shadow-[0_0_40px_-10px_rgba(244,63,94,0.4)]',
    amber: 'shadow-[0_0_30px_-15px_rgba(245,158,11,0.3)] hover:shadow-[0_0_40px_-10px_rgba(245,158,11,0.4)]'
  };

  return (
    <div className={`relative overflow-hidden border border-white/5 rounded-2xl p-5 transition-all duration-500 group hover:border-white/10 ${glowClasses[accentColor]}`} style={{ background: 'linear-gradient(145deg, #12141c 0%, #0a0b10 100%)' }}>
      <div className={`absolute top-0 left-0 w-1.5 h-full transition-all duration-500 group-hover:w-2 ${accentClasses[accentColor].split(' ')[0]} bg-current opacity-80`}></div>
      <div className="relative z-10 flex flex-col h-full justify-between">
        <div>
          <div className="flex justify-between items-start">
            <div className="text-[10px] font-bold font-mono text-slate-500 uppercase tracking-[0.2em] mb-1">{label}</div>
            <div className={`p-2 rounded-xl transition-all duration-500 group-hover:scale-110 ${accentClasses[accentColor]}`}>
              <Icon size={16} />
            </div>
          </div>
          <div className="text-4xl font-bold text-white font-rajdhani mt-3 tabular-nums tracking-tight">
            {value}
          </div>
        </div>
        <div className="text-[10px] text-slate-500 mt-6 font-bold flex items-center gap-2 group-hover:text-slate-400 transition-colors">
          <div className={`w-1 h-1 rounded-full ${accentClasses[accentColor].split(' ')[0]} bg-current`}></div>
          {subtext.toUpperCase()}
        </div>
      </div>
    </div>
  );
};

const CCTVFeed: React.FC<{ camera: Camera; frameCount: number }> = ({ camera, frameCount }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d')!;
    const resizeObserver = new ResizeObserver(() => {
      const W = container.offsetWidth;
      const H = container.offsetHeight;
      canvas.width = W;
      canvas.height = H;
      draw();
    });
    resizeObserver.observe(container);

    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;
      if (W === 0 || H === 0) return;

      // 1. Background
      ctx.fillStyle = camera.bgColor;
      ctx.fillRect(0, 0, W, H);

      // 2. Floor plane (bottom 55%)
      ctx.fillStyle = camera.floorColor;
      ctx.fillRect(0, H * 0.45, W, H * 0.55);

      // 3. Perspective grid
      ctx.strokeStyle = 'rgba(255,255,255,0.03)';
      ctx.lineWidth = 0.5;
      for (let i = 0; i <= 8; i++) {
        const x = (W / 8) * i;
        ctx.beginPath(); ctx.moveTo(x, H * 0.45); ctx.lineTo(x, H); ctx.stroke();
      }
      for (let i = 0; i <= 6; i++) {
        const y = H * 0.45 + (H * 0.55 / 6) * i;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }

      // 4. Background objects (simplified blocks)
      ctx.fillStyle = 'rgba(100,120,150,0.15)';
      ctx.fillRect(W * 0.04, H * 0.22, W * 0.14, H * 0.25);
      ctx.fillRect(W * 0.60, H * 0.20, W * 0.16, H * 0.28);

      // 5. Workers
      camera.workers.forEach((worker) => {
        const t = frameCount * 0.04;
        const jitterX = Math.sin(t + worker.jitterSeed) * 2.5;
        const jitterY = Math.cos(t * 0.7 + worker.jitterSeed) * 1.5;
        const wx = worker.x * W + jitterX;
        const wy = worker.y * H + jitterY;

        const bodyW = W * 0.05;
        const bodyH = H * 0.24;
        const headR = bodyW * 0.35;

        // Legs
        ctx.fillStyle = '#263238';
        ctx.fillRect(wx - bodyW * 0.25, wy, bodyW * 0.2, bodyH * 0.4);
        ctx.fillRect(wx + bodyW * 0.05, wy, bodyW * 0.2, bodyH * 0.4);

        // Body
        ctx.fillStyle = worker.compliant ? '#f59e0b' : '#ef4444';
        ctx.fillRect(wx - bodyW * 0.35, wy - bodyH * 0.5, bodyW * 0.7, bodyH * 0.5);

        // Vest stripe
        if (worker.compliant) {
          ctx.strokeStyle = '#fef08a';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(wx - bodyW * 0.35, wy - bodyH * 0.3);
          ctx.lineTo(wx + bodyW * 0.35, wy - bodyH * 0.3);
          ctx.stroke();
        }

        // Head
        ctx.beginPath();
        ctx.arc(wx, wy - bodyH * 0.5 - headR, headR, 0, Math.PI * 2);
        ctx.fillStyle = '#ffcc80';
        ctx.fill();

        // Helmet
        if (worker.compliant) {
          ctx.beginPath();
          ctx.ellipse(wx, wy - bodyH * 0.5 - headR * 1.6, headR * 1.4, headR * 0.6, 0, Math.PI, 0);
          ctx.fillStyle = '#fbbf24';
          ctx.fill();
        }

        // Bounding box
        const pad = 6;
        const bx = wx - bodyW * 0.6 - pad;
        const by = wy - bodyH * 0.8 - headR * 2 - pad;
        const bw = bodyW * 1.2 + pad * 2;
        const bh = bodyH * 1.3 + headR * 2 + pad * 2;

        ctx.strokeStyle = worker.compliant ? '#10b981' : '#ef4444';
        ctx.lineWidth = 1;
        if (!worker.compliant) {
          ctx.setLineDash([4, 2]);
        } else {
          ctx.setLineDash([]);
        }
        ctx.strokeRect(bx, by, bw, bh);
        ctx.setLineDash([]);

        // Label bg
        ctx.fillStyle = worker.compliant ? 'rgba(16,185,129,0.9)' : 'rgba(239,68,68,0.9)';
        const fontSize = Math.max(7, W * 0.02);
        ctx.font = `bold ${fontSize}px 'Share Tech Mono', monospace`;
        const labelText = `${worker.id}${worker.compliant ? ' [OK]' : ' [!]'}`;
        const labelWidth = ctx.measureText(labelText).width;
        ctx.fillRect(bx, by - fontSize - 2, labelWidth + 6, fontSize + 2);

        ctx.fillStyle = '#fff';
        ctx.textAlign = 'left';
        ctx.fillText(labelText, bx + 3, by - 4);

        if (!worker.compliant && worker.violation) {
          ctx.fillStyle = '#ef4444';
          ctx.font = `bold ${fontSize - 1}px 'Inter', sans-serif`;
          ctx.fillText(worker.violation.toUpperCase(), bx, bh + by + fontSize + 2);
        }
      });

      // 6. Vignette & Grain
      const grad = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W / 1.2);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, 'rgba(0,0,0,0.3)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Noise/Grain
      for (let i = 0; i < 100; i++) {
        const nx = Math.random() * W;
        const ny = Math.random() * H;
        ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.02})`;
        ctx.fillRect(nx, ny, 1, 1);
      }

      // 7. HUD Overlays
      const now = new Date();
      ctx.fillStyle = 'rgba(0,255,255,0.6)';
      ctx.font = `${Math.max(7, W * 0.02)}px 'Share Tech Mono', monospace`;
      ctx.fillText(`ZONE: ${camera.location.toUpperCase()}`, W * 0.04, H * 0.9);
      ctx.fillText(`ISO: 800 | F2.8`, W * 0.04, H * 0.95);

      const ts = now.toLocaleTimeString('en-US', { hour12: false });
      ctx.textAlign = 'right';
      ctx.fillText(ts, W * 0.96, H * 0.95);
      ctx.textAlign = 'left';
    };

    draw();
    return () => resizeObserver.disconnect();
  }, [frameCount, camera]);

  return (
    <div ref={containerRef} className="relative group overflow-hidden border border-white/10 rounded-xl aspect-video bg-black shadow-lg">
      <canvas ref={canvasRef} className="w-full h-full opacity-90 group-hover:opacity-100 transition-opacity duration-500" />

      {/* Corner Brackets */}
      <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-cyan-500/50"></div>
      <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-cyan-500/50"></div>
      <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-cyan-500/50"></div>
      <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-cyan-500/50"></div>

      <div className="absolute top-3 left-3 flex flex-col">
        <div className="flex items-center gap-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded border border-white/10">
          <div className="w-1.5 h-1.5 rounded-full bg-red-500 blink shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
          <span className="text-[9px] font-bold text-white font-mono tracking-widest">{camera.id}</span>
        </div>
      </div>

      <div className="absolute top-3 right-3">
        <div className="bg-cyan-500/20 backdrop-blur-sm border border-cyan-500/30 rounded p-1">
          <Monitor size={10} className="text-cyan-400" />
        </div>
      </div>

      {/* Scan line effect */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
        <div
          className="w-full h-[2px] bg-cyan-500/50"
          style={{
            boxShadow: '0 0 15px 2px rgba(6,182,212,0.8)',
            transform: `translateY(${(frameCount * 1.5) % 200}%)`,
            transition: 'transform 0.1s linear'
          }}
        ></div>
      </div>
    </div>
  );
};

const PPEBreakdownChart: React.FC<{ data: PPEViolation[] }> = ({ data }) => {
  return (
    <div className="p-3 border border-white/10 rounded-sm flex flex-col h-full" style={{ background: '#0c1628' }}>
      <div className="flex items-center gap-2 mb-3">
        <HardHat className="w-3 h-3 text-cyan-400" />
        <h3 className="text-[10px] font-mono text-slate-300 uppercase tracking-widest">PPE Violation Breakdown</h3>
      </div>
      <div className="flex-1 min-h-[160px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: -10, right: 10, top: 0, bottom: 0 }}>
            <XAxis type="number" hide />
            <YAxis
              dataKey="type"
              type="category"
              tick={{ fill: '#4a7aaa', fontSize: 9, fontFamily: 'Share Tech Mono' }}
              axisLine={{ stroke: '#1a3a7a' }}
              tickLine={false}
              width={70}
            />
            <Tooltip
              cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              contentStyle={{ background: '#080f1e', border: '1px solid #1a3a7a', borderRadius: '2px', padding: '4px 8px' }}
              itemStyle={{ fontSize: '10px', color: '#d0e8ff', fontFamily: 'Share Tech Mono' }}
              labelStyle={{ display: 'none' }}
            />
            <Bar dataKey="count" radius={[0, 2, 2, 0]} barSize={12}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const ViolationTrendChart: React.FC<{ data: TimeSeriesPoint[] }> = ({ data }) => {
  return (
    <div className="p-3 border border-white/10 rounded-sm flex flex-col h-full" style={{ background: '#0c1628' }}>
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-3 h-3 text-red-500" />
        <h3 className="text-[10px] font-mono text-slate-300 uppercase tracking-widest">Violation Frequency (24H)</h3>
      </div>
      <div className="flex-1 min-h-[120px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorViolations" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00b8ff" stopOpacity={0.1} />
                <stop offset="95%" stopColor="#00b8ff" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#112244" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="time"
              tick={{ fill: '#4a7aaa', fontSize: 9, fontFamily: 'Share Tech Mono' }}
              axisLine={{ stroke: '#1a3a7a' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#4a7aaa', fontSize: 9, fontFamily: 'Share Tech Mono' }}
              axisLine={{ stroke: '#1a3a7a' }}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{ background: '#080f1e', border: '1px solid #1a3a7a', borderRadius: '2px', padding: '4px 8px' }}
              itemStyle={{ fontSize: '10px', color: '#d0e8ff', fontFamily: 'Share Tech Mono' }}
            />
            <Area
              type="monotone"
              dataKey="violations"
              stroke="#00b8ff"
              fillOpacity={0.06}
              fill="#00b8ff"
              strokeWidth={2}
              dot={{ r: 2, fill: '#00b8ff', strokeWidth: 0 }}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const ComplianceTrendChart: React.FC<{ data: TimeSeriesPoint[] }> = ({ data }) => {
  return (
    <div className="p-3 border border-white/10 rounded-sm flex flex-col h-full" style={{ background: '#0c1628' }}>
      <div className="flex items-center gap-2 mb-3">
        <CheckCircle className="w-3 h-3 text-green-400" />
        <h3 className="text-[10px] font-mono text-slate-300 uppercase tracking-widest">Compliance Rating</h3>
      </div>
      <div className="flex-1 min-h-[120px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid stroke="#112244" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="time"
              tick={{ fill: '#4a7aaa', fontSize: 9, fontFamily: 'Share Tech Mono' }}
              axisLine={{ stroke: '#1a3a7a' }}
              tickLine={false}
            />
            <YAxis
              domain={[75, 100]}
              tickFormatter={v => `${v}%`}
              tick={{ fill: '#4a7aaa', fontSize: 9, fontFamily: 'Share Tech Mono' }}
              axisLine={{ stroke: '#1a3a7a' }}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{ background: '#080f1e', border: '1px solid #1a3a7a', borderRadius: '2px', padding: '4px 8px' }}
              itemStyle={{ fontSize: '10px', color: '#d0e8ff', fontFamily: 'Share Tech Mono' }}
            />
            <Line
              type="monotone"
              dataKey="compliance"
              stroke="#00e676"
              strokeWidth={2}
              dot={{ r: 2, fill: '#00e676', strokeWidth: 0 }}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const ZoneHeatmap: React.FC<{ zones: ZoneCell[] }> = ({ zones }) => {
  const getLevelColor = (level: ZoneCell['level']) => {
    switch (level) {
      case 'high': return 'rgba(255, 23, 68, 0.4)';
      case 'medium': return 'rgba(255, 171, 0, 0.3)';
      case 'low': return 'rgba(0, 184, 255, 0.2)';
      case 'clear': return 'rgba(0, 230, 118, 0.15)';
      default: return 'transparent';
    }
  };

  const getBorderColor = (level: ZoneCell['level']) => {
    switch (level) {
      case 'high': return 'border-red-500/50';
      case 'medium': return 'border-amber-500/50';
      case 'low': return 'border-cyan-500/50';
      case 'clear': return 'border-green-500/50';
      default: return 'border-white/5';
    }
  };

  return (
    <div className="p-3 border border-white/10 rounded-sm flex flex-col h-full" style={{ background: '#0c1628' }}>
      <div className="flex items-center gap-2 mb-3">
        <Activity className="w-3 h-3 text-amber-400" />
        <h3 className="text-[10px] font-mono text-slate-300 uppercase tracking-widest">Zone Risk Analysis</h3>
      </div>
      <div className="grid grid-cols-4 grid-rows-3 gap-1 flex-1">
        {zones.map(zone => (
          <div
            key={zone.id}
            title={`${zone.name}: ${zone.violations} violations`}
            className={`relative group cursor-help border ${getBorderColor(zone.level)} rounded-sm transition-all duration-300 hover:brightness-125`}
            style={{ background: getLevelColor(zone.level) }}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[7px] font-mono text-white/40 uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">
                {zone.name}
              </span>
            </div>
            {zone.level === 'high' && (
              <div className="absolute top-0.5 right-0.5 w-1 h-1 rounded-full bg-red-500 pulse-red"></div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-3 flex justify-between items-center text-[7px] font-mono uppercase tracking-widest text-slate-500">
        <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 bg-red-500/40 border border-red-500/50"></div> High Risk</div>
        <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 bg-amber-500/30 border border-amber-500/50"></div> Med Risk</div>
        <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 bg-cyan-500/20 border border-cyan-500/50"></div> Low Risk</div>
        <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 bg-green-500/10 border border-green-500/50"></div> Secure</div>
      </div>
    </div>
  );
};

const AlertLog: React.FC<{ alerts: Alert[] }> = ({ alerts }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [alerts]);

  return (
    <div className="border border-white/5 rounded-xl flex flex-col overflow-hidden shadow-2xl h-full" style={{ background: 'linear-gradient(180deg, #0c1628 0%, #080f1e 100%)' }}>
      <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/2 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-red-500/10 rounded-lg border border-red-500/20">
            <Bell className="w-4 h-4 text-red-400" />
          </div>
          <h3 className="text-xs font-bold text-slate-100 uppercase tracking-widest font-rajdhani">Live Violation Log</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-bold font-mono text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">{alerts.length} EVENTS</span>
          <button className="p-1 text-slate-500 hover:text-white transition-colors">
            <Settings size={14} />
          </button>
        </div>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar">
        {alerts.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-2">
            <ShieldCheck size={32} className="opacity-20" />
            <span className="text-[10px] font-bold uppercase tracking-widest font-mono">No Active Violations</span>
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 border-b border-white/5 last:border-0 hover:bg-white/[0.03] transition-all duration-300 relative group ${alert.isNew ? 'slide-in-right bg-cyan-500/5' : ''}`}
            >
              <div className="flex items-start gap-4">
                <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 shadow-[0_0_8px_currentColor] ${alert.severity === 'critical' ? 'text-red-500 bg-red-500 animate-pulse' : 'text-amber-500 bg-amber-500'}`}></div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-bold font-mono px-2 py-0.5 rounded-sm border uppercase ${alert.severity === 'critical' ? 'text-red-400 bg-red-500/10 border-red-500/20' : 'text-amber-400 bg-amber-500/10 border-amber-500/20'}`}>
                        {alert.camera}
                      </span>
                      <span className="text-[8px] font-mono text-slate-500 font-bold uppercase">{alert.severity}</span>
                    </div>
                    <span className="text-[9px] font-mono text-slate-500 tabular-nums">
                      {alert.timestamp.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-200 font-semibold leading-relaxed group-hover:text-white transition-colors truncate">{alert.message}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const SystemStatus: React.FC<{ metrics: SystemMetric[] }> = ({ metrics }) => {
  return (
    <div className="p-3 border border-white/10 rounded-sm flex flex-col h-full" style={{ background: '#0c1628' }}>
      <div className="flex items-center gap-2 mb-4">
        <Cpu className="w-3 h-3 text-slate-400" />
        <h3 className="text-[10px] font-mono text-slate-300 uppercase tracking-widest">System Health Matrix</h3>
      </div>
      <div className="space-y-4">
        {metrics.map((metric, idx) => (
          <div key={idx}>
            <div className="flex justify-between items-end mb-1">
              <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${metric.status === 'online' ? 'bg-green-500' : 'bg-amber-500 blink'}`}></div>
                <span className="text-[9px] font-mono text-slate-400 uppercase tracking-tighter">{metric.label}</span>
              </div>
              <span className="text-[10px] font-mono text-white font-bold">{metric.value}{metric.unit}</span>
            </div>
            {metric.showBar && (
              <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-[800ms] ease ${metric.value > 80 ? 'bg-red-500' : metric.value > 60 ? 'bg-amber-500' : 'bg-cyan-500'}`}
                  style={{ width: `${metric.value}%` }}
                ></div>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-auto pt-4 flex justify-between border-t border-white/5">
        <div className="text-center px-2">
          <div className="text-[8px] font-mono text-slate-500">NETWORK</div>
          <div className="text-[10px] font-mono text-green-400">ENCRYPTED</div>
        </div>
        <div className="text-center px-2">
          <div className="text-[8px] font-mono text-slate-500">KERNEL</div>
          <div className="text-[10px] font-mono text-white">v4.12.0-LTS</div>
        </div>
        <div className="text-center px-2">
          <div className="text-[8px] font-mono text-slate-500">UPTIME</div>
          <div className="text-[10px] font-mono text-white">284:12:05</div>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════
// MAIN DASHBOARD COMPONENT
// ═══════════════════════════════════════════

const SafetyDashboard: React.FC = () => {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [frameCount, setFrameCount] = useState<number>(0);
  const [cameras, setCameras] = useState<Camera[]>(INITIAL_CAMERAS);
  const [alerts, setAlerts] = useState<Alert[]>(INITIAL_ALERTS);
  const [ppeData, setPpeData] = useState<PPEViolation[]>(INITIAL_PPE);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesPoint[]>(INITIAL_TIMESERIES);
  const [zones, setZones] = useState<ZoneCell[]>(INITIAL_ZONES);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetric[]>(INITIAL_METRICS);
  const [stats, setStats] = useState({
    workers: 128,
    compliance: 92,
    violations: 34,
    activeAlerts: 5,
    camsOnline: 16,
    camsTotal: 18
  });

  const animFrameRef = useRef<number>(0);

  // Initialize Fonts and Global Styles
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Exo+2:wght@400;500;700&family=Rajdhani:wght@500;600;700&family=Share+Tech+Mono&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    const style = document.createElement('style');
    style.innerHTML = `
      body {
        margin: 0;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        background-color: #0a0b10;
        overflow-x: hidden;
      }
      @keyframes blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.15; }
      }
      @keyframes slideInRight {
        from { transform: translateX(24px); opacity: 0; }
        to   { transform: translateX(0);    opacity: 1; }
      }
      @keyframes pulseRed {
        0%, 100% { box-shadow: 0 0 0 0 rgba(244,63,94,0.4); }
        50%       { box-shadow: 0 0 0 8px rgba(244,63,94,0); }
      }
      .blink { animation: blink 2s infinite ease-in-out; }
      .slide-in-right { animation: slideInRight 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
      .pulse-red { animation: pulseRed 2s infinite; }
      .custom-scrollbar::-webkit-scrollbar { width: 6px; }
      .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.01); }
      .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
      .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(99,102,241,0.2); }
      
      .recharts-cartesian-grid-horizontal line, 
      .recharts-cartesian-grid-vertical line {
        stroke: rgba(255,255,255,0.03);
      }
      .recharts-default-tooltip {
        background-color: rgba(10, 11, 16, 0.95) !important;
        border: 1px solid rgba(255, 255, 255, 0.05) !important;
        backdrop-filter: blur(12px) !important;
        border-radius: 12px !important;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.7) !important;
        padding: 12px !important;
      }
      /* Industrial Texture Overlay */
      .industrial-texture::after {
        content: "";
        position: absolute;
        inset: 0;
        background-image: radial-gradient(rgba(255,255,255,0.03) 1px, transparent 0);
        background-size: 24px 24px;
        pointer-events: none;
        z-index: 0;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(link);
      document.head.removeChild(style);
    };
  }, []);

  // 1. Clock — every 1000ms
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 2. Canvas animation — requestAnimationFrame loop
  useEffect(() => {
    const animate = () => {
      setFrameCount(f => f + 1);
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, []);

  // 3. Data Simulation — every 3000ms
  useEffect(() => {
    const timer = setInterval(() => {
      setSystemMetrics(prev => prev.map(m => {
        if (!m.showBar) return m;
        const delta = (Math.random() - 0.5) * 8;
        return { ...m, value: Math.min(95, Math.max(40, Math.round(m.value + delta))) };
      }));

      setStats(prev => ({
        ...prev,
        workers: 120 + Math.floor(Math.random() * 15),
        compliance: 88 + Math.floor(Math.random() * 8),
      }));

      setPpeData(prev => prev.map(p => ({
        ...p,
        count: Math.max(1, p.count + Math.floor((Math.random() - 0.4) * 3))
      })));

      setTimeSeriesData(prev => {
        const last = prev[prev.length - 1];
        const newPoint: TimeSeriesPoint = {
          time: 'Now',
          violations: Math.max(0, last.violations + Math.floor((Math.random() - 0.3) * 4)),
          compliance: Math.min(100, Math.max(80, last.compliance + Math.floor((Math.random() - 0.4) * 3)))
        };
        return [...prev.slice(1), newPoint];
      });
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  // 4. Worker violations toggle — every 4000ms
  useEffect(() => {
    const timer = setInterval(() => {
      setCameras(prev => prev.map(cam => ({
        ...cam,
        workers: cam.workers.map(w => {
          if (Math.random() < 0.12) {
            const violations = ['No Helmet', 'No Vest', 'No Gloves', 'No Goggles'];
            const newCompliant = !w.compliant;
            return {
              ...w,
              compliant: newCompliant,
              violation: newCompliant ? null : violations[Math.floor(Math.random() * violations.length)]
            };
          }
          return w;
        })
      })));

      setZones(prev => prev.map(z => {
        if (Math.random() < 0.4) {
          const levels: ZoneCell['level'][] = ['high', 'medium', 'low', 'clear'];
          const weights = [0.2, 0.35, 0.3, 0.15];
          const r = Math.random();
          let cumulative = 0;
          let level = z.level;
          for (let i = 0; i < weights.length; i++) {
            cumulative += weights[i];
            if (r < cumulative) { level = levels[i]; break; }
          }
          return { ...z, level };
        }
        return z;
      }));
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  // 5. New alerts — every 8000ms
  useEffect(() => {
    const timer = setInterval(() => {
      const pool = ALERT_MESSAGE_POOL;
      const pick = pool[Math.floor(Math.random() * pool.length)];
      const newAlert: Alert = {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        camera: pick.camera,
        message: pick.message,
        severity: pick.severity,
        isNew: true
      };

      setAlerts(prev => [newAlert, ...prev].slice(0, 15));

      setStats(prev => ({
        ...prev,
        violations: prev.violations + (pick.severity === 'critical' ? 1 : 0),
        activeAlerts: Math.min(prev.activeAlerts + 1, 12)
      }));

      setTimeout(() => {
        setAlerts(prev => prev.map(a =>
          a.id === newAlert.id ? { ...a, isNew: false } : a
        ));
      }, 2000);
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen text-slate-300 selection:bg-indigo-500/30 font-['Inter'] relative overflow-x-hidden industrial-texture" style={{ background: '#0a0b10' }}>
      {/* Background Decorative Elements */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none opacity-30 overflow-hidden z-0">
        <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/10 blur-[140px]"></div>
        <div className="absolute bottom-[-15%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-700/10 blur-[140px]"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-25 mix-blend-soft-light"></div>
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        <DashboardHeader time={currentTime} />

        <main className="flex-1 p-4 md:p-8 space-y-8 max-w-[1700px] mx-auto w-full">
          {/* Main Title Section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-l-4 border-indigo-500/60 pl-8 py-2 bg-white/2 rounded-r-2xl pr-6 backdrop-blur-sm">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Monitor className="w-3 h-3 text-indigo-400" />
                <span className="text-[10px] font-bold text-indigo-400/80 uppercase tracking-[0.3em] font-mono">Operations Control</span>
              </div>
              <h2 className="text-3xl font-bold text-white font-rajdhani tracking-widest uppercase leading-tight">Sentinel Command Hub</h2>
              <p className="text-[11px] text-slate-500 font-mono tracking-widest uppercase mt-2 flex items-center gap-3">
                <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div> Protocol Alpha-9</span>
                <span className="text-white/10">|</span>
                <span className="text-slate-400 italic">Central Warehouse Cluster A-4</span>
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-end mr-2">
                <div className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Authorized Personnel</div>
                <div className="flex -space-x-2 mt-2">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="w-9 h-9 rounded-full border-2 border-[#0a0b10] bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400 overflow-hidden shadow-xl ring-1 ring-white/5">
                      <img src={`https://i.pravatar.cc/64?img=${i + 15}`} alt="user" className="opacity-80 hover:opacity-100 transition-opacity" />
                    </div>
                  ))}
                  <div className="w-9 h-9 rounded-full border-2 border-[#0a0b10] bg-indigo-950 flex items-center justify-center text-[10px] font-bold text-indigo-400 shadow-xl ring-1 ring-white/5">+14</div>
                </div>
              </div>
              <button className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl text-[11px] font-bold uppercase tracking-[0.2em] transition-all flex items-center gap-3 shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] hover:-translate-y-0.5 active:translate-y-0">
                <Zap size={16} />
                Generate Audit
              </button>
            </div>
          </div>

          {/* Stat row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            <StatCard
              label="Asset Count"
              value={stats.workers}
              subtext="Real-time occupancy"
              accentColor="cyan"
              icon={Users}
            />
            <StatCard
              label="Safety Integrity"
              value={`${stats.compliance}%`}
              subtext="Aggregated confidence"
              accentColor="green"
              icon={ShieldCheck}
            />
            <StatCard
              label="Breach Alerts"
              value={stats.violations}
              subtext="Unresolved incidents"
              accentColor="red"
              icon={AlertTriangle}
            />
            <StatCard
              label="Telemetry Anomaly"
              value={stats.activeAlerts}
              subtext="System flags (24H)"
              accentColor="amber"
              icon={Activity}
            />
            <StatCard
              label="Node Status"
              value={`${stats.camsOnline}/${stats.camsTotal}`}
              subtext="Optical array health"
              accentColor="cyan"
              icon={CameraIcon}
            />
          </div>

          {/* Visual Feeds Grid */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-[2px] bg-indigo-500/50"></div>
                <h3 className="text-[12px] font-bold uppercase tracking-[0.4em] font-mono text-slate-400">Live Surveillance Stream</h3>
              </div>
              <div className="text-[10px] font-bold font-mono text-slate-500 uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full">
                Encrypted Feed // AES-256
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {cameras.map(cam => (
                <CCTVFeed key={cam.id} camera={cam} frameCount={frameCount} />
              ))}
            </div>
          </div>

          {/* Data & Log Section */}
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.6fr] gap-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-fit">
              <div className="bg-[#12141c]/60 border border-white/5 rounded-2xl p-2 shadow-2xl backdrop-blur-sm">
                <PPEBreakdownChart data={ppeData} />
              </div>
              <div className="bg-[#12141c]/60 border border-white/5 rounded-2xl p-2 shadow-2xl backdrop-blur-sm">
                <ZoneHeatmap zones={zones} />
              </div>
              <div className="bg-[#12141c]/60 border border-white/5 rounded-2xl p-2 shadow-2xl backdrop-blur-sm col-span-1 md:col-span-2">
                <ViolationTrendChart data={timeSeriesData} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[1.6fr_1fr] gap-8 h-[550px]">
              <AlertLog alerts={alerts} />
              <div className="flex flex-col gap-8">
                <SystemStatus metrics={systemMetrics} />
                <div className="flex-1 bg-gradient-to-br from-indigo-900/10 to-blue-900/10 border border-indigo-500/20 rounded-2xl p-6 flex flex-col justify-center items-center text-center gap-4 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 shadow-inner">
                    <ShieldCheck className="text-indigo-400" size={32} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white uppercase tracking-widest font-rajdhani mb-2">Protocol Enforcement</h4>
                    <p className="text-[10px] text-slate-500 max-w-[180px] leading-relaxed">System is currently operating under <span className="text-indigo-400 font-bold italic">Level-4</span> security autonomous protocols.</p>
                  </div>
                  <button className="text-[10px] font-bold text-white uppercase tracking-[0.2em] bg-indigo-500/20 border border-indigo-500/40 px-6 py-2 rounded-xl hover:bg-indigo-500 hover:text-white transition-all shadow-lg">System Override</button>
                </div>
              </div>
            </div>
          </div>

          {/* Compliance History (Wide) */}
          <div className="bg-[#12141c]/60 border border-white/5 rounded-2xl p-2 shadow-2xl backdrop-blur-sm">
            <ComplianceTrendChart data={timeSeriesData} />
          </div>
        </main>

        <footer className="px-10 py-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] font-mono text-slate-500 uppercase tracking-[0.2em]">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="font-bold text-emerald-400/80">Network Status: Secured</span>
            </div>
            <div className="w-px h-4 bg-white/10"></div>
            <span>Core: v8.4.2-ENT</span>
          </div>
          <div className="text-slate-600">© 2024 SENTINEL-X SAFETY OS // DEEP-MIND MONITORING</div>
          <div className="flex gap-8">
            <span className="hover:text-indigo-400 cursor-pointer transition-colors border-b border-transparent hover:border-indigo-400">Security Policy</span>
            <span className="hover:text-indigo-400 cursor-pointer transition-colors border-b border-transparent hover:border-indigo-400">System API</span>
            <span className="hover:text-indigo-400 cursor-pointer transition-colors border-b border-transparent hover:border-indigo-400 text-rose-500/70">Emergency Link</span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default SafetyDashboard;
