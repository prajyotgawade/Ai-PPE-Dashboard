import React, { useState, useEffect } from 'react';
import { Users, AlertTriangle, Camera as CameraIcon, ShieldAlert, CheckCircle, ClipboardList, Cpu } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts';

const GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600&family=Inter:wght@400;500;600;700&family=JetBrains+Mono&display=swap');

  :root {
    --bg-dark: #060b14;
    --panel-bg: rgba(16, 34, 64, 0.6);
    --panel-border: rgba(96, 165, 250, 0.4);
    --panel-glow: rgba(96, 165, 250, 0.15);
    --primary-blue: #60a5fa;
    --primary-blue-dim: rgba(96, 165, 250, 0.2);
    --success-green: #34d399;
    --danger-red: #f87171;
    --warning-amber: #fbbf24;
  }

  body, html, #root {
    margin: 0; padding: 0; width: 100vw; height: 100vh; overflow: hidden;
    background: radial-gradient(circle at 50% 0%, #0f1c35 0%, var(--bg-dark) 100%);
    font-family: 'Inter', sans-serif;
    color: #fff;
  }

  .dashboard-container {
    display: flex; flex-direction: column; width: 100vw; height: 100vh; padding: 16px 24px; box-sizing: border-box; gap: 16px;
  }

  .panel {
    background: var(--panel-bg);
    backdrop-filter: blur(12px);
    border: 1px solid var(--panel-border);
    border-radius: 10px;
    box-shadow: 0 4px 20px var(--panel-glow);
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .panel-header {
    padding: 8px 14px;
    font-size: 13px;
    font-weight: 500;
    color: #fff;
    border-bottom: 1px solid rgba(255,255,255,0.1);
  }

  .metric-label { font-size: 11px; font-weight: 500; color: #cbd5e1; margin-bottom: 2px; }
  .metric-value { font-size: 28px; font-weight: 700; line-height: 1; color: #fff; }
  
  .icon-box { width: 44px; height: 44px; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
  .icon-box.blue { background: rgba(96,165,250,0.2); color: #60a5fa; }
  .icon-box.green { background: rgba(52,211,153,0.2); color: #34d399; }
  .icon-box.red { background: rgba(248,113,113,0.2); color: #f87171; }

  .cam-badge { background: #60a5fa; color: #000; font-weight: 700; font-size: 12px; padding: 2px 10px; border-radius: 12px; display: inline-block; }
  
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 2px; }

  @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
  .animate-blink { animation: blink 1s infinite; }

  /* Heatmap zones */
  .zone { position: absolute; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 600; border-radius: 4px; color: rgba(255,255,255,0.9); }
  .zone.red { background: rgba(248,113,113,0.7); box-shadow: 0 0 10px rgba(248,113,113,0.4); }
  .zone.orange { background: rgba(251,191,36,0.7); box-shadow: 0 0 10px rgba(251,191,36,0.4); }
  .zone.green { background: rgba(52,211,153,0.7); box-shadow: 0 0 10px rgba(52,211,153,0.4); }
`;

// Types
type ViolationData = { name: string; count: number; fill: string };
type TimeSeriesData = { time: string; violations: number; compliance: number };
type Alert = { id: number; time: string; message: string; cam: string };

const AISafetyDashboard: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  // State
  const [showDemoPopup, setShowDemoPopup] = useState(false);
  const [workers, setWorkers] = useState(128);
  const [compliance, setCompliance] = useState(92);
  const [violations, setViolations] = useState(34);
  const [activeAlerts, setActiveAlerts] = useState(5);
  const [cpuUsage, setCpuUsage] = useState(68);

  const [timeSeries] = useState<TimeSeriesData[]>(() => {
    const initial: TimeSeriesData[] = [];
    const times = ['8 AM', '9 AM', '12 PM', '2 PM', '4 PM', '6 PM', '8 PM'];
    times.forEach((t) => {
      initial.push({
        time: t,
        violations: Math.floor(Math.random() * 12) + 2,
        compliance: parseFloat((90 + Math.random() * 9.5).toFixed(4))
      });
    });
    return initial;
  });

  const alerts: Alert[] = [
    { id: 1, time: '11:28:14 AM', message: 'No Safety Helmet Detected', cam: 'Cam 01' },
    { id: 2, time: '11:15:32 AM', message: 'Missing High-Visibility Vest', cam: 'Cam 03' },
    { id: 3, time: '10:42:05 AM', message: 'CRITICAL: Video Feed Signal Lost', cam: 'Cam 02' },
    { id: 4, time: '09:12:44 AM', message: 'Safety Gloves Missing', cam: 'Cam 01' },
    { id: 5, time: '08:55:10 AM', message: 'WARNING: Connection Timeout Error', cam: 'Cam 04' },
  ];

  // Effects
  useEffect(() => {
    const clockInterval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(clockInterval);
  }, []);

  useEffect(() => {
    const dataInterval = setInterval(() => {
      setWorkers(Math.floor(Math.random() * (135 - 115 + 1) + 115));
      setCompliance(Math.floor(Math.random() * (98 - 90 + 1) + 90));
      setViolations(Math.floor(Math.random() * (42 - 28 + 1) + 28));
      setActiveAlerts(Math.floor(Math.random() * (8 - 3 + 1) + 3));
      setCpuUsage(Math.floor(Math.random() * (85 - 60 + 1) + 60));
    }, 2500);
    return () => clearInterval(dataInterval);
  }, []);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const ppeData: ViolationData[] = [
    { name: 'No Helmet', count: 14, fill: 'var(--primary-blue)' },
    { name: 'No Vest', count: 8, fill: 'var(--primary-blue)' },
    { name: 'No Mask', count: 5, fill: 'var(--primary-blue)' },
    { name: 'No Boots', count: 2, fill: 'var(--primary-blue)' }
  ];

  return (
    <>
      <style>{GLOBAL_STYLES}</style>

      <div className="dashboard-container">
        {/* ROW 1: HEADER (50px) */}
        <div className="flex items-center justify-between px-2" style={{ height: '50px' }}>
          <div className="flex items-center gap-4">
            <div className="relative flex items-center justify-center w-14 h-14 shrink-0 mr-1">
              <img src="/logo.png" alt="Company Logo" className="w-full h-full object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]" />
            </div>
            <div className="flex flex-col ml-3">
              <h1 className="font-['Cinzel'] text-[28px] font-bold tracking-wider m-0 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-500 drop-shadow-[0_0_8px_rgba(56,189,248,0.3)] uppercase">
                Swash Nonionics Private Limited
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-5">
            <div className="w-px h-10 bg-white/20"></div>
            <div className="flex flex-col items-end justify-center">
              <span className="text-[22px] font-['Cinzel'] tracking-wider text-white leading-none">{formatDate(currentTime)}</span>
              <span className="text-[13px] font-['Cinzel'] tracking-[0.15em] text-[#60a5fa] font-bold leading-none mt-1.5">{formatTime(currentTime)}</span>
            </div>
          </div>
        </div>

        {/* ROW 2: KPI METRICS (75px) */}
        <div className="flex gap-3" style={{ height: '75px' }}>
          <MetricCard title="Total Workers Detected" value={workers} icon={<Users size={16} />} colorClass="blue" />
          <MetricCard title="PPE Compliance" value={`${compliance}%`} icon={<CheckCircle size={16} />} colorClass="green" />
          <MetricCard title="Violations Today" value={violations} icon={<ClipboardList size={16} />} colorClass="red" />
          <MetricCard title="Active Alerts" value={activeAlerts} icon={<AlertTriangle size={16} />} colorClass="red" />
          <MetricCard title="Cameras Online" value="16 / 18" icon={<CameraIcon size={16} />} colorClass="green" />
        </div>

        {/* ROW 3: CAMERA FEEDS (200px) */}
        <div className="flex gap-3" style={{ height: '200px' }}>
          <CameraFeed onClick={() => setShowDemoPopup(true)} id="Cam 01" imgSrc="/cam1-new.png" hasDetection={true} />
          <CameraFeed onClick={() => setShowDemoPopup(true)} id="Cam 02" bg="#0a1120" hasDetection={false} offline={true} />
          <CameraFeed onClick={() => setShowDemoPopup(true)} id="Cam 03" imgSrc="/cam3-new.png" hasDetection={true} />
          <CameraFeed onClick={() => setShowDemoPopup(true)} id="Cam 04" bg="#0a1120" hasDetection={false} offline={true} />
        </div>

        {/* ROW 4: CHARTS */}
        <div className="flex gap-3 flex-1 min-h-0">
          {/* PPE Breakdown */}
          <div className="panel flex-1 min-w-0">
            <div className="panel-header">PPE Violations Breakdown</div>
            <div className="flex-1 p-3 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ppeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#cbd5e1', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#cbd5e1', fontSize: 11 }} />
                  <RechartsTooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: 'var(--panel-bg)', borderColor: 'var(--panel-border)', borderRadius: '8px' }} />
                  <Bar dataKey="count" fill="var(--primary-blue)" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Violations Over Time */}
          <div className="panel flex-1 min-w-0">
            <div className="panel-header">Violations Over Time</div>
            <div className="flex-1 p-3 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorVio" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary-blue)" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="var(--primary-blue)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#cbd5e1', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#cbd5e1', fontSize: 11 }} />
                  <RechartsTooltip contentStyle={{ backgroundColor: 'var(--panel-bg)', borderColor: 'var(--panel-border)', borderRadius: '8px' }} />
                  <Area type="monotone" dataKey="violations" stroke="var(--primary-blue)" strokeWidth={3} fillOpacity={1} fill="url(#colorVio)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Zone Violation Heatmap */}
          <div className="panel flex-[0.8] min-w-0">
            <div className="panel-header">Zone Violation Heatmap</div>
            <div className="flex-1 p-4 relative min-h-0 bg-[#2f3b52]/50 m-2 rounded-lg border border-white/10 overflow-hidden">
              <div className="absolute inset-2">
                <div className="zone red" style={{ top: '5%', left: '5%', width: '25%', height: '40%' }}>Loading Area</div>
                <div className="zone red" style={{ top: '50%', left: '5%', width: '25%', height: '40%' }}>Loading Area</div>

                <div className="zone orange" style={{ top: '15%', left: '35%', width: '20%', height: '25%' }}>Zones</div>
                <div className="zone orange" style={{ top: '45%', left: '35%', width: '20%', height: '15%' }}>Zones</div>

                <div className="zone green" style={{ top: '5%', left: '60%', width: '35%', height: '40%' }}>Warehouse</div>
                <div className="zone green" style={{ top: '50%', left: '60%', width: '35%', height: '40%' }}>Warehouse</div>
              </div>
            </div>
          </div>
        </div>

        {/* ROW 5: BOTTOM PANELS */}
        <div className="flex gap-3 flex-1 min-h-0">
          {/* Compliance Trend */}
          <div className="panel flex-1 min-w-0">
            <div className="panel-header">Compliance Trend</div>
            <div className="flex-1 p-2 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#cbd5e1', fontSize: 11 }} />
                  <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#cbd5e1', fontSize: 11 }} />
                  <RechartsTooltip formatter={(value: number) => [value.toFixed(4) + '%', 'Compliance']} contentStyle={{ backgroundColor: 'var(--panel-bg)', borderColor: 'var(--panel-border)', borderRadius: '8px' }} />
                  <Line type="monotone" dataKey="compliance" stroke="var(--primary-blue)" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Alerts & Incidents */}
          <div className="panel flex-1 min-w-0">
            <div className="panel-header">Alerts & Incidents</div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 text-[12px] flex flex-col gap-3 font-['Inter'] min-h-0 text-[#e2e8f0]">
              {alerts.map((a) => (
                <div key={a.id} className="flex items-center justify-between hover:bg-white/5 p-1 rounded transition-colors">
                  <span className="w-24">{a.time}</span>
                  <span className="flex-1 px-4">{a.message}</span>
                  <span className="w-20 text-right">{a.cam}</span>
                </div>
              ))}
            </div>
          </div>

          {/* System Status */}
          <div className="panel flex-[0.8] min-w-0">
            <div className="panel-header">System Status</div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-4 text-[13px] min-h-0 text-[#e2e8f0]">
              <div className="flex justify-between items-center border-b border-white/10 pb-2">
                <span>Cameras Online</span>
                <span className="text-[var(--success-green)] font-semibold">(16/18)</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/10 pb-2">
                <span>AI Processing</span>
                <span className="text-[var(--success-green)] font-semibold">(Active)</span>
              </div>
              <div className="flex justify-between items-center">
                <span>CPU Usage</span>
                <span className="text-[var(--success-green)] font-semibold">({cpuUsage}%)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Privacy Restriction Popup */}
      {showDemoPopup && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0f1c35] p-6 max-w-md w-full mx-4 flex flex-col gap-4 border border-red-500/50 rounded-xl shadow-[0_0_30px_rgba(239,68,68,0.2)]">
            <div className="flex items-center gap-3 text-red-400 border-b border-white/10 pb-3">
              <ShieldAlert size={24} />
              <h2 className="font-['Cinzel'] text-xl tracking-wider uppercase m-0 font-bold">Privacy Restriction</h2>
            </div>
            <div className="text-[14px] text-gray-300 leading-relaxed font-['Inter']">
              <p className="mb-2 text-red-400 font-semibold uppercase tracking-wider text-[12px]">Restricted Access</p>
              <p>Direct camera feed viewing is currently restricted in accordance with corporate privacy and security protocols.</p>
              <p className="mt-2 text-[12px] text-gray-400 border-l-2 border-red-500/50 pl-3">All video streams are encrypted and processed automatically by the AI engine. Manual viewing requires elevated authorization.</p>
            </div>
            <div className="flex justify-end mt-2">
              <button
                onClick={() => setShowDemoPopup(false)}
                className="text-[12px] font-bold uppercase tracking-wider px-5 py-2.5 bg-red-500/20 text-red-300 border border-red-500/50 rounded hover:bg-red-500/30 transition-colors cursor-pointer"
              >
                Acknowledge
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Subcomponents
const MetricCard = ({ title, value, icon, colorClass }: { title: string, value: string | number, icon: React.ReactNode, colorClass: 'blue' | 'green' | 'red' }) => (
  <div className="panel flex-1 flex flex-col items-center justify-center py-1 px-1 gap-0 text-center">
    <div className={`icon-box ${colorClass} mb-0.5 w-6 h-6`}>
      {icon}
    </div>
    <span className="metric-label leading-tight text-[10px]">{title}</span>
    <span className="metric-value text-[18px]">{value}</span>
  </div>
);

const CameraFeed = ({ id, bg, imgSrc, onClick, hasDetection, offline }: { id: string, bg?: string, imgSrc?: string, onClick?: () => void, hasDetection: boolean, offline?: boolean }) => (
  <div onClick={onClick} className={`panel flex-1 relative overflow-hidden ${onClick ? 'cursor-pointer hover:brightness-110 transition-all' : ''}`} style={{ background: imgSrc ? `url(${imgSrc}) center/cover no-repeat` : bg }}>

    {/* Simulated detections for bg cameras */}
    {!imgSrc && hasDetection && !offline && (
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-24 h-32 border-2 border-[var(--success-green)] relative shadow-[0_0_10px_var(--success-green)]"></div>
      </div>
    )}

    {/* Offline State */}
    {offline && (
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none bg-black/40 backdrop-blur-[2px]">
        <AlertTriangle className="text-gray-500 mb-2 w-8 h-8 opacity-80" />
        <span className="font-['Cinzel'] text-gray-400 font-bold tracking-widest text-[14px]">CONNECTION LOST</span>
        <span className="text-gray-500 text-[10px] uppercase tracking-wider mt-1 font-mono">Awaiting Signal...</span>
      </div>
    )}

    {/* Top HUD */}
    <div className="absolute top-3 left-3 right-3 flex justify-between items-start pointer-events-none">
      <div className={`cam-badge ${offline ? 'bg-gray-700 text-gray-400' : ''}`}>{id}</div>
      <div className="flex items-center gap-2">
        <span className={`text-[10px] font-bold tracking-widest ${offline ? 'text-gray-700' : 'text-white/70'}`}>REC</span>
        <span className={`w-2 h-2 rounded-full ${offline ? 'bg-gray-700' : 'bg-red-500 animate-blink shadow-[0_0_8px_red]'}`}></span>
      </div>
    </div>
  </div>
);

export default AISafetyDashboard;
