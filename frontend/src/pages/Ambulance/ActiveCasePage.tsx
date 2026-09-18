import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useCase, useCaseRequests, useHospitals } from '../../hooks/useSubscriptions';
import { api, evaluateHospitalMatch } from '../../services/api';
import { CommitmentCircuit } from '../../components/domain/CommitmentCircuit';
import { MatchCard } from '../../components/domain/MatchCard';
import { Countdown } from '../../components/domain/Countdown';
import { StatusBadge } from '../../components/domain/StatusBadge';
import { LoadingState } from '../../components/feedback/LoadingState';
import { Card3D } from '../../components/primitives/Card3D';
import { RadianceMap } from '../Admin/RadianceMap';
import {
  PhoneCall,
  RotateCcw,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  ArrowRight,
  ArrowLeft,
  Navigation,
  Activity,
  HeartHandshake,
  CheckCircle2,
} from 'lucide-react';
import clsx from 'clsx';

export const ActiveCasePage: React.FC = () => {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();

  const { data: caseDataObj } = useCase(caseId);
  const { data: requests } = useCaseRequests(caseId);
  const { data: allHospitals } = useHospitals();

  const [expandedRanked, setExpandedRanked] = useState(false);
  const [supersedeLoading, setSupersedeLoading] = useState(false);

  const c = caseDataObj?.case;
  const routing = caseDataObj?.routing;

  // Active or latest request
  const activeRequest = requests.length > 0 ? requests[requests.length - 1] : null;
  const targetHospital = activeRequest
    ? allHospitals.find((h) => h.id === activeRequest.hospital_id)
    : null;

  if (!c || !routing || !activeRequest || !targetHospital) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-[#F8FAFC] text-[#0F172A] p-8 max-w-5xl mx-auto flex items-center justify-center">
        <LoadingState label="Synchronizing case telemetry and routing vectors…" variant="circuit" />
      </div>
    );
  }

  // Candidate rankings for collapsed queue
  const candidates = allHospitals
    .map((h) => evaluateHospitalMatch(h, c))
    .sort((a, b) => b.final_score - a.final_score)
    .filter((cand) => cand.hospital_id !== activeRequest.hospital_id);

  // Trigger Mid-Transit Reroute Demonstration
  const handleSimulateMidTransitCollapse = async () => {
    if (!caseId) return;
    setSupersedeLoading(true);
    await api.triggerSupersededReroute(caseId);
    setSupersedeLoading(false);
  };

  const isAccepted = activeRequest.status === 'accepted';
  const isPending = activeRequest.status === 'pending';
  const isSuperseded = activeRequest.status === 'superseded';
  const isExhausted = routing.status === 'exhausted';

  return (
    <div className="min-h-[calc(100vh-64px)] text-[#0F172A] p-4 sm:p-8 font-sans select-none relative z-10">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Navigation & Context Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-3">
            <Link
              to="/ambulance"
              className="text-xs font-mono text-[#475569] font-bold hover:text-[#0F172A] flex items-center gap-1.5 border border-[#E2E8F0] px-3 py-1.5 rounded-xl bg-white hover:bg-[#F8FAFC] transition-colors shadow-xs"
            >
              <ArrowLeft className="w-4 h-4 text-[#149B9E]" />
              <span>Back to Dispatch Terminal</span>
            </Link>
            <div>
              <div className="text-xs font-mono text-[#149B9E] uppercase tracking-wider font-extrabold">
                Active Transit Telemetry
              </div>
              <h1 className="text-xl sm:text-2xl font-display font-black text-[#0F172A] tracking-tight">
                Case {c.id} • {c.patient_basic_info.age}y {c.patient_basic_info.sex}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <span className="text-[#0F172A] font-bold bg-white px-3 py-1.5 rounded-full border border-[#E2E8F0] shadow-xs">
              Attempt {activeRequest.attempt_number} of {allHospitals.length}
            </span>
            <StatusBadge status={activeRequest.status} size="md" />
          </div>
        </div>

        {/* MID-TRANSIT SUPERSEDED PRIORITY BANNER (Section H.1.8) */}
        {isSuperseded && (
          <div className="p-4 bg-[#FEF3C7] border border-[#D97706]/50 rounded-2xl animate-fade-in text-xs font-mono text-[#B45309] space-y-1 shadow-xs">
            <div className="flex items-center gap-2 text-sm font-bold text-[#B45309]">
              <AlertTriangle className="w-5 h-5 text-[#E11D48]" />
              <span>DESTINATION CHANGED MID-TRANSIT</span>
            </div>
            <p className="text-xs text-[#475569] font-sans font-medium leading-relaxed">
              {targetHospital.name} capability collapsed en route. Raahi proactively rerouted without driver intervention to preserve commitment safety.
            </p>
          </div>
        )}

        {/* AUTOMATIC REROUTE NARRATION (Scenario B, Section I.1) */}
        {activeRequest.attempt_number > 1 && isPending && (
          <div className="p-4 bg-[#E6F7F7] border border-[#149B9E]/40 rounded-2xl animate-fade-in text-xs font-mono text-[#0D7C7E] font-bold flex items-center gap-3 shadow-xs">
            <RotateCcw className="w-5 h-5 shrink-0 animate-spin text-[#149B9E]" style={{ animationDuration: '4s' }} />
            <span>
              Previous facility declined or reached response deadline. Automatically rerouted to next ranked capability match.
            </span>
          </div>
        )}

        {/* 2-Column Responsive Web Application Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Routing State, Circuits & Decision Cards (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* SIGNATURE COMMITMENT CIRCUIT METAPHOR */}
            <div className="p-6 rounded-3xl border border-[#E2E8F0] bg-white shadow-sm space-y-3">
              <div className="flex items-center justify-between text-xs font-mono text-[#475569] pb-2 border-b border-[#E2E8F0]">
                <span className="uppercase tracking-wider font-extrabold text-[#0F172A]">Commitment Circuit State</span>
                <span className="capitalize font-extrabold text-[#149B9E]">{activeRequest.status}</span>
              </div>
              <CommitmentCircuit
                from={{ label: 'Unit AMB-04' }}
                to={{ label: targetHospital.name }}
                status={activeRequest.status}
                freshness={targetHospital.last_updated_at ? 'fresh' : 'unknown'}
                attemptNumber={activeRequest.attempt_number}
              />
            </div>

            {/* COUNTDOWN BAR (Linear Bar Synced to Server expires_at) */}
            {isPending && (
              <div className="p-5 rounded-2xl border border-[#E2E8F0] bg-white shadow-xs">
                <Countdown
                  expiresAt={activeRequest.expires_at}
                  variant="bar"
                  label={`Awaiting confirmation commitment from ${targetHospital.name}`}
                />
              </div>
            )}

            {/* CASE OUTCOME: ACCEPTED COMMITMENT (Section H.1.6) */}
            {isAccepted && (
              <div className="p-6 sm:p-8 rounded-3xl border-2 border-[#0D9488] bg-[#CCFBF1]/25 shadow-sm space-y-6 animate-scale-settle relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-[#0D9488] animate-pulse" />
                    <span className="font-mono text-xs uppercase tracking-wider font-extrabold text-[#0F766E]">
                      Confirmed Destination Locked
                    </span>
                  </div>
                  <span className="text-xs font-mono bg-[#CCFBF1] text-[#0F766E] px-3 py-1 rounded-full font-black border border-[#0D9488]/40">
                    CAPACITY HELD
                  </span>
                </div>

                {/* Reasoning string is the largest text on screen per spec H.1.6 */}
                <div>
                  <h2 className="text-2xl sm:text-3xl font-display font-black text-[#0F172A] leading-tight tracking-tight">
                    {activeRequest.reason_shown_to_dispatcher}
                  </h2>
                  <p className="text-xs text-[#475569] font-mono font-bold mt-2">
                    Hospital reception staff explicitly committed to receive this patient.
                  </p>
                </div>

                {/* Destination Summary Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono pt-2">
                  <div className="bg-white p-3.5 rounded-2xl border border-[#E2E8F0] shadow-xs">
                    <span className="text-[#475569] text-[10px] font-bold uppercase">ICU Beds</span>
                    <div className="font-extrabold text-[#0D9488] mt-0.5">1 Reserved</div>
                  </div>
                  <div className="bg-white p-3.5 rounded-2xl border border-[#E2E8F0] shadow-xs">
                    <span className="text-[#475569] text-[10px] font-bold uppercase">Ventilators</span>
                    <div className="font-extrabold text-[#0F172A] mt-0.5">{targetHospital.ventilators_free} available</div>
                  </div>
                  <div className="bg-white p-3.5 rounded-2xl border border-[#E2E8F0] shadow-xs">
                    <span className="text-[#475569] text-[10px] font-bold uppercase">Trauma Team</span>
                    <div className="font-extrabold text-[#0F172A] mt-0.5">
                      {targetHospital.trauma_team_on_shift ? 'ON SHIFT' : 'STANDBY'}
                    </div>
                  </div>
                  <div className="bg-white p-3.5 rounded-2xl border border-[#E2E8F0] shadow-xs">
                    <span className="text-[#475569] text-[10px] font-bold uppercase">ER Load</span>
                    <div className="font-extrabold text-[#0F172A] mt-0.5">{targetHospital.er_load_score}/5 Score</div>
                  </div>
                </div>

                {/* Direct Contact Button */}
                <div className="pt-2">
                  <a
                    href={`tel:${targetHospital.contact_number || '+917926850101'}`}
                    className="w-full py-4 px-6 bg-[#0D9488] hover:bg-[#0F766E] text-white font-display font-black rounded-2xl flex items-center justify-center gap-2.5 text-base shadow-md shadow-[#0D9488]/25 transition-all select-none active:scale-[0.99] btn-tactile"
                  >
                    <PhoneCall className="w-5 h-5 text-white" />
                    <span>Contact Hospital Reception ({targetHospital.contact_number || '+91 79 2685 0101'})</span>
                  </a>
                </div>

                {/* Mid-Transit Collapse Simulator Button */}
                <div className="pt-3 border-t border-[#0D9488]/30 flex items-center justify-between">
                  <span className="text-xs text-[#475569] font-mono font-bold">
                    Hackathon Demo Scenario F:
                  </span>
                  <button
                    type="button"
                    disabled={supersedeLoading}
                    onClick={handleSimulateMidTransitCollapse}
                    className="py-2 px-4 rounded-xl border border-[#E2E8F0] bg-white text-[#0F172A] hover:bg-[#F8FAFC] text-xs font-mono font-bold flex items-center gap-2 transition-colors active:scale-95 shadow-xs"
                  >
                    <AlertTriangle className="w-4 h-4 text-[#E11D48]" />
                    <span>Simulate Mid-Transit Capability Collapse</span>
                  </button>
                </div>
              </div>
            )}

            {/* PRIMARY MATCH CARD (When Pending) */}
            {!isAccepted && (
              <MatchCard
                hospital={targetHospital}
                matchResult={{
                  hospital_id: targetHospital.id,
                  rank: activeRequest.attempt_number,
                  capability_match_pct: activeRequest.match_score_breakdown.capability_match_pct,
                  distance_km: activeRequest.match_score_breakdown.distance_km,
                  distance_factor: activeRequest.match_score_breakdown.distance_factor,
                  load_factor: activeRequest.match_score_breakdown.load_factor,
                  staleness_factor: activeRequest.match_score_breakdown.staleness_factor,
                  final_score: activeRequest.match_score_breakdown.final_score,
                  eligibility: { eligible: true, reason: null },
                  freshness: {
                    status: 'fresh',
                    last_updated_at: targetHospital.last_updated_at,
                  },
                  reasons: [activeRequest.reason_shown_to_dispatcher],
                }}
                status={activeRequest.status}
              />
            )}

            {/* COLLAPSED NEXT-IN-LINE QUEUE */}
            {!isAccepted && candidates.length > 0 && (
              <div className="border border-[#E2E8F0] rounded-2xl bg-white p-5 text-xs font-mono shadow-xs">
                <button
                  type="button"
                  onClick={() => setExpandedRanked(!expandedRanked)}
                  className="w-full flex items-center justify-between text-[#475569] hover:text-[#0F172A] transition-colors"
                >
                  <span className="font-extrabold text-[#0F172A]">
                    Next in line if {targetHospital.name} does not respond ({candidates.length} candidates)
                  </span>
                  {expandedRanked ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {expandedRanked && (
                  <div className="mt-3 space-y-2 pt-3 border-t border-[#E2E8F0] animate-fade-in">
                    {candidates.map((cand, idx) => {
                      const hosp = allHospitals.find((h) => h.id === cand.hospital_id);
                      if (!hosp) return null;
                      return (
                        <div
                          key={cand.hospital_id}
                          className="p-3.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="font-bold text-[#0F172A]">{hosp.name}</div>
                            <div className="text-[#475569] text-[11px] font-medium">
                              {cand.distance_km} km away • ER Load {hosp.er_load_score}/5 • Match Score: {cand.final_score}
                            </div>
                          </div>
                          <span className="text-[#149B9E] font-mono font-extrabold">Rank #{idx + 2}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* EXHAUSTED STATE */}
            {isExhausted && (
              <div className="p-6 rounded-2xl border border-[#E11D48]/40 bg-[#FFE4E6]/25 text-center space-y-3">
                <h3 className="text-lg font-black text-[#E11D48]">
                  No Remaining Hospital Meets This Case Requirements
                </h3>
                <p className="text-xs text-[#475569] font-medium leading-relaxed">
                  All regional facilities were queried and declined or lacked required capacities. Manual clinical director override required.
                </p>
              </div>
            )}
          </div>

          {/* Right Column: Spatial Routing Map (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-6 rounded-3xl border border-[#E2E8F0] bg-white shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
                <div className="flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-[#149B9E]" />
                  <span className="text-xs font-mono uppercase tracking-wider text-[#0F172A] font-black">
                    Spatial Route & Facility Vector
                  </span>
                </div>
                <span className="text-[10px] font-mono text-[#0F766E] font-bold bg-[#CCFBF1] px-2.5 py-0.5 rounded-full border border-[#0D9488]/40">
                  GPS Active • Leaflet
                </span>
              </div>

              <RadianceMap
                hospitals={allHospitals}
                activeRequest={activeRequest}
                activeCase={c}
                className="h-[360px] rounded-2xl border border-[#E2E8F0] shadow-inner"
              />

              {/* Patient Vitals Summary Card */}
              <div className="p-4 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] space-y-2 text-xs font-mono">
                <div className="flex justify-between text-[#475569] font-bold text-[10px] uppercase">
                  <span>Vitals Snapshot</span>
                  <span>Onset: {c.onset_time}</span>
                </div>
                <div className="text-[#0F172A] font-bold">{c.vitals_summary}</div>
                <div className="text-[#475569] font-medium text-[11px] pt-1.5 border-t border-[#E2E8F0]">
                  Treatment: {c.treatment_administered}
                </div>
              </div>

              <div className="pt-1 flex items-center justify-between text-xs font-mono">
                <Link
                  to={`/track/${c.id}`}
                  className="text-[#149B9E] hover:underline flex items-center gap-1.5 font-bold"
                >
                  <HeartHandshake className="w-4 h-4 text-[#149B9E]" />
                  <span>Open Family Tracker View ↗</span>
                </Link>
                <span className="text-[11px] text-[#475569] font-mono font-bold">ID: {c.id}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
