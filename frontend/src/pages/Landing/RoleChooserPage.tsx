import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card3D } from '../../components/primitives/Card3D';
import { StatusBadge } from '../../components/domain/StatusBadge';
import { api } from '../../services/api';
import { stateStore } from '../../services/stateStore';
import { CommitmentCircuit } from '../../components/domain/CommitmentCircuit';
import {
  Ambulance,
  Building2,
  Shield,
  HeartHandshake,
  PlayCircle,
  RotateCcw,
  ExternalLink,
  Laptop,
  Smartphone,
  Layers,
  Sparkles,
  Zap,
  Activity,
  ArrowRight,
  Split,
  Timer,
  CheckCircle2,
  AlertTriangle,
  Radio,
} from 'lucide-react';
import clsx from 'clsx';

export const RoleChooserPage: React.FC = () => {
  const navigate = useNavigate();
  const [activePreviewStatus, setActivePreviewStatus] = useState<'pending' | 'accepted' | 'rejected'>('pending');

  // Quick Launch Scenarios
  const launchScenarioA = async () => {
    const caseRes = await api.createCase(
      {
        category: 'cardiac',
        severity: 'red',
        patient_basic_info: { age: 61, sex: 'male', name: 'R. Sharma' },
        vitals_summary: 'Severe chest pain, ST-elevation on 12-lead, SpO2 93%, BP 142/90',
        onset_time: '20 min ago',
        treatment_administered: 'Aspirin 325mg chewable, O2 at 4L/min via cannula',
      },
      { actor_type: 'ambulance', actor_id: 'amb_demo_01' }
    );

    if (caseRes.success) {
      await api.matchCase(caseRes.data.case.id, {
        actor_type: 'ambulance',
        actor_id: 'amb_demo_01',
      });
      navigate(`/ambulance/${caseRes.data.case.id}`);
    }
  };

  const launchScenarioB = async () => {
    const caseRes = await api.createCase(
      {
        category: 'trauma',
        severity: 'red',
        patient_basic_info: { age: 29, sex: 'female', name: 'P. Patel' },
        vitals_summary: 'Blunt thoracic trauma, hypotensive, BP 88/54, Pulse 124 bpm',
        onset_time: '15 min ago',
        treatment_administered: 'C-spine immobilized, 2x large-bore IVs, 1L Normal Saline',
      },
      { actor_type: 'ambulance', actor_id: 'amb_demo_01' }
    );

    if (caseRes.success) {
      await api.matchCase(caseRes.data.case.id, {
        actor_type: 'ambulance',
        actor_id: 'amb_demo_01',
      });
      navigate(`/ambulance/${caseRes.data.case.id}`);
    }
  };

  return (
    <div className="min-h-screen text-[#2D231C] p-4 sm:p-8 md:p-12 font-sans select-none relative z-10 space-y-14">
      <div className="max-w-6xl mx-auto space-y-16">
        {/* HERO SECTION: Clinical, Hospital White & Medical Teal Masterpiece */}
        <div className="text-center max-w-3xl mx-auto space-y-6 pt-6 sm:pt-10 stagger-1">
          {/* Top Status Capsule */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#E8E2D9] text-xs font-mono text-[#2D231C] font-bold shadow-xs">
            <span className="w-2 h-2 rounded-full bg-[#EA580C] animate-pulse" />
            <span className="tracking-wider uppercase">Raahi 2.0 • Active Capability-Routing Engine</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-black tracking-tight leading-[1.08] text-[#2D231C]">
            When Seconds Count,{' '}
            <span className="text-[#EA580C]">
              Passive Numbers
            </span>{' '}
            Cost Lives.
          </h1>

          <p className="text-base sm:text-lg text-[#7D7067] max-w-2xl mx-auto leading-relaxed font-medium">
            Delhi's COVID portal showed available beds while ambulances were refused at the door. Raahi replaces static dashboards with a{' '}
            <b className="text-[#2D231C] font-bold">deterministic capability-match</b> and an{' '}
            <b className="text-[#EA580C] font-bold">active, timed 30s commitment circuit</b>.
          </p>

          {/* Quick Metrics Pills */}
          <div className="pt-1 flex flex-wrap items-center justify-center gap-2 text-xs font-mono">
            <div className="px-3 py-1.5 rounded-full bg-white border border-[#E8E2D9] text-[#2D231C] font-bold flex items-center gap-1.5 shadow-xs">
              <Timer className="w-3.5 h-3.5 text-[#EA580C]" />
              <span>30s Physical Timed Lock</span>
            </div>
            <div className="px-3 py-1.5 rounded-full bg-white border border-[#E8E2D9] text-[#2D231C] font-bold flex items-center gap-1.5 shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-[#52796F]" />
              <span>Deterministic Capability Match</span>
            </div>
            <div className="px-3 py-1.5 rounded-full bg-white border border-[#E8E2D9] text-[#2D231C] font-bold flex items-center gap-1.5 shadow-xs">
              <Radio className="w-3.5 h-3.5 text-[#EA580C]" />
              <span>Multi-Tab Broadcast Sync</span>
            </div>
          </div>

          {/* Primary Action Buttons */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/ambulance"
              className="px-8 py-3.5 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white font-display font-black text-sm tracking-wide shadow-md shadow-[#EA580C]/25 hover:shadow-lg transition-all duration-200 active:scale-95 flex items-center gap-2"
            >
              <span>Launch Ambulance Intake</span>
              <ArrowRight className="w-4 h-4 text-white" />
            </Link>

            <Link
              to="/ambulance/mass-casualty"
              className="px-6 py-3.5 rounded-xl bg-white border border-[#E8E2D9] text-[#2D231C] font-display font-extrabold text-sm hover:bg-[#FAF8F5] transition-all duration-200 shadow-xs active:scale-95 flex items-center gap-2"
            >
              <Split className="w-4 h-4 text-[#EA580C]" />
              <span>Mass-Casualty Incident Protocol</span>
            </Link>
          </div>
        </div>

        {/* INTERACTIVE macOS WINDOW FRAME (Commitment Circuit Sandbox) */}
        <div className="macos-window stagger-2">
          {/* macOS Titlebar with Traffic Lights */}
          <div className="macos-titlebar">
            <div className="macos-traffic-lights">
              <span className="macos-dot macos-dot-close" />
              <span className="macos-dot macos-dot-minimize" />
              <span className="macos-dot macos-dot-expand" />
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#7D7067]">
              <span className="font-extrabold text-[#2D231C]">CommitmentCircuit.app</span>
              <span className="text-[11px] text-[#7D7067] hidden sm:inline">— Interactive Metaphor Sandbox [Section F.3]</span>
            </div>
            {/* macOS Segmented Switcher */}
            <div className="flex items-center gap-1 bg-[#FAF8F5] p-1 rounded-xl border border-[#E8E2D9]">
              {(['pending', 'accepted', 'rejected'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setActivePreviewStatus(st)}
                  className={clsx(
                    'px-3 py-1 rounded-lg text-xs font-mono font-bold capitalize transition-all duration-180',
                    activePreviewStatus === st
                      ? st === 'accepted'
                        ? 'bg-[#52796F] text-white shadow-xs'
                        : st === 'rejected'
                        ? 'bg-[#E11D48] text-white shadow-xs'
                        : 'bg-[#EA580C] text-white shadow-xs'
                      : 'text-[#7D7067] hover:text-[#2D231C] hover:bg-white'
                  )}
                >
                  {st === 'pending' ? 'In Flight' : st === 'accepted' ? 'Committed Lock' : 'Circuit Fracture'}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            <div className="p-6 bg-[#FAF8F5] rounded-2xl border border-[#E8E2D9] shadow-inner">
              <CommitmentCircuit
                from={{ label: 'Unit AMB-04 (Field)' }}
                to={{ label: 'Metro Heart Institute' }}
                status={activePreviewStatus}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono text-[#7D7067]">
              <div className="p-3 rounded-xl bg-white border border-[#E8E2D9] shadow-xs flex items-start gap-2.5">
                <span className="w-2 h-2 rounded-full bg-[#EA580C] mt-1 shrink-0" />
                <div>
                  <b className="text-[#EA580C] block mb-0.5 font-bold">In-Flight:</b> Traveling laser photon indicating active uncommitted candidate negotiation.
                </div>
              </div>
              <div className="p-3 rounded-xl bg-white border border-[#E8E2D9] shadow-xs flex items-start gap-2.5">
                <span className="w-2 h-2 rounded-full bg-[#52796F] mt-1 shrink-0" />
                <div>
                  <b className="text-[#52796F] block mb-0.5 font-bold">Accepted Lock:</b> 180ms solid sweep with physical mechanical clamping caps.
                </div>
              </div>
              <div className="p-3 rounded-xl bg-white border border-[#E8E2D9] shadow-xs flex items-start gap-2.5">
                <span className="w-2 h-2 rounded-full bg-[#E11D48] mt-1 shrink-0" />
                <div>
                  <b className="text-[#E11D48] block mb-0.5 font-bold">Fracture:</b> Mid-span mechanical break and instantaneous auto-healing reroute.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 1-CLICK PITCH EVALUATION SCENARIOS (3D CARDS) */}
        <div className="space-y-4 stagger-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-widest text-[#2D231C] font-extrabold">
              1-Click Pitch Evaluation Scenarios
            </span>
            <span className="text-xs font-mono text-[#EA580C] font-bold">Instant State Machine Seeding</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Scenario A Card */}
            <div onClick={launchScenarioA}>
              <Card3D
                elevation="flat"
                maxTilt={6}
                className="h-full flex flex-col justify-between group cursor-pointer border-[#E8E2D9] hover:border-[#EA580C]/50"
              >
                <div>
                  <div className="flex items-center justify-between text-xs font-mono mb-3">
                    <span className="text-[#354F52] font-bold bg-[#EFF6F3] px-2.5 py-1 rounded-full border border-[#52796F]/40">
                      SCENARIO A
                    </span>
                    <PlayCircle className="w-5 h-5 text-[#7D7067] group-hover:text-[#52796F] transition-colors" />
                  </div>
                  <h3 className="text-lg font-display font-extrabold text-[#2D231C] mb-1.5 group-hover:text-[#52796F] transition-colors">
                    Clean Single Match & Lock
                  </h3>
                  <p className="text-xs text-[#7D7067] font-medium leading-relaxed mb-4">
                    Severe cardiac dispatch matches Metro Heart Institute (Cardiologist on duty, ICU free, 6 min away). Live 30s countdown synced across devices.
                  </p>
                </div>
                <div className="pt-3.5 border-t border-[#E8E2D9] flex items-center justify-between text-xs font-mono text-[#52796F] font-bold">
                  <span>Dispatch Case →</span>
                  <span className="bg-[#EFF6F3] px-2 py-0.5 rounded text-[10px] font-extrabold">30s Timeout</span>
                </div>
              </Card3D>
            </div>

            {/* Scenario B Card */}
            <div onClick={launchScenarioB}>
              <Card3D
                elevation="flat"
                maxTilt={6}
                className="h-full flex flex-col justify-between group cursor-pointer border-[#E8E2D9] hover:border-[#EA580C]/50"
              >
                <div>
                  <div className="flex items-center justify-between text-xs font-mono mb-3">
                    <span className="text-[#B45309] font-bold bg-[#FEF3C7] px-2.5 py-1 rounded-full border border-[#D97706]/40">
                      SCENARIO B
                    </span>
                    <PlayCircle className="w-5 h-5 text-[#7D7067] group-hover:text-[#D97706] transition-colors" />
                  </div>
                  <h3 className="text-lg font-display font-extrabold text-[#2D231C] mb-1.5 group-hover:text-[#E11D48] transition-colors">
                    Circuit Fracture & Auto-Reroute
                  </h3>
                  <p className="text-xs text-[#7D7067] font-medium leading-relaxed mb-4">
                    Trauma request sent to Apex Center. When reception declines or timer expires, circuit fractures and automatically promotes candidate #2 with zero manual restart.
                  </p>
                </div>
                <div className="pt-3.5 border-t border-[#E8E2D9] flex items-center justify-between text-xs font-mono text-[#E11D48] font-bold">
                  <span>Test Reroute →</span>
                  <span className="bg-[#FFE4E6] px-2 py-0.5 rounded text-[10px] font-extrabold">Differentiator Beat</span>
                </div>
              </Card3D>
            </div>

            {/* Scenario C Card */}
            <Link to="/ambulance/mass-casualty">
              <Card3D
                elevation="flat"
                maxTilt={6}
                className="h-full flex flex-col justify-between group cursor-pointer border-[#E8E2D9] hover:border-[#EA580C]/50"
              >
                <div>
                  <div className="flex items-center justify-between text-xs font-mono mb-3">
                    <span className="text-[#C2410C] font-bold bg-[#FFF7ED] px-2.5 py-1 rounded-full border border-[#EA580C]/40">
                      SCENARIO C
                    </span>
                    <PlayCircle className="w-5 h-5 text-[#7D7067] group-hover:text-[#EA580C] transition-colors" />
                  </div>
                  <h3 className="text-lg font-display font-extrabold text-[#2D231C] mb-1.5 group-hover:text-[#EA580C] transition-colors">
                    Mass-Casualty Distribution
                  </h3>
                  <p className="text-xs text-[#7D7067] font-medium leading-relaxed mb-4">
                    Highway collision with 4 simultaneous casualties. Visual convergence on decision node, 250ms hold, and staggered split to 3 facilities + simulated comparison.
                  </p>
                </div>
                <div className="pt-3.5 border-t border-[#E8E2D9] flex items-center justify-between text-xs font-mono text-[#EA580C] font-bold">
                  <span>Open Board →</span>
                  <span className="bg-[#FFF7ED] px-2 py-0.5 rounded text-[10px] font-extrabold">Flagship Demo</span>
                </div>
              </Card3D>
            </Link>
          </div>
        </div>

        {/* FOUR OPERATIONAL POSTURES (3D CRYSTAL CARDS) */}
        <div className="space-y-4 stagger-4">
          <div className="text-xs font-mono uppercase tracking-widest text-[#2D231C] font-extrabold">
            Four Dedicated Operational Postures
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Ambulance */}
            <Link to="/ambulance" className="group">
              <Card3D maxTilt={5} className="h-full flex flex-col justify-between hover:border-[#EA580C]/50">
                <div>
                  <div className="w-11 h-11 rounded-xl bg-[#FFF7ED] border border-[#EA580C]/30 flex items-center justify-center text-[#EA580C] mb-4 shadow-xs group-hover:scale-105 transition-transform">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div className="text-[10px] font-mono uppercase text-[#EA580C] font-bold tracking-wider">
                    Handheld / Mobile
                  </div>
                  <h4 className="text-base font-display font-bold text-[#2D231C] mt-1 mb-2">
                    Ambulance Dispatcher
                  </h4>
                  <p className="text-xs text-[#7D7067] font-medium leading-relaxed mb-4">
                    Ergonomic tap-only intake. No typing on stage. Need profile preview, active circuit, and live readiness radar.
                  </p>
                </div>
                <div className="pt-3 border-t border-[#E8E2D9] flex items-center justify-between text-xs font-mono text-[#7D7067] group-hover:text-[#2D231C] font-bold">
                  <span>/ambulance</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </div>
              </Card3D>
            </Link>

            {/* Hospital Reception */}
            <Link to="/hospital" className="group">
              <Card3D maxTilt={5} className="h-full flex flex-col justify-between hover:border-[#EA580C]/50">
                <div>
                  <div className="w-11 h-11 rounded-xl bg-[#EFF6F3] border border-[#52796F]/40 flex items-center justify-center text-[#52796F] mb-4 shadow-xs group-hover:scale-105 transition-transform">
                    <Laptop className="w-5 h-5" />
                  </div>
                  <div className="text-[10px] font-mono uppercase text-[#52796F] font-bold tracking-wider">
                    3m Projected Display
                  </div>
                  <h4 className="text-base font-display font-bold text-[#2D231C] mt-1 mb-2">
                    Hospital Reception
                  </h4>
                  <p className="text-xs text-[#7D7067] font-medium leading-relaxed mb-4">
                    Calm until alarmed. Projected legible from across the room. Stage 220px ring, alert audio chime, and 72px tactile action triggers.
                  </p>
                </div>
                <div className="pt-3 border-t border-[#E8E2D9] flex items-center justify-between text-xs font-mono text-[#7D7067] group-hover:text-[#2D231C] font-bold">
                  <span>/hospital</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </div>
              </Card3D>
            </Link>

            {/* Admin Oversight */}
            <Link to="/admin" className="group">
              <Card3D maxTilt={5} className="h-full flex flex-col justify-between hover:border-[#EA580C]/50">
                <div>
                  <div className="w-11 h-11 rounded-xl bg-[#FAF8F5] border border-[#D8CFBF] flex items-center justify-center text-[#4A3525] mb-4 shadow-xs group-hover:scale-105 transition-transform">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div className="text-[10px] font-mono uppercase text-[#4A3525] font-bold tracking-wider">
                    Command Cockpit
                  </div>
                  <h4 className="text-base font-display font-bold text-[#2D231C] mt-1 mb-2">
                    Network Authority
                  </h4>
                  <p className="text-xs text-[#7D7067] font-medium leading-relaxed mb-4">
                    Leaflet capability-radiance map, concurrent countdown activity rail, network scorecard, and forensic audit timeline.
                  </p>
                </div>
                <div className="pt-3 border-t border-[#E8E2D9] flex items-center justify-between text-xs font-mono text-[#7D7067] group-hover:text-[#2D231C] font-bold">
                  <span>/admin</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </div>
              </Card3D>
            </Link>

            {/* Family Reassurance */}
            <Link to="/track/demo" className="group">
              <Card3D maxTilt={5} className="h-full flex flex-col justify-between hover:border-[#EA580C]/50">
                <div>
                  <div className="w-11 h-11 rounded-xl bg-[#E0F2FE] border border-[#38BDF8]/40 flex items-center justify-center text-[#0284C7] mb-4 shadow-xs group-hover:scale-105 transition-transform">
                    <HeartHandshake className="w-5 h-5" />
                  </div>
                  <div className="text-[10px] font-mono uppercase text-[#0284C7] font-bold tracking-wider">
                    Reassurance Surface
                  </div>
                  <h4 className="text-base font-display font-bold text-[#2D231C] mt-1 mb-2">
                    Family Live Tracker
                  </h4>
                  <p className="text-xs text-[#7D7067] font-medium leading-relaxed mb-4">
                    Clean white ground. Zero jargon, plain-language reassurance, and ETA confirmation for patient families.
                  </p>
                </div>
                <div className="pt-3 border-t border-[#E8E2D9] flex items-center justify-between text-xs font-mono text-[#7D7067] group-hover:text-[#2D231C] font-bold">
                  <span>/track/:id</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </div>
              </Card3D>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
