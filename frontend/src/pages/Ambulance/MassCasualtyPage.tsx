import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Case, Hospital } from '../../types/domain';
import { useHospitals } from '../../hooks/useSubscriptions';
import { api, deriveNeedProfile } from '../../services/api';
import { DistributionBoard } from '../../components/domain/DistributionBoard';
import { ArrowLeft, Users, ShieldAlert } from 'lucide-react';

export const MassCasualtyPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: hospitals } = useHospitals();

  const [distributing, setDistributing] = useState(false);
  const [assignments, setAssignments] = useState<
    {
      case_id: string;
      patient_category: string;
      severity: string;
      assigned_hospital_id: string;
      assigned_hospital_name: string;
      reason: string;
      score: number;
    }[]
  >([]);

  // 4 Seeded Casualties from Single Incident Group
  const incidentGroupId = 'incident_highway_collision_09';
  const initialCases: Case[] = [
    {
      id: 'case_mc_01',
      created_at: Date.now(),
      category: 'trauma',
      severity: 'red',
      need_profile: deriveNeedProfile('trauma'),
      vitals_summary: 'Major crushing injury, BP 82/50, heavy bleeding',
      onset_time: '12 min ago',
      treatment_administered: 'Tourniquet, 2x large bore IV, 1L saline',
      patient_basic_info: { age: 34, sex: 'male' },
      incident_group_id: incidentGroupId,
      ambulance_location: { lat: 23.1310, lng: 72.5480 },
    },
    {
      id: 'case_mc_02',
      created_at: Date.now(),
      category: 'cardiac',
      severity: 'red',
      need_profile: deriveNeedProfile('cardiac'),
      vitals_summary: 'Trauma-induced cardiac arrhythmia, SpO2 90%',
      onset_time: '14 min ago',
      treatment_administered: 'Defibrillator monitoring, O2 at 10L/min',
      patient_basic_info: { age: 62, sex: 'female' },
      incident_group_id: incidentGroupId,
      ambulance_location: { lat: 23.1310, lng: 72.5480 },
    },
    {
      id: 'case_mc_03',
      created_at: Date.now(),
      category: 'pediatric',
      severity: 'yellow',
      need_profile: deriveNeedProfile('pediatric'),
      vitals_summary: 'Pediatric head contusion, Glasgow Coma 13, conscious',
      onset_time: '15 min ago',
      treatment_administered: 'C-collar applied, wound dressed',
      patient_basic_info: { age: 8, sex: 'male' },
      incident_group_id: incidentGroupId,
      ambulance_location: { lat: 23.1310, lng: 72.5480 },
    },
    {
      id: 'case_mc_04',
      created_at: Date.now(),
      category: 'trauma',
      severity: 'yellow',
      need_profile: deriveNeedProfile('trauma'),
      vitals_summary: 'Compound fracture right femur, hemodynamically stable',
      onset_time: '18 min ago',
      treatment_administered: 'Traction splint applied, analgesia administered',
      patient_basic_info: { age: 41, sex: 'female' },
      incident_group_id: incidentGroupId,
      ambulance_location: { lat: 23.1310, lng: 72.5480 },
    },
  ];

  const handleDistributeAll = async () => {
    setDistributing(true);
    const res = await api.massMatch(incidentGroupId, initialCases, {
      actor_type: 'ambulance',
      actor_id: 'amb_commander_01',
    });

    setTimeout(() => {
      setDistributing(false);
      if (res.success) {
        const mapped = res.data.distribution.map((d) => {
          const hosp = hospitals.find((h) => h.id === d.hospital_id);
          const c = initialCases.find((item) => item.id === d.case_id);
          return {
            case_id: d.case_id,
            patient_category: c?.category || 'trauma',
            severity: c?.severity || 'red',
            assigned_hospital_id: d.hospital_id,
            assigned_hospital_name: hosp?.name || 'Assigned Center',
            reason: d.reason,
            score: d.score,
          };
        });
        setAssignments(mapped);
      }
    }, 1200);
  };

  return (
    <div className="min-h-screen text-[#0F172A] p-4 sm:p-8 font-sans select-none relative z-10">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0]">
          <Link
            to="/ambulance"
            className="text-xs font-mono font-bold text-[#475569] hover:text-[#149B9E] flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-[#149B9E]" />
            <span>Back to Single Dispatch</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#E11D48] animate-pulse" />
            <span className="text-xs font-mono text-[#E11D48] uppercase tracking-wider font-extrabold">
              Mass-Casualty Incident Coordination
            </span>
          </div>
        </div>

        {/* Incident Context Banner */}
        <div className="p-6 bg-white rounded-3xl border border-[#E2E8F0] shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#0D7C7E] font-black bg-[#E6F7F7] px-2.5 py-1 rounded-full border border-[#149B9E]/30">
              Active Multi-Casualty Protocol
            </span>
            <h1 className="text-xl sm:text-2xl font-display font-black text-[#0F172A] tracking-tight mt-2">
              Expressway Multi-Vehicle Collision (4 Immediate Casualties)
            </h1>
            <p className="text-xs text-[#475569] mt-1 font-mono font-semibold">
              Incident Group: <code className="text-[#149B9E] font-bold">{incidentGroupId}</code>
            </p>
          </div>

          <div className="text-right">
            <span className="text-xs font-mono font-bold text-[#64748B] uppercase">Total Casualties</span>
            <div className="text-2xl font-mono font-black text-[#0F172A]">4 Patients</div>
          </div>
        </div>

        {/* The Distribution Visualization Board */}
        <DistributionBoard
          cases={initialCases}
          hospitals={hospitals}
          assignments={assignments}
          onDistributeAll={handleDistributeAll}
          isDistributing={distributing}
        />
      </div>
    </div>
  );
};
