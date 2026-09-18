import React, { useState, useEffect } from 'react';
import clsx from 'clsx';
import { Case, Hospital } from '../../types/domain';
import { Countdown } from './Countdown';
import { StatusBadge } from './StatusBadge';
import { Users, Split, ShieldAlert, ArrowRight, CheckCircle2, AlertOctagon, Zap } from 'lucide-react';

interface DistributionAssignment {
  case_id: string;
  patient_category: string;
  severity: string;
  assigned_hospital_id: string;
  assigned_hospital_name: string;
  reason: string;
  score: number;
}

interface DistributionBoardProps {
  cases: Case[];
  hospitals: Hospital[];
  assignments: DistributionAssignment[];
  onDistributeAll?: () => void;
  isDistributing?: boolean;
}

export const DistributionBoard: React.FC<DistributionBoardProps> = ({
  cases,
  hospitals,
  assignments,
  onDistributeAll,
  isDistributing = false,
}) => {
  const [animStage, setAnimStage] = useState<'idle' | 'converge' | 'hold' | 'split' | 'resolved'>('idle');
  const [showComparison, setShowComparison] = useState(false);

  useEffect(() => {
    if (isDistributing) {
      setAnimStage('converge');
      const t1 = setTimeout(() => setAnimStage('hold'), 400);
      const t2 = setTimeout(() => setAnimStage('split'), 700);
      const t3 = setTimeout(() => setAnimStage('resolved'), 1600);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    } else if (assignments.length > 0) {
      setAnimStage('resolved');
    } else {
      setAnimStage('idle');
    }
  }, [isDistributing, assignments.length]);

  return (
    <div className="border border-[#E2E8F0] rounded-3xl bg-white p-6 sm:p-8 select-none space-y-6 shadow-sm relative overflow-hidden">
      {/* Header & Simulated Comparison Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs font-bold text-[#0F766E] bg-[#CCFBF1] px-3 py-0.5 rounded-full border border-[#0D9488]/40 uppercase tracking-wider">
              Incident Response
            </span>
            <span className="text-xs font-mono text-[#475569] font-bold">
              4 Casualty Influx • Concurrent Routing
            </span>
          </div>
          <h2 className="text-2xl font-display font-black text-[#0F172A] tracking-tight">
            Mass-Casualty Capability Distribution Board
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowComparison(!showComparison)}
            className={clsx(
              'px-4 py-2 rounded-xl border text-xs font-mono font-bold transition-all duration-200 flex items-center gap-2 active:scale-95 shadow-xs',
              showComparison
                ? 'border-[#CBD5E1] bg-[#FEF3C7] text-[#B45309]'
                : 'border-[#E2E8F0] bg-white text-[#475569] hover:text-[#0F172A] hover:bg-[#F8FAFC]'
            )}
          >
            <Split className="w-3.5 h-3.5 text-[#149B9E]" />
            <span>{showComparison ? 'Exit Comparison' : 'Simulate Naive Nearest-Hospital Overload'}</span>
          </button>
        </div>
      </div>

      {/* COMPARISON VIEW: Naive Overload vs. Raahi Distribution */}
      {showComparison ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
          {/* Left: Naive Nearest Hospital Routing (Failure Mode) */}
          <div className="p-6 rounded-2xl border-2 border-[#E11D48]/40 bg-[#FFE4E6]/25 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#E11D48]/20 pb-3">
              <div className="flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 text-[#E11D48]" />
                <span className="font-mono text-xs font-bold uppercase text-[#E11D48]">
                  Simulated Comparison: Naive Nearest Hospital
                </span>
              </div>
              <span className="text-[10px] font-mono bg-[#FFE4E6] text-[#BE123C] px-2.5 py-0.5 rounded-full font-bold">
                COLLAPSE
              </span>
            </div>

            <p className="text-xs text-[#475569] font-medium leading-relaxed font-sans">
              Without capability matching, dispatch sends all 4 incoming casualties to the nearest single general hospital (<b className="text-[#0F172A]">CityCare General</b>), saturating its ER and exhausting ICU beds.
            </p>

            <div className="p-4 bg-white rounded-xl border border-[#E11D48]/30 space-y-2.5 shadow-xs">
              <div className="flex justify-between text-xs font-mono font-bold">
                <span className="text-[#475569]">CityCare ER Load:</span>
                <span className="text-[#E11D48]">5 / 5 (100% SATURATED)</span>
              </div>
              <div className="flex justify-between text-xs font-mono font-bold">
                <span className="text-[#475569]">ICU Beds Available:</span>
                <span className="text-[#E11D48]">0 / 1 (DEPLETED)</span>
              </div>
              <div className="flex justify-between text-xs font-mono font-bold">
                <span className="text-[#475569]">Unplaceable Patients:</span>
                <span className="text-[#E11D48]">2 Casualties Refused at Door</span>
              </div>
            </div>

            <div className="text-[11px] font-mono text-[#E11D48] font-bold italic">
              Result: Severe handoff delay, avoidable mortality, hospital emergency diversion.
            </div>
          </div>

          {/* Right: Raahi Multi-Hospital Capability Match */}
          <div className="p-6 rounded-2xl border-2 border-[#0D9488]/40 bg-[#CCFBF1]/25 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#0D9488]/40 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#0D9488]" />
                <span className="font-mono text-xs font-bold uppercase text-[#0F766E]">
                  Raahi Deterministic Distribution
                </span>
              </div>
              <span className="text-[10px] font-mono bg-[#CCFBF1] text-[#0F766E] px-2.5 py-0.5 rounded-full font-bold">
                OPTIMIZED
              </span>
            </div>

            <p className="text-xs text-[#475569] font-medium leading-relaxed font-sans">
              Jointly computes need against live strengths: trauma diverted to surgical bay, cardiac to cardiologist on shift, pediatric to children's emergency.
            </p>

            <div className="space-y-2.5 font-mono text-xs">
              <div className="p-3 bg-white rounded-xl border border-[#0D9488]/40 flex justify-between items-center shadow-xs">
                <span className="text-[#0F172A] font-bold">Trauma Patient → Apex Centre:</span>
                <span className="text-[#0D9488] font-bold">Surgeon ready, O- blood reserved</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-[#0D9488]/40 flex justify-between items-center shadow-xs">
                <span className="text-[#0F172A] font-bold">Cardiac Patient → Metro Heart:</span>
                <span className="text-[#0D9488] font-bold">Cath lab prep, cardiologist on shift</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-[#0D9488]/40 flex justify-between items-center shadow-xs">
                <span className="text-[#0F172A] font-bold">Pediatric Patient → Lifeline:</span>
                <span className="text-[#0D9488] font-bold">Pediatrician & PICU reserved</span>
              </div>
            </div>

            <div className="text-[11px] font-mono text-[#0D9488] font-bold">
              Result: Zero diversion, 100% capacity absorption across 3 regional facilities.
            </div>
          </div>
        </div>
      ) : (
        /* INTERACTIVE CONVERGENCE & SPLIT VISUALIZATION */
        <div className="space-y-6">
          {/* Animated Distribution Arena */}
          <div className="relative p-6 sm:p-8 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] min-h-[300px] flex flex-col justify-between overflow-hidden shadow-inner">
            {/* Stage Indicator */}
            <div className="flex justify-between items-center text-xs font-mono text-[#475569] mb-4">
              <span className="font-bold">Dynamic Routing Engine:</span>
              <span className="text-[#149B9E] font-bold uppercase tracking-wider">
                {animStage === 'idle' && 'Standby for Dispatch'}
                {animStage === 'converge' && 'Step 1: Converging telemetry to decision node…'}
                {animStage === 'hold' && 'Step 2: Evaluating joint capability matrices…'}
                {animStage === 'split' && 'Step 3: Staggered routing to hospital strengths…'}
                {animStage === 'resolved' && 'Step 4: Active concurrent commitments locked'}
              </span>
            </div>

            {/* Visual Token Nodes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 py-4">
              {cases.map((c, idx) => {
                const assignment = assignments.find((a) => a.case_id === c.id);
                return (
                  <div
                    key={c.id}
                    className={clsx(
                      'p-4 rounded-2xl border transition-all duration-500 flex flex-col justify-between select-none bg-white',
                      animStage === 'converge' && 'scale-95 opacity-80',
                      animStage === 'split' && 'translate-y-1',
                      assignment
                        ? 'border-[#149B9E] shadow-md shadow-[#149B9E]/10'
                        : 'border-[#E2E8F0] shadow-xs'
                    )}
                    style={{
                      transitionDelay: `${idx * 120}ms`,
                    }}
                  >
                    <div>
                      <div className="flex items-center justify-between text-[11px] font-mono mb-2">
                        <span className="text-[#0F172A] font-extrabold">P-{idx + 1}</span>
                        <span className={clsx(
                          'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
                          c.severity === 'red' ? 'bg-[#FFE4E6] text-[#BE123C] border border-[#E11D48]/30' : 'bg-[#FEF3C7] text-[#B45309] border border-[#D97706]/40'
                        )}>
                          {c.category}
                        </span>
                      </div>
                      <div className="text-xs text-[#475569] font-mono font-bold mb-1">
                        Age {c.patient_basic_info.age} • <span className="capitalize">{c.patient_basic_info.sex}</span>
                      </div>
                      <div className="text-[11px] text-[#475569] line-clamp-1 mb-3 font-medium">
                        {c.vitals_summary}
                      </div>
                    </div>

                    {assignment ? (
                      <div className="pt-3 border-t border-[#E2E8F0] animate-fade-in space-y-1">
                        <div className="text-[10px] font-mono uppercase text-[#149B9E] flex items-center gap-1 font-bold">
                          <ArrowRight className="w-3 h-3" />
                          <span>Routed To:</span>
                        </div>
                        <div className="text-xs font-display font-bold text-[#0F172A] truncate">
                          {assignment.assigned_hospital_name}
                        </div>
                        <div className="text-[10px] text-[#0D9488] font-mono font-bold">
                          {assignment.reason}
                        </div>
                      </div>
                    ) : (
                      <div className="pt-3 border-t border-[#E2E8F0] text-[10px] font-mono text-[#64748B] font-semibold">
                        Pending assignment
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Center Decision Node */}
            {(animStage === 'converge' || animStage === 'hold') && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/90 backdrop-blur-md animate-fade-in z-20">
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full border-2 border-[#149B9E] animate-ping flex items-center justify-center mb-3">
                    <Split className="w-7 h-7 text-[#149B9E]" />
                  </div>
                  <span className="font-mono text-xs text-[#0F172A] font-bold">
                    Matching 4 Casualties Against 5 Hospital Profiles…
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Action Trigger */}
          {assignments.length === 0 && onDistributeAll && (
            <div className="flex justify-end pt-2">
              <button
                type="button"
                disabled={isDistributing}
                onClick={onDistributeAll}
                className="px-8 py-3.5 bg-[#149B9E] hover:bg-[#0D7C7E] text-white font-display font-black rounded-2xl text-sm transition-all shadow-md shadow-[#149B9E]/25 active:scale-95 disabled:opacity-50 select-none btn-tactile flex items-center gap-2"
              >
                <Zap className="w-4 h-4 text-white" />
                <span>{isDistributing ? 'Computing Joint Distribution…' : 'Distribute All 4 Casualties'}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
