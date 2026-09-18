import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useCase, useCaseRequests, useHospitals } from '../../hooks/useSubscriptions';
import { estimateEtaMinutes } from '../../utils/geo';
import { HeartHandshake, ShieldCheck, Clock, ArrowLeft, CheckCircle2 } from 'lucide-react';

export const FamilyTrackPage: React.FC = () => {
  const { caseId } = useParams<{ caseId: string }>();

  const { data: caseObj } = useCase(caseId);
  const { data: requests } = useCaseRequests(caseId);
  const { data: hospitals } = useHospitals();

  const c = caseObj?.case;
  const activeRequest = requests.length > 0 ? requests[requests.length - 1] : null;
  const hospital = activeRequest ? hospitals.find((h) => h.id === activeRequest.hospital_id) : null;

  const isCommitted = activeRequest?.status === 'accepted';
  const etaMinutes = activeRequest
    ? estimateEtaMinutes(activeRequest.match_score_breakdown.distance_km)
    : 8;

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#2D231C] p-4 sm:p-8 md:p-12 font-sans select-none flex flex-col justify-between">
      <div className="max-w-xl mx-auto w-full space-y-8">
        {/* Simple top back header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E8E2D9]">
          <Link
            to="/"
            className="text-xs font-mono font-bold text-[#7D7067] hover:text-[#EA580C] flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#EA580C]" />
            <span>Raahi Home</span>
          </Link>
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-[#C2410C]">
            <HeartHandshake className="w-4 h-4 text-[#EA580C]" />
            <span>Family Reassurance Update</span>
          </div>
        </div>

        {/* Clean Reassurance Card on Light Paper Ground */}
        <div className="bg-white p-8 sm:p-12 rounded-3xl shadow-[0_20px_50px_rgba(15,23,42,0.06)] border border-[#E8E2D9] space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#FFF7ED] flex items-center justify-center text-[#EA580C] shadow-sm">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-mono text-[#C2410C] uppercase tracking-wider font-black">
                Emergency Transport Status
              </div>
              <h1 className="text-2xl sm:text-3xl font-display font-black tracking-tight text-[#2D231C]">
                Patient {caseId || 'R-1042'}
              </h1>
            </div>
          </div>

          {/* Plain, Honest Reassurance Sentence per spec H.5 */}
          <div className="p-6 sm:p-8 bg-[#FAF8F5] rounded-2xl border border-[#E8E2D9] text-base sm:text-lg text-[#4A3E36] leading-relaxed font-medium shadow-inner">
            {isCommitted && hospital ? (
              <span>
                Patient <b className="font-black text-[#2D231C]">{caseId || 'R-1042'}</b> is being taken to{' '}
                <b className="font-black text-[#2D231C]">{hospital.name}</b>. The hospital has confirmed it can receive this patient. Estimated arrival:{' '}
                <b className="font-black text-[#52796F]">{etaMinutes} minutes</b>.
              </span>
            ) : hospital ? (
              <span>
                Ambulance is coordinating routing for Patient{' '}
                <b className="font-black text-[#2D231C]">{caseId || 'R-1042'}</b>. Priority request dispatched to{' '}
                <b className="font-black text-[#2D231C]">{hospital.name}</b> and awaiting confirmation.
              </span>
            ) : (
              <span>
                Emergency transport active for Patient{' '}
                <b className="font-black text-[#2D231C]">{caseId || 'R-1042'}</b>. The automated coordination system is confirming destination capacity.
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-[#7D7067] font-mono font-semibold pt-2">
            <Clock className="w-4 h-4 text-[#EA580C]" />
            <span>Live status updated from verified ambulance telemetry.</span>
          </div>
        </div>

        <div className="text-center text-xs text-[#7D7067] font-mono font-bold">
          Raahi Emergency Coordination Network • Verified Patient Care
        </div>
      </div>
    </div>
  );
};
