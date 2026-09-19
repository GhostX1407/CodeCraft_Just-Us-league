import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { CaseCategory, Severity, NeedProfile, PatientVitals, PatientSymptoms, SeveritySuggestion } from '../../types/domain';
import { deriveNeedProfile, api } from '../../services/api';
import { CATEGORY_LABELS, SEVERITY_CONFIG } from '../../utils/format';
import { NeedProfileChips } from '../../components/domain/NeedProfileChips';
import { Button } from '../../components/primitives/Button';
import { useActiveRequests, useHospitals } from '../../hooks/useSubscriptions';
import {
  Heart,
  Flame,
  Baby,
  Stethoscope,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Users,
  Activity,
  Zap,
  Sparkles,
  Layers,
  Thermometer,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import clsx from 'clsx';

export const AmbulanceHomePage: React.FC = () => {
  const navigate = useNavigate();
  const { data: activeRequests } = useActiveRequests();
  const { data: hospitals } = useHospitals();

  // Intake Form State
  const [category, setCategory] = useState<CaseCategory>('cardiac');
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>('');
  const [subcategory, setSubcategory] = useState<string>('heart_attack');
  const [severity, setSeverity] = useState<Severity>('red');
  const [age, setAge] = useState(58);
  const [sex, setSex] = useState<'male' | 'female'>('male');

  // Manual Quantitative Vitals (Feature 7)
  const [vitals, setVitals] = useState<PatientVitals>({
    heart_rate: 118,
    blood_pressure_sys: 144,
    blood_pressure_dia: 92,
    spo2: 91,
    respiratory_rate: 22,
    temperature: 37.1,
    gcs_score: 15,
  });

  // Clinical Symptoms (Feature 7)
  const [symptoms, setSymptoms] = useState<PatientSymptoms>({
    chest_pain: true,
    breathing_difficulty: true,
    unconscious: false,
    bleeding: false,
    altered_mental_status: false,
  });

  // Severity Assistance (Feature 9)
  const [assistance, setAssistance] = useState<SeveritySuggestion | null>(null);
  const [dynamicNeedProfile, setDynamicNeedProfile] = useState<any>(null);

  const [step, setStep] = useState<'intake' | 'need_preview' | 'matching'>('intake');
  const [matchingStep, setMatchingStep] = useState<number>(0);

  // Subcategory mapping dictionary (Feature 6)
  const subcategoryMap: Record<string, { id: string; label: string; defaultCap: string[] }[]> = {
    cardiac: [
      { id: 'heart_attack', label: 'Acute STEMI / MI', defaultCap: ['cath_lab', 'cardiac_icu'] },
      { id: 'cardiac_arrest', label: 'Post-Arrest Resuscitation', defaultCap: ['cardiac_icu', 'ventilator'] },
      { id: 'chest_pain', label: 'Unstable Angina', defaultCap: ['ecg', 'cardiology'] },
    ],
    trauma: [
      { id: 'road_accident', label: 'Polytrauma / Road Accident', defaultCap: ['trauma_center', 'orthopedist'] },
      { id: 'industrial_accident', label: 'Industrial Machinery Crush', defaultCap: ['trauma_center', 'general_surgeon'] },
      { id: 'crush_injury', label: 'Crush Injury Entrapment', defaultCap: ['trauma_center', 'icu'] },
    ],
    neurological: [
      { id: 'stroke', label: 'Acute Ischemic Stroke (tPA window)', defaultCap: ['stroke_pathway', 'ct_scan'] },
      { id: 'seizure', label: 'Status Epilepticus', defaultCap: ['neurologist', 'icu'] },
      { id: 'head_injury', label: 'Traumatic Brain Injury', defaultCap: ['neurosurgeon', 'icu'] },
    ],
    respiratory: [
      { id: 'respiratory_failure', label: 'Acute ARDS / Failure', defaultCap: ['respiratory_icu', 'ventilator'] },
      { id: 'asthma_copd', label: 'Severe Acute Asthma', defaultCap: ['respiratory_icu'] },
    ],
    pediatric: [
      { id: 'child_emergency', label: 'Pediatric Status Distress', defaultCap: ['pediatric_emergency'] },
      { id: 'neonatal', label: 'Neonatal Critical Asphyxia', defaultCap: ['neonatal_icu'] },
    ],
    obstetric: [
      { id: 'pregnancy_emergency', label: 'Pre-Eclampsia / Obstructed Labor', defaultCap: ['maternity'] },
    ],
  };

  // Re-assess severity assistance deterministically on vital or symptom change
  useEffect(() => {
    let active = true;
    api
      .assessVitals({
        category,
        severity,
        subcategory,
        vitals,
        symptoms,
      })
      .then((res) => {
        if (active && res.severity_assistance) {
          setAssistance(res.severity_assistance);
          setDynamicNeedProfile(res.need_profile);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [category, subcategory, vitals, symptoms]);

  const handleAdoptSeverity = () => {
    if (assistance?.suggested_severity) {
      setSeverity(assistance.suggested_severity);
    }
  };

  const handleVitalChange = (key: keyof PatientVitals, val: number | null) => {
    setVitals((prev) => ({ ...prev, [key]: val }));
  };

  const toggleSymptom = (key: keyof PatientSymptoms) => {
    setSymptoms((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleStartIntake = () => {
    setStep('need_preview');
  };

  const handleExecuteMatch = async () => {
    setStep('matching');
    setMatchingStep(1);

    setTimeout(() => setMatchingStep(2), 200);
    setTimeout(() => setMatchingStep(3), 400);
    setTimeout(() => setMatchingStep(4), 600);
    setTimeout(async () => {
      setMatchingStep(5);

      const vitalsText = `HR: ${vitals.heart_rate || '--'}, BP: ${vitals.blood_pressure_sys || '--'}/${vitals.blood_pressure_dia || '--'}, SpO2: ${vitals.spo2 || '--'}%, GCS: ${vitals.gcs_score || '--'}`;

      const caseRes = await api.createCase(
        {
          category,
          severity,
          subcategory,
          vitals,
          symptoms,
          suggested_severity: assistance?.suggested_severity,
          clinical_justification: assistance?.clinical_justification || assistance?.rationales,
          patient_basic_info: { age, sex },
          vitals_summary: vitalsText,
          onset_time: '20 minutes ago',
          treatment_administered: 'High-flow oxygen, IV access established, continuous ECG telemetry',
          ambulance_location: { lat: 21.185, lng: 72.825 },
        },
        { actor_type: 'ambulance', actor_id: 'AMB-01' }
      );

      if (caseRes.success) {
        await api.matchCase(
          caseRes.data.case.id,
          {
            actor_type: 'ambulance',
            actor_id: 'AMB-01',
          },
          selectedHospitalId || undefined
        );
        navigate(`/ambulance/${caseRes.data.case.id}`);
      }
    }, 800);
  };

  const derivedNeed = dynamicNeedProfile || deriveNeedProfile(category);

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
              <span className="text-xs font-mono text-[#7D7067] font-bold">[Unit AMB-01 • Active GPS]</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-black tracking-tight text-[#2D231C]">
              Advanced Patient Case Intake
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
                Active Inbound Dispatch: Case {activeRequests[0].case_id}
              </span>
              <span className="text-xs font-mono text-[#7D7067] font-medium hidden sm:inline">
                ({activeRequests[0].reason_shown_to_dispatcher})
              </span>
            </div>
            <span className="text-xs font-mono text-[#C2410C] font-bold flex items-center gap-1.5">
              <span>Resume Journey HUD</span>
              <ArrowRight className="w-4 h-4" />
            </span>
          </div>
        )}

        {/* 2-Column Responsive Web App Command Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Dispatch Column (7 Cols) */}
          <div className="lg:col-span-7 space-y-6 stagger-1">
            {/* STEP 1: CASE INTAKE WITH ADVANCED VITALS & SUBCATEGORIES */}
            {step === 'intake' && (
              <div className="p-6 sm:p-8 rounded-3xl border border-[#E8E2D9] bg-white shadow-sm space-y-6 animate-fade-in">
                <div className="border-b border-[#E8E2D9] pb-4">
                  <h2 className="text-xl sm:text-2xl font-display font-black text-[#2D231C] tracking-tight">
                    Emergency Category & Clinical Subcategory
                  </h2>
                  <p className="text-xs text-[#7D7067] font-mono font-bold mt-1">
                    Select main category and granular emergency subtype
                  </p>
                </div>

                {/* Main Category Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'cardiac', label: 'Cardiac', icon: Heart },
                    { id: 'trauma', label: 'Major Trauma', icon: Flame },
                    { id: 'neurological', label: 'Neuro / Stroke', icon: Stethoscope },
                    { id: 'respiratory', label: 'Respiratory', icon: Activity },
                    { id: 'pediatric', label: 'Pediatric', icon: Baby },
                    { id: 'obstetric', label: 'Obstetric', icon: Stethoscope },
                  ].map((c) => {
                    const Icon = c.icon;
                    const isSelected = category === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setCategory(c.id as CaseCategory);
                          const subcats = subcategoryMap[c.id];
                          if (subcats && subcats.length > 0) {
                            setSubcategory(subcats[0].id);
                          }
                        }}
                        className={clsx(
                          'p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all duration-180',
                          isSelected
                            ? 'border-[#EA580C] bg-[#FFF7ED] ring-1 ring-[#EA580C] shadow-xs'
                            : 'border-[#E8E2D9] bg-[#FAF8F5] hover:bg-white hover:border-[#D8CFBF]'
                        )}
                      >
                        <span className={clsx('text-xs font-display font-bold', isSelected ? 'text-[#C2410C]' : 'text-[#2D231C]')}>
                          {c.label}
                        </span>
                        <Icon className={clsx('w-4 h-4', isSelected ? 'text-[#EA580C]' : 'text-[#7D7067]')} />
                      </button>
                    );
                  })}
                </div>

                {/* Clinical Subcategory Pills (Feature 6) */}
                {subcategoryMap[category] && (
                  <div className="space-y-2 pt-2">
                    <span className="text-xs font-mono text-[#7D7067] uppercase font-bold">
                      Clinical Subcategory (Feature 6):
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {subcategoryMap[category].map((sc) => {
                        const active = subcategory === sc.id;
                        return (
                          <button
                            key={sc.id}
                            type="button"
                            onClick={() => setSubcategory(sc.id)}
                            className={clsx(
                              'px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all border',
                              active
                                ? 'border-[#EA580C] bg-[#EA580C] text-white shadow-xs'
                                : 'border-[#E8E2D9] bg-white text-[#524438] hover:border-[#EA580C]/40'
                            )}
                          >
                            {sc.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Quantitative Manual Patient Vitals (Feature 7) */}
                <div className="space-y-3 pt-3 border-t border-[#E8E2D9]">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[#2D231C] uppercase font-bold flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-[#EA580C]" />
                      <span>Quantitative Patient Vitals (Feature 7)</span>
                    </span>
                    <span className="text-[11px] text-[#52796F] font-bold">Continuous Monitor Feed</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
                    <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E8E2D9]">
                      <span className="text-[10px] text-[#7D7067] font-bold block mb-1">Heart Rate (bpm)</span>
                      <input
                        type="number"
                        value={vitals.heart_rate || ''}
                        onChange={(e) => handleVitalChange('heart_rate', parseInt(e.target.value, 10) || null)}
                        className="w-full bg-white px-2.5 py-1.5 rounded-lg border border-[#E8E2D9] font-bold text-sm text-[#2D231C] outline-none focus:border-[#EA580C]"
                      />
                    </div>
                    <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E8E2D9]">
                      <span className="text-[10px] text-[#7D7067] font-bold block mb-1">Sys BP (mmHg)</span>
                      <input
                        type="number"
                        value={vitals.blood_pressure_sys || ''}
                        onChange={(e) => handleVitalChange('blood_pressure_sys', parseInt(e.target.value, 10) || null)}
                        className="w-full bg-white px-2.5 py-1.5 rounded-lg border border-[#E8E2D9] font-bold text-sm text-[#2D231C] outline-none focus:border-[#EA580C]"
                      />
                    </div>
                    <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E8E2D9]">
                      <span className="text-[10px] text-[#7D7067] font-bold block mb-1">SpO2 (%)</span>
                      <input
                        type="number"
                        value={vitals.spo2 || ''}
                        onChange={(e) => handleVitalChange('spo2', parseInt(e.target.value, 10) || null)}
                        className={clsx(
                          'w-full bg-white px-2.5 py-1.5 rounded-lg border font-bold text-sm outline-none focus:border-[#EA580C]',
                          (vitals.spo2 || 100) < 90 ? 'border-red-500 text-red-600 bg-red-50' : 'border-[#E8E2D9] text-[#2D231C]'
                        )}
                      />
                    </div>
                    <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E8E2D9]">
                      <span className="text-[10px] text-[#7D7067] font-bold block mb-1">GCS Score (3-15)</span>
                      <input
                        type="number"
                        min="3"
                        max="15"
                        value={vitals.gcs_score || ''}
                        onChange={(e) => handleVitalChange('gcs_score', parseInt(e.target.value, 10) || null)}
                        className="w-full bg-white px-2.5 py-1.5 rounded-lg border border-[#E8E2D9] font-bold text-sm text-[#2D231C] outline-none focus:border-[#EA580C]"
                      />
                    </div>
                  </div>
                </div>

                {/* Clinical Symptoms Multi-Select Chips (Feature 7) */}
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-mono text-[#7D7067] uppercase font-bold">
                    Observed Clinical Symptoms:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: 'chest_pain', label: 'Severe Chest Pain' },
                      { key: 'breathing_difficulty', label: 'Respiratory Distress' },
                      { key: 'unconscious', label: 'Unresponsive / Coma' },
                      { key: 'bleeding', label: 'Active Hemorrhage' },
                      { key: 'altered_mental_status', label: 'Altered Mental Status' },
                    ].map((sym) => {
                      const active = !!symptoms[sym.key as keyof PatientSymptoms];
                      return (
                        <button
                          key={sym.key}
                          type="button"
                          onClick={() => toggleSymptom(sym.key as keyof PatientSymptoms)}
                          className={clsx(
                            'px-3 py-1.5 rounded-xl text-xs font-mono font-bold border transition-all',
                            active
                              ? 'border-[#BE123C] bg-[#FFE4E6] text-[#BE123C] shadow-xs'
                              : 'border-[#E8E2D9] bg-[#FAF8F5] text-[#7D7067] hover:border-[#EA580C]/30'
                          )}
                        >
                          {sym.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Urgency Priority Tier with Assistant Alignment (Feature 9) */}
                <div className="space-y-3 pt-3 border-t border-[#E8E2D9]">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[#2D231C] uppercase font-bold">Active Priority Level</span>
                    <span className="text-[11px] text-[#7D7067] font-bold">Deterministic Engine Authority</span>
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
                              ? 'border-[#E11D48]/50 bg-[#FFE4E6] text-[#BE123C] ring-2 ring-[#E11D48]'
                              : s === 'yellow'
                              ? 'border-[#D97706]/50 bg-[#FEF3C7] text-[#B45309] ring-2 ring-[#D97706]'
                              : 'border-[#52796F]/60 bg-[#EFF6F3] text-[#354F52] ring-2 ring-[#52796F]'
                            : 'border-[#E8E2D9] bg-white text-[#7D7067] hover:text-[#2D231C]'
                        )}
                      >
                        Priority: {s}
                      </button>
                    ))}
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
                    Confirm & Evaluate Capability Graph
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 2: NEED PROFILE & CAPABILITY GRAPH PREVIEW */}
            {step === 'need_preview' && (
              <div className="p-6 sm:p-8 rounded-3xl border border-[#E8E2D9] bg-white shadow-sm space-y-6 animate-fade-in">
                <div className="border-b border-[#E8E2D9] pb-4">
                  <span className="text-xs font-mono uppercase tracking-wider text-[#EA580C] font-extrabold">
                    Capability Graph Dependency Resolution (Feature 1 & 8)
                  </span>
                  <h2 className="text-2xl font-display font-black text-[#2D231C] tracking-tight mt-1">
                    Resolved Medical Needs:
                  </h2>
                  <p className="text-xs text-[#7D7067] mt-1 leading-relaxed font-medium">
                    Computed deterministically by the Raahi DAG resolver — eliminates guesswork.
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
                      <div className="text-[#2D231C] capitalize">{category}</div>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-[#E8E2D9] shadow-xs">
                      <span className="text-[#7D7067] text-[10px] uppercase">Subcategory</span>
                      <div className="text-[#EA580C] capitalize">{subcategory.replace('_', ' ')}</div>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-[#E8E2D9] shadow-xs">
                      <span className="text-[#7D7067] text-[10px] uppercase">Priority</span>
                      <div className="text-[#BE123C] uppercase">{severity}</div>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-[#E8E2D9] shadow-xs">
                      <span className="text-[#7D7067] text-[10px] uppercase">Patient</span>
                      <div className="text-[#2D231C]">{age}y {sex}</div>
                    </div>
                  </div>

                  {/* Target Facility Selection */}
                  <div className="p-4 bg-white rounded-2xl border border-[#E8E2D9] space-y-2 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-[#2D231C] font-bold uppercase flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#EA580C]" />
                        <span>Target Hospital Destination</span>
                      </span>
                      <span className="text-[10px] font-mono text-[#7D7067] font-bold">
                        {selectedHospitalId ? 'Manual Selection' : 'Automated Optimal Matching'}
                      </span>
                    </div>
                    <select
                      value={selectedHospitalId}
                      onChange={(e) => setSelectedHospitalId(e.target.value)}
                      className="w-full text-xs font-mono font-bold bg-[#FAF8F5] text-[#2D231C] border border-[#E8E2D9] rounded-xl px-3.5 py-2.5 outline-none focus:border-[#EA580C] shadow-xs"
                    >
                      <option value="">🎯 Auto-Ranked Optimal Facility (Raahi Recommendation)</option>
                      {hospitals.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.name} ({h.icu_beds_free} ICU Beds, {h.ventilators_free} Vent, ER Load: {h.er_load_score}/5)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="ghost"
                    onClick={() => setStep('intake')}
                    className="w-1/3 text-xs font-mono uppercase"
                  >
                    Adjust Vitals
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleExecuteMatch}
                    className="w-2/3 text-sm font-display font-black uppercase tracking-wider btn-tactile shadow-md"
                  >
                    Send Emergency Request
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 3: MATCHING PROGRESS */}
            {step === 'matching' && (
              <div className="p-8 sm:p-12 rounded-3xl border border-[#E8E2D9] bg-white shadow-md text-center space-y-6 animate-fade-in">
                <div className="w-16 h-16 rounded-full bg-[#FFF7ED] border-2 border-[#EA580C]/40 mx-auto flex items-center justify-center animate-spin">
                  <Zap className="w-8 h-8 text-[#EA580C]" />
                </div>
                <div>
                  <h3 className="text-xl font-display font-black text-[#2D231C]">
                    Evaluating Regional Trauma Network…
                  </h3>
                  <p className="text-xs font-mono text-[#7D7067] mt-1">
                    Deterministic pipeline executing 5-stage filter & scoring matrix
                  </p>
                </div>

                <div className="max-w-md mx-auto space-y-2 text-left text-xs font-mono">
                  {[
                    'Stage 1: Hard Clinical Capability & Specialist Eligibility Gate',
                    'Stage 2: Capability Match Percentage Calculation',
                    'Stage 3: Non-Linear Distance Factor (Haversine Formula)',
                    'Stage 4: ER Load & Telemetry Freshness Multipliers',
                    'Stage 5: Deterministic Composite Ranking & Hold Preparation',
                  ].map((label, idx) => (
                    <div
                      key={label}
                      className={clsx(
                        'p-2.5 rounded-xl border flex items-center gap-2.5 transition-all',
                        matchingStep > idx
                          ? 'border-[#52796F]/40 bg-[#EFF6F3] text-[#354F52] font-bold'
                          : matchingStep === idx
                          ? 'border-[#EA580C] bg-[#FFF7ED] text-[#C2410C] font-black animate-pulse'
                          : 'border-[#E8E2D9] text-[#A89F91]'
                      )}
                    >
                      <span className="w-2 h-2 rounded-full bg-current" />
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Rail: Dynamic Severity Assistant Card (Feature 9) & Network Radar */}
          <div className="lg:col-span-5 space-y-6 stagger-2">
            {/* Dynamic Severity Assistant Card (Feature 9) */}
            {assistance && (
              <div className="p-6 rounded-3xl border border-[#EA580C]/30 bg-gradient-to-br from-[#FFF7ED] to-white shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#EA580C]/20">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[#EA580C]" />
                    <h3 className="font-display font-black text-sm text-[#2D231C]">
                      Dynamic Severity Assistant
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded-full bg-[#EA580C] text-white">
                    {Math.round(assistance.confidence_score * 100)}% Confidence
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-[#7D7067] font-bold">Suggested Severity:</span>
                  <span
                    className={clsx(
                      'text-sm font-mono font-black uppercase px-3 py-1 rounded-xl border',
                      assistance.suggested_severity === 'red'
                        ? 'border-red-500 bg-red-100 text-red-700'
                        : assistance.suggested_severity === 'yellow'
                        ? 'border-amber-500 bg-amber-100 text-amber-800'
                        : 'border-emerald-500 bg-emerald-100 text-emerald-800'
                    )}
                  >
                    Priority {assistance.suggested_severity}
                  </span>
                </div>

                {/* Clinical Justifications */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-mono font-bold text-[#7D7067] uppercase">
                    Clinical Justifications:
                  </span>
                  <div className="space-y-1">
                    {(assistance.clinical_justification || assistance.rationales).map((r, i) => (
                      <div key={i} className="text-xs text-[#524438] flex items-start gap-1.5 leading-snug">
                        <span className="text-[#EA580C] font-bold">•</span>
                        <span>{r}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Human Final Authority Disclaimer */}
                <div className="p-3 bg-white rounded-2xl border border-[#E8E2D9] space-y-2">
                  <p className="text-[11px] text-[#7D7067] leading-relaxed italic">
                    Deterministic rule-based clinical recommendation. The human EMT paramedic retains final triage authority.
                  </p>
                  {severity !== assistance.suggested_severity && (
                    <button
                      type="button"
                      onClick={handleAdoptSeverity}
                      className="w-full py-2 px-3 rounded-xl bg-[#EA580C] text-white text-xs font-mono font-bold hover:bg-[#C2410C] transition-colors shadow-xs"
                    >
                      Adopt Suggested Priority {assistance.suggested_severity.toUpperCase()}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Network Overview Card */}
            <div className="p-6 rounded-3xl border border-[#E8E2D9] bg-white shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E8E2D9]">
                <h3 className="font-display font-black text-sm text-[#2D231C]">Regional Grid Status</h3>
                <span className="text-xs font-mono font-bold text-[#52796F]">
                  {hospitals.length} Trauma Centers Online
                </span>
              </div>
              <div className="space-y-2.5">
                {hospitals.slice(0, 4).map((h) => (
                  <div
                    key={h.id}
                    className="p-3 rounded-xl border border-[#E8E2D9] bg-[#FAF8F5] flex items-center justify-between text-xs font-mono"
                  >
                    <div>
                      <div className="font-bold text-[#2D231C]">{h.name}</div>
                      <div className="text-[10px] text-[#7D7067]">
                        ICU Free: {h.icu_beds_free} • Vents: {h.ventilators_free}
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#EFF6F3] text-[#354F52] font-bold border border-[#52796F]/30">
                      Accredited
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
