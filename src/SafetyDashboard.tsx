import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, 
  Activity, 
  AlertTriangle, 
  Users, 
  Camera as CameraIcon, 
  CheckCircle, 
  Info,
  HardHat,
  Cpu
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
      { id:'W1', x:0.15, y:0.52, compliant:true,  violation:null,        jitterSeed:0.0 },
      { id:'W2', x:0.35, y:0.47, compliant:false, violation:'No Helmet', jitterSeed:1.1 },
      { id:'W3', x:0.58, y:0.54, compliant:true,  violation:null,        jitterSeed:2.2 },
      { id:'W4', x:0.78, y:0.49, compliant:true,  violation:null,        jitterSeed:3.3 },
    ]
  },
  {
    id: 'CAM02',
    label: 'CAM 02',
    location: 'Warehouse Zone B',
    bgColor: '#0a0f1a',
    floorColor: '#101828',
    workers: [
      { id:'W1', x:0.22, y:0.50, compliant:true, violation:null, jitterSeed:0.5 },
      { id:'W2', x:0.52, y:0.46, compliant:true, violation:null, jitterSeed:1.6 },
      { id:'W3', x:0.76, y:0.54, compliant:true, violation:null, jitterSeed:2.7 },
    ]
  },
  {
    id: 'CAM03',
    label: 'CAM 03',
    location: 'Assembly Floor',
    bgColor: '#1a0f0a',
    floorColor: '#281810',
    workers: [
      { id:'W1', x:0.10, y:0.46, compliant:true,  violation:null,      jitterSeed:0.2 },
      { id:'W2', x:0.25, y:0.54, compliant:true,  violation:null,      jitterSeed:1.3 },
      { id:'W3', x:0.42, y:0.49, compliant:false, violation:'No Vest', jitterSeed:2.4 },
      { id:'W4', x:0.58, y:0.52, compliant:true,  violation:null,      jitterSeed:3.5 },
      { id:'W5', x:0.72, y:0.47, compliant:true,  violation:null,      jitterSeed:4.6 },
      { id:'W6', x:0.87, y:0.53, compliant:true,  violation:null,      jitterSeed:5.7 },
    ]
  },
  {
    id: 'CAM04',
    label: 'CAM 04',
    location: 'Exit Gate C',
    bgColor: '#0f0a1a',
    floorColor: '#181028',
    workers: [
      { id:'W1', x:0.32, y:0.50, compliant:true, violation:null, jitterSeed:0.8 },
      { id:'W2', x:0.68, y:0.50, compliant:true, violation:null, jitterSeed:1.9 },
    ]
  },
];

const INITIAL_TIMESERIES: TimeSeriesPoint[] = [
  { time: '8AM',  violations: 12, compliance: 88 },
  { time: '9AM',  violations: 18, compliance: 85 },
  { time: '10AM', violations: 14, compliance: 87 },
  { time: '11AM', violations: 22, compliance: 90 },
  { time: '12PM', violations: 28, compliance: 86 },
  { time: '1PM',  violations: 19, compliance: 91 },
  { time: '2PM',  violations: 24, compliance: 89 },
  { time: '3PM',  violations: 30, compliance: 88 },
  { time: '4PM',  violations: 26, compliance: 92 },
  { time: '5PM',  violations: 34, compliance: 90 },
  { time: '6PM',  violations: 38, compliance: 91 },
  { time: '7PM',  violations: 32, compliance: 93 },
  { time: 'Now',  violations: 34, compliance: 92 },
];

const INITIAL_PPE: PPEViolation[] = [
  { type:'No Helmet',  count:18, color:'#ff1744' },
  { type:'No Vest',    count:9,  color:'#ffab00' },
  { type:'No Gloves',  count:6,  color:'#ffab00' },
  { type:'No Boots',   count:3,  color:'#00b8ff' },
  { type:'No Goggles', count:2,  color:'#00b8ff' },
];

const INITIAL_ZONES: ZoneCell[] = [
  { id: '1', name: 'Loading A', level: 'high', violations: 12 },
  { id: '2', name: 'Loading B', level: 'medium', violations: 8 },
  { id: '3', name: 'WH-C',      level: 'low', violations: 3 },
  { id: '4', name: 'Office',    level: 'clear', violations: 0 },
  { id: '5', name: 'Load Bay',  level: 'medium', violations: 7 },
  { id: '6', name: 'Central',   level: 'high', violations: 15 },
  { id: '7', name: 'Zone B',    level: 'low', violations: 2 },
  { id: '8', name: 'WH-D',      level: 'medium', violations: 6 },
  { id: '9', name: 'Exit A',    level: 'clear', violations: 0 },
  { id: '10', name: 'Assembly', level: 'high', violations: 22 },
  { id: '11', name: 'Storage',  level: 'medium', violations: 5 },
  { id: '12', name: 'WH-E',     level: 'low', violations: 4 },
];

const INITIAL_METRICS: SystemMetric[] = [
  { label: 'AI Compute Load', value: 68, unit: '%', status: 'online', showBar: true },
  { label: 'Network Latency', value: 12, unit: 'ms', status: 'online', showBar: false },
  { label: 'Sensor Integrity', value: 99, unit: '%', status: 'online', showBar: true },
  { label: 'Buffer Usage',    value: 42, unit: '%', status: 'warning', showBar: true },
];

const ALERT_MESSAGE_POOL = [
  { camera:'CAM 01', message:'No helmet detected — Worker near Loading Bay',     severity:'critical' as const },
  { camera:'CAM 03', message:'Safety vest missing — Assembly station',           severity:'critical' as const },
  { camera:'CAM 02', message:'No gloves detected — Warehouse picker',            severity:'warning'  as const },
  { camera:'CAM 04', message:'Safety boots absent — Exit checkpoint',            severity:'warning'  as const },
  { camera:'CAM 01', message:'Multiple workers without helmets — Bay A',         severity:'critical' as const },
  { camera:'CAM 03', message:'Eye protection missing — Grinding operation',      severity:'warning'  as const },
  { camera:'CAM 02', message:'High-vis vest absent — Forklift zone',            severity:'critical' as const },
  { camera:'CAM 04', message:'No helmet — Worker entering restricted area',      severity:'critical' as const },
  { camera:'CAM 01', message:'Gloves not worn — Chemical handling zone',         severity:'warning'  as const },
  { camera:'CAM 03', message:'Hard hat missing — Scaffolding area',             severity:'critical' as const },
  { camera:'CAM 02', message:'No safety vest — Near moving machinery',           severity:'critical' as const },
  { camera:'CAM 04', message:'Full PPE violation — Multiple items missing',      severity:'critical' as const },
];

const INITIAL_ALERTS: Alert[] = [
  { id: '1', timestamp: new Date(Date.now() - 30 * 60000), camera: 'CAM 01', message: 'No helmet detected — Worker near Loading Bay', severity: 'critical', isNew: false },
  { id: '2', timestamp: new Date(Date.now() - 25 * 60000), camera: 'CAM 03', message: 'Safety vest missing — Assembly station', severity: 'critical', isNew: false },
  { id: '3', timestamp: new Date(Date.now() - 15 * 60000), camera: 'CAM 02', message: 'No gloves detected — Warehouse picker', severity: 'warning', isNew: false },
  { id: '4', timestamp: new Date(Date.now() - 10 * 60000), camera: 'CAM 04', message: 'Safety boots absent — Exit checkpoint', severity: 'warning', isNew: false },
  { id: '5', timestamp: new Date(Date.now() - 5 * 60000),  camera: 'CAM 01', message: 'Multiple workers without helmets — Bay A', severity: 'critical', isNew: false },
];

// ═══════════════════════════════════════════
// CHILD COMPONENTS
// ═══════════════════════════════════════════

const DashboardHeader: React.FC<{ time: Date }> = ({ time }) => {
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-white/10" style={{ background: '#080f1e' }}>
      <div className="flex items-center gap-4">
        <div className="p-2 bg-cyan-500/20 rounded-lg border border-cyan-500/50">
          <Shield className="w-6 h-6 text-cyan-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white uppercase font-rajdhani">AI Safety Compliance Dashboard</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="flex h-2 w-2 rounded-full bg-red-500 blink"></span>
            <span className="text-[10px] font-mono text-red-500 uppercase tracking-widest">Live System Monitoring</span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-8 font-mono">
        <div className="text-right">
          <div className="text-xs text-slate-500 uppercase tracking-tighter">Current Session</div>
          <div className="text-sm text-cyan-400 font-bold">{time.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}</div>
        </div>
        <div className="text-right min-w-[100px]">
          <div className="text-xs text-slate-500 uppercase tracking-tighter">System Time</div>
          <div className="text-xl text-white font-bold tabular-nums">
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
  const colors = {
    cyan: 'border-cyan-500 text-cyan-400',
    green: 'border-green-500 text-green-400',
    red: 'border-red-500 text-red-500',
    amber: 'border-amber-500 text-amber-400'
  };

  return (
    <div className={`relative overflow-hidden border-t-2 rounded-sm p-4 transition-all duration-500`} style={{ background: '#0c1628' }}>
      <div className={`absolute top-0 left-0 w-full h-[2px] ${colors[accentColor].split(' ')[0]}`}></div>
      <div className="relative z-10">
        <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1">{label}</div>
        <div className="text-3xl font-bold text-white font-rajdhani transition-all duration-300">{value}</div>
        <div className="text-[10px] text-slate-400 mt-1 font-medium">{subtext}</div>
      </div>
      <Icon className={`absolute right-[-10px] bottom-[-10px] w-16 h-16 opacity-5 ${colors[accentColor].split(' ')[1]}`} />
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
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 0.5;
      for (let i = 0; i <= 8; i++) {
        const x = (W / 8) * i;
        ctx.beginPath(); ctx.moveTo(x, H * 0.45); ctx.lineTo(x, H); ctx.stroke();
      }
      for (let i = 0; i <= 4; i++) {
        const y = H * 0.45 + (H * 0.55 / 4) * i;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }

      // 4. Background objects
      ctx.fillStyle = 'rgba(80,100,130,0.25)';
      ctx.fillRect(W*0.04, H*0.22, W*0.14, H*0.25);
      ctx.fillRect(W*0.60, H*0.20, W*0.16, H*0.28);
      ctx.fillStyle = 'rgba(60,80,110,0.18)';
      ctx.fillRect(W*0.82, H*0.28, W*0.12, H*0.18);

      // 5. Workers
      camera.workers.forEach((worker) => {
        const t = frameCount * 0.04;
        const jitterX = Math.sin(t + worker.jitterSeed) * 2.5;
        const jitterY = Math.cos(t * 0.7 + worker.jitterSeed) * 1.5;
        const wx = worker.x * W + jitterX;
        const wy = worker.y * H + jitterY;

        const bodyW = W * 0.055;
        const bodyH = H * 0.26;
        const headR = bodyW * 0.32;

        // Legs
        ctx.fillStyle = '#37474f';
        ctx.fillRect(wx - bodyW*0.22, wy, bodyW*0.18, bodyH*0.42);
        ctx.fillRect(wx + bodyW*0.04, wy, bodyW*0.18, bodyH*0.42);

        // Body
        ctx.fillStyle = worker.compliant ? '#e65100' : '#b71c1c';
        ctx.fillRect(wx - bodyW*0.3, wy - bodyH*0.52, bodyW*0.6, bodyH*0.55);

        // Vest stripe
        if (worker.compliant) {
          ctx.strokeStyle = '#ffeb3b';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(wx - bodyW*0.3, wy - bodyH*0.28);
          ctx.lineTo(wx + bodyW*0.3, wy - bodyH*0.28);
          ctx.stroke();
        }

        // Head
        ctx.beginPath();
        ctx.arc(wx, wy - bodyH*0.52 - headR, headR, 0, Math.PI * 2);
        ctx.fillStyle = '#ffb74d';
        ctx.fill();

        // Helmet
        if (worker.compliant) {
          ctx.beginPath();
          ctx.ellipse(wx, wy - bodyH*0.52 - headR*1.6, headR*1.3, headR*0.55, 0, Math.PI, 0);
          ctx.fillStyle = '#ffd600';
          ctx.fill();
        }

        // Bounding box
        const pad = 5;
        const bx = wx - bodyW*0.5 - pad;
        const by = wy - bodyH*0.78 - headR*2 - pad;
        const bw = bodyW + pad*2;
        const bh = bodyH*1.25 + headR*2 + pad*2;

        ctx.strokeStyle = worker.compliant ? '#00e676' : '#ff1744';
        ctx.lineWidth = 1.5;
        if (!worker.compliant) {
          ctx.setLineDash([4, 3]);
        } else {
          ctx.setLineDash([]);
        }
        ctx.strokeRect(bx, by, bw, bh);
        ctx.setLineDash([]);

        // ID label
        ctx.fillStyle = worker.compliant ? '#00e676' : '#ff1744';
        ctx.font = `bold ${Math.max(8, W * 0.022)}px 'Share Tech Mono', monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(worker.id, wx, by - 4);

        // Violation label
        if (!worker.compliant && worker.violation) {
          ctx.fillStyle = '#ff1744';
          ctx.font = `${Math.max(7, W * 0.018)}px 'Share Tech Mono', monospace`;
          ctx.fillText(`! ${worker.violation}`, wx, by - 15);
        }
        ctx.textAlign = 'left';
      });

      // 6. Scan line
      const scanY = ((frameCount * 2) % H);
      const scanGrad = ctx.createLinearGradient(0, scanY - 6, 0, scanY + 6);
      scanGrad.addColorStop(0, 'transparent');
      scanGrad.addColorStop(0.5, 'rgba(0,184,255,0.15)');
      scanGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = scanGrad;
      ctx.fillRect(0, scanY - 6, W, 12);

      // 7. HUD overlays
      const now = new Date();
      const ts = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
      ctx.fillStyle = 'rgba(0,184,255,0.75)';
      ctx.font = `${Math.max(8, W*0.022)}px 'Share Tech Mono', monospace`;
      ctx.fillText(ts, W*0.02, H*0.95);

      ctx.fillStyle = 'rgba(74,122,170,0.6)';
      ctx.font = `${Math.max(7, W*0.018)}px 'Share Tech Mono', monospace`;
      ctx.fillText('30FPS | AI:ON', W*0.45, H*0.95);
    };

    draw();
    return () => resizeObserver.disconnect();
  }, [frameCount, camera]);

  return (
    <div ref={containerRef} className="relative group overflow-hidden border border-white/5 rounded-sm h-[180px]">
      <canvas ref={canvasRef} className="w-full h-full" />
      <div className="absolute top-0 left-0 w-full p-2 bg-gradient-to-b from-black/60 to-transparent flex justify-between items-start">
        <div>
          <div className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-widest leading-none">{camera.id}</div>
          <div className="text-[9px] font-mono text-slate-300 uppercase opacity-70">{camera.location}</div>
        </div>
        <div className="flex items-center gap-1.5 bg-black/40 px-1.5 py-0.5 rounded-sm border border-white/10">
          <div className="w-1.5 h-1.5 rounded-full bg-red-500 blink"></div>
          <span className="text-[8px] font-mono text-white font-bold uppercase tracking-tighter">REC</span>
        </div>
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
                <stop offset="5%" stopColor="#00b8ff" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#00b8ff" stopOpacity={0}/>
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
    <div className="border border-white/10 rounded-sm flex flex-col overflow-hidden" style={{ background: '#0c1628', height: '100%' }}>
      <div className="p-3 border-b border-white/5 flex justify-between items-center bg-black/20">
        <div className="flex items-center gap-2">
          <Info className="w-3 h-3 text-cyan-400" />
          <h3 className="text-[10px] font-mono text-slate-300 uppercase tracking-widest">Real-time Safety Events</h3>
        </div>
        <div className="text-[8px] font-mono text-slate-500">{alerts.length} LOGGED</div>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar">
        {alerts.length === 0 ? (
          <div className="h-full flex items-center justify-center text-[10px] font-mono text-slate-600">NO RECENT ALERTS</div>
        ) : (
          alerts.map((alert) => (
            <div 
              key={alert.id} 
              className={`p-2.5 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors ${alert.isNew ? 'slide-in-right bg-cyan-500/10' : ''}`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${alert.severity === 'critical' ? 'bg-red-500 pulse-red' : 'bg-amber-500'}`}></div>
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-0.5">
                    <span className="text-[9px] font-bold font-mono text-cyan-400 bg-cyan-500/10 px-1 rounded-sm border border-cyan-500/20">{alert.camera}</span>
                    <span className="text-[8px] font-mono text-slate-500">
                      {alert.timestamp.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-200 font-medium leading-tight">{alert.message}</p>
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
    link.href = 'https://fonts.googleapis.com/css2?family=Exo+2:wght@400;500;700&family=Rajdhani:wght@500;600;700&family=Share+Tech+Mono&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.15; }
      }
      @keyframes slideInRight {
        from { transform: translateX(24px); opacity: 0; }
        to   { transform: translateX(0);    opacity: 1; }
      }
      @keyframes pulseRed {
        0%, 100% { box-shadow: 0 0 0 0 rgba(255,23,68,0.4); }
        50%       { box-shadow: 0 0 0 6px rgba(255,23,68,0); }
      }
      .blink { animation: blink 1s infinite; }
      .slide-in-right { animation: slideInRight 0.3s ease; }
      .pulse-red { animation: pulseRed 1.5s infinite; }
      .custom-scrollbar::-webkit-scrollbar { width: 3px; }
      .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); }
      .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,184,255,0.2); border-radius: 10px; }
      .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0,184,255,0.4); }
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
          violations: Math.max(0, last.violations + Math.floor((Math.random()-0.3)*4)),
          compliance: Math.min(100, Math.max(80, last.compliance + Math.floor((Math.random()-0.4)*3)))
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
            const violations = ['No Helmet','No Vest','No Gloves','No Goggles'];
            const newCompliant = !w.compliant;
            return {
              ...w,
              compliant: newCompliant,
              violation: newCompliant ? null : violations[Math.floor(Math.random()*violations.length)]
            };
          }
          return w;
        })
      })));
      
      setZones(prev => prev.map(z => {
        if (Math.random() < 0.4) {
          const levels: ZoneCell['level'][] = ['high','medium','low','clear'];
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
    <div className="min-h-screen text-slate-200 selection:bg-cyan-500/30 font-['Exo_2']" style={{ background: '#04080f' }}>
      <DashboardHeader time={currentTime} />
      
      <main className="p-3 space-y-2">
        {/* Stat row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2">
          <StatCard 
            label="Total Personnel" 
            value={stats.workers} 
            subtext="Across all monitored zones" 
            accentColor="cyan" 
            icon={Users} 
          />
          <StatCard 
            label="Compliance Rate" 
            value={`${stats.compliance}%`} 
            subtext="+1.2% from last hour" 
            accentColor="green" 
            icon={CheckCircle} 
          />
          <StatCard 
            label="Active Violations" 
            value={stats.violations} 
            subtext="Immediate action required" 
            accentColor="red" 
            icon={AlertTriangle} 
          />
          <StatCard 
            label="Critical Alerts" 
            value={stats.activeAlerts} 
            subtext="Unresolved safety events" 
            accentColor="amber" 
            icon={Activity} 
          />
          <StatCard 
            label="Camera Status" 
            value={`${stats.camsOnline}/${stats.camsTotal}`} 
            subtext="System nodes operational" 
            accentColor="cyan" 
            icon={CameraIcon} 
          />
        </div>

        {/* Camera row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
          {cameras.map(cam => (
            <CCTVFeed key={cam.id} camera={cam} frameCount={frameCount} />
          ))}
        </div>

        {/* Analytics row */}
        <div className="grid grid-cols-1 lg:grid-cols-[3fr_4fr_3fr] gap-2">
          <PPEBreakdownChart data={ppeData} />
          <ViolationTrendChart data={timeSeriesData} />
          <ZoneHeatmap zones={zones} />
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-1 lg:grid-cols-[3fr_4fr_3fr] gap-2">
          <ComplianceTrendChart data={timeSeriesData} />
          <AlertLog alerts={alerts} />
          <SystemStatus metrics={systemMetrics} />
        </div>
      </main>

      <footer className="px-6 py-2 border-t border-white/5 flex justify-between items-center text-[8px] font-mono text-slate-600 uppercase tracking-[0.2em]">
        <div>© 2024 SAFETY-CORE OS // DEEP-MIND MONITORING DIVISION</div>
        <div className="flex gap-4">
          <span>TERMINAL: AS-749-X</span>
          <span>SECURE-TUNNEL: ESTABLISHED</span>
          <span className="text-cyan-900">ENCRYPTED-BY-DEFAULT</span>
        </div>
      </footer>
    </div>
  );
};

export default SafetyDashboard;
