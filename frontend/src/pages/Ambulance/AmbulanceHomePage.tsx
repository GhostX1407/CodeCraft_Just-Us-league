import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { CaseCategory, Severity, NeedProfile } from '../../types/domain';
import { deriveNeedProfile, api } from '../../services/api';
import { CATEGORY_LABELS, SEVERITY_CONFIG } from '../../utils/format';
import { NeedProfileChips } from '../../components/domain/NeedProfileChips';
import { Button } from '../../components/primitives/Button';
import { FreshnessBadge } from '../../components/domain/FreshnessBadge';
import { useActiveRequests, useHospitals } from '../../hooks/useSubscriptions';
import {
  Heart,
  Flame,
  Baby,
  Stethoscope,
  Radio,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Plus,
  Users,
  Activity,
  Building2,
  Navigation,
  Sparkles,
  Zap,
} from 'lucide-react';
import clsx from 'clsx';

export const AmbulanceHomePage: React.FC = () => {
  const navigate = useNavigate();
  const { data: activeRequests } = useActiveRequests();
  const { data: hospitals } = useHospitals();

  // Intake Form State (Tap-Only Presets)
  const [category, setCategory] = useState<CaseCategory>('cardiac');
  const [severity, setSeverity] = useState<Severity>('red');
  const [age, setAge] = useState(58);
  const [sex, setSex] = useState<'male' | 'female'>('male');
  const [vitalsPreset, setVitalsPreset] = useState('SpO2 91%, Pulse 118, BP 144/92');
  const [onsetPreset, setOnsetPreset] = useState('20 minutes ago');
  const [treatmentPreset, setTreatmentPreset] = useState('Oxygen initiated, Aspirin given');

  const [step, setStep] = useState<'intake' | 'need_preview' | 'matching'>('intake');
  const [matchingStep, setMatchingStep] = useState<number>(0);

  const derivedNeed = deriveNeedProfile(category);

  // Rapid Intake presets
  const vitalsOptions = [
    'SpO2 91%, Pulse 118, BP 144/92',
    'BP 84/50 (Hypotensive), Pulse 130',
    'SpO2 88%, Respiratory Distress',
    'Stable Vitals, Acute Localized Pain',
  ];

  const handleStartIntake = () => {
    setStep('need_preview');
  };

  const handleExecuteMatch = async () => {
    setStep('matching');
    setMatchingStep(1); // Eligibility gate

    setTimeout(() => setMatchingStep(2), 200); // Capability match
    setTimeout(() => setMatchingStep(3), 400); // Distance & load
    setTimeout(() => setMatchingStep(4), 600); // Freshness factor
    setTimeout(async () => {
      setMatchingStep(5); // Rank

      const caseRes = await api.createCase(
        {
          category,
          severity,
          patient_basic_info: { age, sex },
          vitals_summary: vitalsPreset,
          onset_time: onsetPreset,
          treatment_administered: treatmentPreset,
        },
        { actor_type: 'ambulance', actor_id: 'amb_demo_unit' }
      );

      if (caseRes.success) {
        await api.matchCase(caseRes.data.case.id, {
          actor_type: 'ambulance',
          actor_id: 'amb_demo_unit',
        });
        navigate(`/ambulance/${caseRes.data.case.id}`);
      }
    }, 800);
  };

  return (
    <div className="min-h-[calc(100vh-64px)] text-[#2D231C] p-4 sm:p-8 font-sans select-none relative z-10">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Header & Context */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#E8E2D9]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-[#EA580C] animate-pulse" />
              <span className="font-mono text-xs uppercase tracking-widest text-[#EA580C] font-extrabold">
                Emergency Dispatch & Tactical Routing
              </span>
              <span className="text-xs font-mono text-[#7D7067] font-bold">[Unit AMB-04 • Active]</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-black tracking-tight text-[#2D231C]">
              New Patient Case Intake
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/ambulance/mass-casualty"
              className="px-4 py-2 rounded-xl bg-white border border-[#E8E2D9] text-xs font-mono text-[#7D7067] font-bold hover:text-[#2D231C] hover:bg-[#FAF8F5] flex items-center gap-2 transition-all shadow-xs"
            >
              <Users className="w-4 h-4 text-[#EA580C]" />
              <span>Mass-Casualty Protocol</span>
            </Link>
          </div>
        </div>

        {/* Active In-Progress Case Alert Strip */}
        {activeRequests.length > 0 && (
          <div
            onClick={() => navigate(`/ambulance/${activeRequests[0].case_id}`)}
            className="p-4 bg-[#FFF7ED] border border-[#EA580C]/40 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-[#EFF6F3] transition-all shadow-xs"
          >
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-[#EA580C] animate-pulse" />
              <span className="text-xs font-mono text-[#C2410C] font-bold">
                Emergency Dispatch In Flight: Case {activeRequests[0].case_id}
              </span>
              <span className="text-xs font-mono text-[#7D7067] font-medium hidden sm:inline">
                ({activeRequests[0].reason_shown_to_dispatcher})
              </span>
            </div>
            <span className="text-xs font-mono text-[#C2410C] font-bold flex items-center gap-1.5">
              <span>Resume Active Case</span>
              <ArrowRight className="w-4 h-4" />
            </span>
          </div>
        )}

        {/* 2-Column Responsive Web App Command Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Dispatch Column (7 Cols) */}
          <div className="lg:col-span-7 space-y-6 stagger-1">
            {/* STEP 1: CASE INTAKE (Tap-Only Presets) */}
            {step === 'intake' && (
              <div className="p-6 sm:p-8 rounded-3xl border border-[#E8E2D9] bg-white shadow-sm space-y-6 animate-fade-in">
                <div className="border-b border-[#E8E2D9] pb-4">
                  <h2 className="text-xl sm:text-2xl font-display font-black text-[#2D231C] tracking-tight">
                    What kind of emergency is this?
                  </h2>
                  <p className="text-xs text-[#7D7067] font-mono font-bold mt-1">
                    Select category to automatically load deterministic capability rules
                  </p>
                </div>

                {/* Category 4 3D Curved Tap Tiles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {[
                    { id: 'cardiac', label: 'Cardiac Emergency', sub: 'Cardiologist, ECG, ICU bed', icon: Heart },
                    { id: 'trauma', label: 'Major Trauma', sub: 'Trauma team, ICU bed, Blood O-', icon: Flame },
                    { id: 'obstetric', label: 'Obstetric Critical', sub: 'OB/GYN on call, Maternity unit', icon: Stethoscope },
                    { id: 'pediatric', label: 'Pediatric Emergency', sub: 'Pediatrician on call, PICU', icon: Baby },
                  ].map((c) => {
                    const Icon = c.icon;
                    const isSelected = category === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setCategory(c.id as CaseCategory);
                          if (c.id === 'cardiac' || c.id === 'trauma') setSeverity('red');
                        }}
                        className={clsx(
                          'p-4 rounded-2xl border text-left flex flex-col justify-between transition-all duration-180 min-h-[110px] group relative overflow-hidden',
                          isSelected
                            ? 'border-[#EA580C] bg-[#FFF7ED] ring-1 ring-[#EA580C] shadow-xs'
                            : 'border-[#E8E2D9] bg-[#FAF8F5] hover:bg-white hover:border-[#D8CFBF]'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className={clsx('text-base font-display font-bold transition-colors', isSelected ? 'text-[#C2410C]' : 'text-[#2D231C]')}>
                            {c.label}
                          </span>
                          <Icon className={clsx('w-5 h-5 transition-transform group-hover:scale-105', isSelected ? 'text-[#EA580C]' : 'text-[#7D7067]')} />
                        </div>
                        <span className="text-[11px] font-mono text-[#7D7067] font-semibold leading-tight mt-3">
                          {c.sub}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Urgency Priority Tier with Disclaimer */}
                <div className="space-y-2 pt-3 border-t border-[#E8E2D9]">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[#2D231C] uppercase font-bold">Priority Urgency Tier</span>
                    <span className="text-[11px] text-[#7D7067] font-bold">Derived from Category</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {(['red', 'yellow', 'green'] as Severity[]).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSeverity(s)}
                        className={clsx(
                          'py-2.5 rounded-xl border text-xs font-mono font-bold uppercase transition-all tracking-wider',
                          severity === s
                            ? s === 'red'
                              ? 'border-[#E11D48]/50 bg-[#FFE4E6] text-[#BE123C] ring-1 ring-[#E11D48]'
                              : s === 'yellow'
                              ? 'border-[#D97706]/50 bg-[#FEF3C7] text-[#B45309] ring-1 ring-[#D97706]'
                              : 'border-[#52796F]/60 bg-[#EFF6F3] text-[#354F52] ring-1 ring-[#52796F]'
                            : 'border-[#E8E2D9] bg-white text-[#7D7067] hover:text-[#2D231C]'
                        )}
                      >
                        Priority: {s}
                      </button>
                    ))}
                  </div>
                  <div className="text-[11px] text-[#7D7067] italic font-sans font-medium">
                    Prototype urgency — not a clinical triage category.
                  </div>
                </div>

                {/* Patient Demographics & Live ECG Waveform Bar */}
                <div className="space-y-4 pt-3 border-t border-[#E8E2D9]">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Age Stepper */}
                    <div className="p-4 rounded-2xl border border-[#E8E2D9] bg-[#FAF8F5]">
                      <div className="text-[10px] font-mono uppercase text-[#7D7067] font-bold mb-1.5">
                        Patient Age
                      </div>
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setAge(Math.max(1, age - 5))}
                          className="w-8 h-8 rounded-lg border border-[#E8E2D9] bg-white text-base font-mono font-extrabold text-[#2D231C] hover:bg-[#FAF8F5] active:scale-95 shadow-xs"
                        >
                          -
                        </button>
                        <span className="font-mono text-base font-extrabold text-[#2D231C]">{age} years</span>
                        <button
                          type="button"
                          onClick={() => setAge(Math.min(100, age + 5))}
                          className="w-8 h-8 rounded-lg border border-[#E8E2D9] bg-white text-base font-mono font-extrabold text-[#2D231C] hover:bg-[#FAF8F5] active:scale-95 shadow-xs"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Sex Segmented Control */}
                    <div className="p-4 rounded-2xl border border-[#E8E2D9] bg-[#FAF8F5]">
                      <div className="text-[10px] font-mono uppercase text-[#7D7067] font-bold mb-1.5">
                        Biological Sex
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {(['male', 'female'] as const).map((g) => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => setSex(g)}
                            className={clsx(
                              'py-2 text-xs font-mono capitalize rounded-xl border transition-colors font-bold',
                              sex === g
                                ? 'border-[#EA580C] bg-white text-[#EA580C] shadow-xs'
                                : 'border-[#E8E2D9] bg-white/70 text-[#7D7067] hover:text-[#2D231C]'
                            )}
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Vitals Presets with Live Waveform Icon */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-mono text-[#7D7067] font-bold">
                      <span className="uppercase">Observed Field Vitals (Tap preset)</span>
                      <span className="flex items-center gap-1.5 text-[#52796F]">
                        <Activity className="w-3.5 h-3.5 animate-pulse" />
                        <span>ECG Lead Live</span>
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {vitalsOptions.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setVitalsPreset(opt)}
                          className={clsx(
                            'text-left p-3.5 rounded-xl border text-xs font-mono transition-all font-bold',
                            vitalsPreset === opt
                              ? 'border-[#EA580C] bg-[#FFF7ED] text-[#C2410C] shadow-xs'
                              : 'border-[#E8E2D9] bg-white text-[#7D7067] hover:bg-[#FAF8F5]'
                          )}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Primary CTA */}
                <div className="pt-4 border-t border-[#E8E2D9]">
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={handleStartIntake}
                    className="w-full text-base font-display font-black uppercase tracking-wider btn-tactile"
                  >
                    Review Case Requirements
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 2: NEED PROFILE PREVIEW */}
            {step === 'need_preview' && (
              <div className="p-6 sm:p-8 rounded-3xl border border-[#E8E2D9] bg-white shadow-sm space-y-6 animate-fade-in">
                <div className="border-b border-[#E8E2D9] pb-4">
                  <span className="text-xs font-mono uppercase tracking-wider text-[#EA580C] font-extrabold">
                    Pre-Routing Requirements Confirmation
                  </span>
                  <h2 className="text-2xl font-display font-black text-[#2D231C] tracking-tight mt-1">
                    This case needs:
                  </h2>
                  <p className="text-xs text-[#7D7067] mt-1 leading-relaxed font-medium">
                    Generated from a deterministic rules table — no model, no guesswork.
                  </p>
                </div>

                <div className="p-5 bg-[#FAF8F5] rounded-2xl border border-[#E8E2D9] space-y-4">
                  <div>
                    <div className="text-xs font-mono text-[#2D231C] font-bold uppercase mb-2">
                      Mandatory Clinical Flags & Specialist Coverage:
                    </div>
                    <NeedProfileChips needProfile={derivedNeed} />
                  </div>

                  <div className="pt-3 border-t border-[#E8E2D9] grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono font-bold">
                    <div className="p-3 bg-white rounded-xl border border-[#E8E2D9] shadow-xs">
                      <span className="text-[#7D7067] text-[10px] uppercase">Category</span>
                      <div className="font-extrabold text-[#2D231C] uppercase mt-0.5">{category}</div>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-[#E8E2D9] shadow-xs">
                      <span className="text-[#7D7067] text-[10px] uppercase">Urgency</span>
                      <div className="font-extrabold text-[#E11D48] uppercase mt-0.5">{severity} Priority</div>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-[#E8E2D9] shadow-xs">
                      <span className="text-[#7D7067] text-[10px] uppercase">Demographics</span>
                      <div className="font-extrabold text-[#2D231C] mt-0.5">{age}y, {sex}</div>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-[#E8E2D9] shadow-xs">
                      <span className="text-[#7D7067] text-[10px] uppercase">Location</span>
                      <div className="font-extrabold text-[#52796F] mt-0.5">GPS Fixed</div>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#EFF6F3]/30 border border-[#52796F]/30 text-xs text-[#354F52] font-medium flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-[#52796F] shrink-0 mt-0.5" />
                  <span>
                    Regional network ranking evaluates specialist presence, blood banks, and ER congestion. Only confirmed facilities with capacity will be offered for commitment.
                  </span>
                </div>

                <div className="pt-4 border-t border-[#E8E2D9] flex gap-4">
                  <button
                    type="button"
                    onClick={() => setStep('intake')}
                    className="px-5 py-3 rounded-xl border border-[#E8E2D9] bg-white text-xs font-mono text-[#7D7067] font-bold hover:text-[#2D231C] hover:bg-[#FAF8F5]"
                  >
                    Back to Intake
                  </button>
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={handleExecuteMatch}
                    className="flex-1 text-base font-display font-black uppercase tracking-wider btn-tactile"
                  >
                    Find Best Hospital & Dispatch Request
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 3: MATCHING WORKING STATE */}
            {step === 'matching' && (
              <div className="p-8 sm:p-12 rounded-3xl border border-[#E8E2D9] bg-white shadow-sm space-y-6 text-center animate-fade-in">
                <div className="w-14 h-14 rounded-full border-3 border-[#EA580C] border-t-transparent animate-spin mx-auto" />
                <div>
                  <h3 className="text-2xl font-display font-black text-[#2D231C] tracking-tight">
                    Evaluating Regional Capability & Freshness Matrix…
                  </h3>
                  <p className="text-xs text-[#7D7067] font-medium mt-1.5">
                    Checking which hospitals can actually receive this patient right now.
                  </p>
                </div>

                {/* Illuminated Steps Sequence */}
                <div className="space-y-2 text-xs font-mono text-left max-w-sm mx-auto pt-2">
                  {[
                    { id: 1, label: '1. Eligibility gate check' },
                    { id: 2, label: '2. Specialty & team availability' },
                    { id: 3, label: '3. Distance & urban travel time' },
                    { id: 4, label: '4. ER load & data freshness check' },
                    { id: 5, label: '5. Deterministic ranking resolve' },
                  ].map((s) => (
                    <div
                      key={s.id}
                      className={clsx(
                        'p-3 rounded-xl border transition-colors flex items-center justify-between font-bold',
                        matchingStep >= s.id
                          ? 'border-[#EA580C]/50 bg-[#FFF7ED] text-[#C2410C] shadow-xs'
                          : 'border-[#E8E2D9] bg-[#FAF8F5] text-[#7D7067]'
                      )}
                    >
                      <span>{s.label}</span>
                      {matchingStep >= s.id && <span className="font-extrabold text-[#52796F]">✓</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Live Regional Readiness Radar (5 Cols) */}
          <div className="lg:col-span-5 space-y-4 stagger-2">
            <div className="p-6 rounded-3xl border border-[#E8E2D9] bg-white shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E8E2D9]">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#EA580C]" />
                  <span className="text-xs font-mono uppercase tracking-wider text-[#2D231C] font-black">
                    Regional Facility Readiness Radar
                  </span>
                </div>
                <span className="text-[10px] font-mono text-[#354F52] font-bold flex items-center gap-1.5 bg-[#EFF6F3] px-2.5 py-0.5 rounded-full border border-[#52796F]/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#52796F] animate-pulse" />
                  <span>Telemetry Live</span>
                </span>
              </div>

              <div className="space-y-3">
                {hospitals.map((hosp) => (
                  <div
                    key={hosp.id}
                    className="p-4 bg-[#FAF8F5] rounded-2xl border border-[#E8E2D9] space-y-2.5 hover:border-[#EA580C]/40 transition-all hover:bg-white shadow-xs"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-sm font-display font-bold text-[#2D231C]">{hosp.name}</div>
                        <div className="text-[10px] font-mono text-[#7D7067] font-bold">
                          Trauma: {hosp.trauma_team_on_shift ? 'ACTIVE SHIFT' : 'STANDBY'} • ER Congestion: {hosp.er_load_score}/5
                        </div>
                      </div>
                      <FreshnessBadge lastUpdatedAt={hosp.last_updated_at} showSentenceOnUnknown={false} />
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs font-mono pt-1">
                      <div className="bg-white p-2.5 rounded-xl text-center border border-[#E8E2D9] shadow-xs">
                        <span className="text-[9px] text-[#7D7067] font-bold block">ICU FREE</span>
                        <span className="font-extrabold text-[#2D231C]">{hosp.icu_beds_free}</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl text-center border border-[#E8E2D9] shadow-xs">
                        <span className="text-[9px] text-[#7D7067] font-bold block">VENTILATORS</span>
                        <span className="font-extrabold text-[#2D231C]">{hosp.ventilators_free}</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl text-center border border-[#E8E2D9] shadow-xs">
                        <span className="text-[9px] text-[#7D7067] font-bold block">RELIABILITY</span>
                        <span className="font-extrabold text-[#52796F]">
                          {hosp.reliability_score !== null ? `${Math.round(hosp.reliability_score * 100)}%` : 'New'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 text-[11px] font-mono text-[#7D7067] font-semibold leading-relaxed">
                Hospital profiles dynamically decay from <code className="text-[#52796F] font-bold">fresh</code> (&lt;10m) to <code className="text-[#D97706] font-bold">stale</code> (10-30m) to <code className="text-[#7D7067] font-bold">unknown</code> (&gt;30m).
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
