import React, { useState } from 'react';
import clsx from 'clsx';
import { Hospital, BloodType } from '../../types/domain';
import { FreshnessBadge } from './FreshnessBadge';
import { ReliabilityMeter } from './ReliabilityMeter';
import { Stepper, Toggle } from '../primitives/Toggle';
import { Button } from '../primitives/Button';
import { api } from '../../services/api';

interface HospitalCapabilityPanelProps {
  hospital: Hospital;
  editable?: boolean;
  onUpdated?: (updated: Hospital) => void;
  className?: string;
}

export const HospitalCapabilityPanel: React.FC<HospitalCapabilityPanelProps> = ({
  hospital,
  editable = false,
  onUpdated,
  className,
}) => {
  // Local form state for editable mode
  const [icuFree, setIcuFree] = useState(hospital.icu_beds_free);
  const [ventilatorsFree, setVentilatorsFree] = useState(hospital.ventilators_free);
  const [traumaTeam, setTraumaTeam] = useState(hospital.trauma_team_on_shift);
  const [erLoad, setErLoad] = useState(hospital.er_load_score);
  const [schemes, setSchemes] = useState(hospital.accepts_scheme_patients);
  const [oNegStock, setONegStock] = useState(hospital.blood_stock['O-'] || 0);

  const [saving, setSaving] = useState(false);
  const [savedNote, setSavedNote] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const updatedBloodStock = { ...hospital.blood_stock, 'O-': oNegStock };
    const res = await api.updateCapabilities(
      hospital.id,
      {
        icu_beds_free: icuFree,
        ventilators_free: ventilatorsFree,
        trauma_team_on_shift: traumaTeam,
        er_load_score: erLoad,
        accepts_scheme_patients: schemes,
        blood_stock: updatedBloodStock,
      },
      { actor_type: 'hospital', actor_id: hospital.id }
    );
    setSaving(false);
    if (res.success) {
      setSavedNote(true);
      setTimeout(() => setSavedNote(false), 2500);
      if (onUpdated) onUpdated(res.data);
    }
  };

  return (
    <div className={clsx('border border-[#E8E2D9] rounded-2xl bg-white p-5 shadow-sm select-none', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[#E8E2D9]">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-[#7D7067] font-bold">
            Hospital Telemetry
          </span>
          <h3 className="text-lg font-black text-[#2D231C] tracking-tight">{hospital.name}</h3>
        </div>
        <FreshnessBadge lastUpdatedAt={hospital.last_updated_at} />
      </div>

      <div className="py-4 border-b border-[#E8E2D9]">
        <ReliabilityMeter score={hospital.reliability_score} />
      </div>

      {editable ? (
        /* EDITABLE MODE: Toggles & Steppers, Zero Free Text */
        <div className="space-y-4 pt-4">
          <div className="text-xs font-mono uppercase tracking-wider text-[#EA580C] font-bold">
            Operational Capabilities (Steppers & Toggles)
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Toggle
              label="Trauma Team Active"
              sublabel="Fully staffed emergency trauma surgical bay"
              checked={traumaTeam}
              onChange={setTraumaTeam}
            />

            <Toggle
              label="Accepts PMJAY / Scheme Patients"
              sublabel="Government subsidized bed reservations"
              checked={schemes}
              onChange={setSchemes}
            />

            <Stepper
              label="Free ICU Beds"
              value={icuFree}
              onChange={setIcuFree}
              min={0}
              max={30}
              unit="beds"
            />

            <Stepper
              label="Free Ventilators"
              value={ventilatorsFree}
              onChange={setVentilatorsFree}
              min={0}
              max={20}
              unit="units"
            />

            <Stepper
              label="ER Load Score"
              value={erLoad}
              onChange={setErLoad}
              min={1}
              max={5}
              unit="/5"
            />

            <Stepper
              label="O- Negative Blood Stock"
              value={oNegStock}
              onChange={setONegStock}
              min={0}
              max={50}
              unit="units"
            />
          </div>

          <div className="pt-2 flex items-center justify-between">
            {savedNote ? (
              <span className="text-sm font-mono text-[#52796F] font-bold">
                ✓ Status updated — freshness renewed
              </span>
            ) : (
              <span className="text-xs text-[#7D7067] font-medium">
                Modifications immediately broadcast to live routing network.
              </span>
            )}
            <Button
              variant="primary"
              size="md"
              loading={saving}
              onClick={handleSave}
              className="px-6 font-bold"
            >
              Update Status
            </Button>
          </div>
        </div>
      ) : (
        /* READ-ONLY REPORTING VIEW */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-4 font-mono text-xs">
          <div className="bg-[#FAF8F5] p-3 rounded-xl border border-[#E8E2D9]">
            <div className="text-[#7D7067] text-[10px] font-bold uppercase">Trauma Team</div>
            <div className={clsx('text-sm font-black mt-0.5', hospital.trauma_team_on_shift ? 'text-[#52796F]' : 'text-[#7D7067]')}>
              {hospital.trauma_team_on_shift ? 'ON SHIFT' : 'OFF'}
            </div>
          </div>

          <div className="bg-[#FAF8F5] p-3 rounded-xl border border-[#E8E2D9]">
            <div className="text-[#7D7067] text-[10px] font-bold uppercase">ICU Beds Free</div>
            <div className="text-sm font-black text-[#2D231C] mt-0.5">
              {hospital.icu_beds_free} beds
            </div>
          </div>

          <div className="bg-[#FAF8F5] p-3 rounded-xl border border-[#E8E2D9]">
            <div className="text-[#7D7067] text-[10px] font-bold uppercase">Ventilators</div>
            <div className="text-sm font-black text-[#2D231C] mt-0.5">
              {hospital.ventilators_free} free
            </div>
          </div>

          <div className="bg-[#FAF8F5] p-3 rounded-xl border border-[#E8E2D9]">
            <div className="text-[#7D7067] text-[10px] font-bold uppercase">ER Load</div>
            <div className="text-sm font-black text-[#2D231C] mt-0.5">
              {hospital.er_load_score}/5
            </div>
          </div>

          <div className="col-span-2 bg-[#FAF8F5] p-3 rounded-xl border border-[#E8E2D9]">
            <div className="text-[#7D7067] text-[10px] font-bold uppercase">Specialists On Call</div>
            <div className="text-xs text-[#2D231C] mt-1 flex flex-wrap gap-1 font-sans">
              {hospital.specialists_on_call.map((s) => (
                <span key={s} className="px-2 py-0.5 bg-[#E8E2D9] text-[#2D231C] rounded-md text-[11px] font-bold">
                  {s.replace('_', ' ')}
                </span>
              ))}
            </div>
          </div>

          <div className="col-span-2 bg-[#FAF8F5] p-3 rounded-xl border border-[#E8E2D9]">
            <div className="text-[#7D7067] text-[10px] font-bold uppercase">Blood Inventory</div>
            <div className="text-xs text-[#2D231C] mt-1 flex flex-wrap gap-1.5">
              {Object.entries(hospital.blood_stock).map(([type, units]) => (
                <span key={type} className="text-[#7D7067] font-mono">
                  {type}: <b className="text-[#2D231C] font-bold">{units}</b>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
