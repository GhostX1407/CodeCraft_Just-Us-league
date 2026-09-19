import React, { useState, useEffect } from 'react';
import { stateStore } from '../../services/stateStore';
import {
  addAmbulance,
  updateAmbulance,
  removeAmbulance,
  approveRegistration,
  rejectRegistration,
} from '../../services/adminActions';
import type { Ambulance, AmbulanceType, AmbulanceFacility } from '../../types/domain';
import {
  Ambulance as AmbulanceIcon,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Radio,
  Navigation,
  Gauge,
  Phone,
  Clock,
  Trash2,
  Edit3,
  X,
  Activity,
  Shield,
} from 'lucide-react';
import clsx from 'clsx';

const ALL_FACILITIES: { key: AmbulanceFacility; label: string }[] = [
  { key: 'oxygen', label: 'Medical Oxygen' },
  { key: 'defibrillator', label: 'Automated External Defibrillator (AED)' },
  { key: 'ventilator', label: 'Transport Ventilator' },
  { key: 'stretcher', label: 'Hydraulic Stretcher' },
  { key: 'ecg', label: '12-Lead ECG Monitor' },
];

export const ManageAmbulancesPage: React.FC = () => {
  const [ambulances, setAmbulances] = useState<Ambulance[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAmbulance, setEditingAmbulance] = useState<Ambulance | null>(null);

  // New Ambulance Form State
  const [formVehicleNumber, setFormVehicleNumber] = useState('');
  const [formOrganization, setFormOrganization] = useState('Gujarat State EMS (108 Network)');
  const [formType, setFormType] = useState<AmbulanceType>('ALS');
  const [formCapacity, setFormCapacity] = useState('1');
  const [formContact, setFormContact] = useState('+91 98250 11088');
  const [formFacilities, setFormFacilities] = useState<AmbulanceFacility[]>([
    'oxygen',
    'defibrillator',
    'stretcher',
  ]);

  const loadData = () => {
    setAmbulances(stateStore.getAmbulances());
  };

  useEffect(() => {
    loadData();
    const unsub = stateStore.subscribe(loadData);
    return unsub;
  }, []);

  const pendingAmbulances = ambulances.filter((a) => a.status === 'pending');
  const activeAmbulances = ambulances.filter((a) => a.status !== 'pending');

  const filteredAmbulances = activeAmbulances.filter((a) => {
    const q = searchQuery.toLowerCase();
    return (
      a.vehicle_number.toLowerCase().includes(q) ||
      a.organization.toLowerCase().includes(q) ||
      a.id.toLowerCase().includes(q) ||
      a.ambulance_type.toLowerCase().includes(q)
    );
  });

  const availableCount = activeAmbulances.filter((a) => a.availability === 'available').length;
  const inTransitCount = activeAmbulances.filter(
    (a) => a.availability === 'en_route' || a.availability === 'busy'
  ).length;
  const maintenanceCount = activeAmbulances.filter((a) => a.availability === 'maintenance').length;

  const handleCreateAmbulance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formVehicleNumber.trim()) return;

    addAmbulance({
      vehicle_number: formVehicleNumber.trim().toUpperCase(),
      organization: formOrganization.trim(),
      ambulance_type: formType,
      capacity_patients: parseInt(formCapacity, 10) || 1,
      current_location: { lat: 21.185 + (Math.random() - 0.5) * 0.05, lng: 72.825 + (Math.random() - 0.5) * 0.05 },
      facilities: formFacilities,
      contact_number: formContact.trim(),
      availability: 'available',
      status: 'verified',
      speed_kmh: 0,
      heading_degrees: 0,
      last_updated_at: new Date().toISOString(),
    });

    setFormVehicleNumber('');
    setShowAddModal(false);
  };

  const handleUpdateStatus = (id: string, newAvailability: Ambulance['availability']) => {
    updateAmbulance(id, { availability: newAvailability });
  };

  const toggleFacility = (key: AmbulanceFacility) => {
    setFormFacilities((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-[#E8E2D9] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]">
              <AmbulanceIcon className="w-5 h-5" />
            </span>
            <h1 className="font-display font-black text-2xl text-[#2D231C]">
              Manage Emergency Fleet
            </h1>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-[#FEE2E2] text-[#B91C1C] border border-[#FECACA]">
              Dispatch Registry
            </span>
          </div>
          <p className="text-xs text-[#7D7067] font-medium mt-1">
            Commission emergency vehicles, monitor real-time telemetry, and audit fleet readiness across all EMS posts.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 rounded-2xl bg-[#EA580C] hover:bg-[#C2410C] text-white font-mono font-bold text-xs flex items-center gap-2 transition-all shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Ambulance</span>
        </button>
      </div>

      {/* Metrics Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-[#E8E2D9] shadow-xs flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-[#FFF7ED] text-[#EA580C] border border-[#FED7AA]">
            <AmbulanceIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-[#2D231C]">{activeAmbulances.length}</div>
            <div className="text-[11px] font-mono text-[#7D7067] uppercase font-bold">Total Fleet</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#E8E2D9] shadow-xs flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-[#EFF6F3] text-[#52796F] border border-[#52796F]/30">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-[#2D231C]">{availableCount}</div>
            <div className="text-[11px] font-mono text-[#7D7067] uppercase font-bold">Available Now</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#E8E2D9] shadow-xs flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-[#2D231C]">{inTransitCount}</div>
            <div className="text-[11px] font-mono text-[#7D7067] uppercase font-bold">En Route / Busy</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#E8E2D9] shadow-xs flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A]">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-[#2D231C]">{pendingAmbulances.length}</div>
            <div className="text-[11px] font-mono text-[#7D7067] uppercase font-bold">Pending Review</div>
          </div>
        </div>
      </div>

      {/* Section 1: Pending Ambulance Applications */}
      {pendingAmbulances.length > 0 && (
        <div className="p-5 rounded-3xl bg-[#FFFBEB]/60 border border-[#FDE68A] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-[#D97706]" />
              <h2 className="font-display font-black text-lg text-[#2D231C]">
                Pending Ambulance Registrations ({pendingAmbulances.length})
              </h2>
            </div>
            <span className="text-[11px] font-mono text-[#B45309] font-bold">
              Requires Paramedic Commissioning Approval
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingAmbulances.map((amb) => (
              <div
                key={amb.id}
                className="p-4 rounded-2xl bg-white border border-[#E8E2D9] shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-[#2D231C] font-mono">{amb.vehicle_number}</h3>
                    <p className="text-xs text-[#7D7067]">{amb.organization}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#FEE2E2] text-[#B91C1C] border border-[#FECACA]">
                    {amb.ambulance_type}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {amb.facilities?.map((f) => (
                    <span
                      key={f}
                      className="px-2 py-0.5 rounded-md bg-[#EFF6F3] text-[#52796F] text-[10px] font-mono font-bold border border-[#52796F]/20"
                    >
                      {f}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => approveRegistration(amb.id, 'ambulance')}
                    className="flex-1 py-2 rounded-xl bg-[#52796F] hover:bg-[#3D5A52] text-white font-mono font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Verify & Commission</span>
                  </button>
                  <button
                    onClick={() => {
                      const reason = prompt('Reason for declining this ambulance registration:') || 'Inspection criteria unmet.';
                      rejectRegistration(amb.id, 'ambulance', reason);
                    }}
                    className="px-3 py-2 rounded-xl border border-[#FECACA] bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#DC2626] font-mono font-bold text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 2: Active Fleet Units Directory */}
      <div className="p-6 rounded-3xl bg-white border border-[#E8E2D9] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display font-black text-lg text-[#2D231C]">
              Active Fleet Units ({filteredAmbulances.length})
            </h2>
            <p className="text-xs text-[#7D7067]">
              Real-time telemetry and dispatch statuses for emergency vehicles.
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-[#7D7067] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search vehicle number or type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E8E2D9] text-xs font-mono focus:border-[#EA580C] focus:outline-hidden"
            />
          </div>
        </div>

        {/* Fleet Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAmbulances.map((amb) => (
            <div
              key={amb.id}
              className="p-5 rounded-2xl border border-[#E8E2D9] bg-[#FAF8F5]/50 hover:bg-white transition-all space-y-3.5 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-[#2D231C] font-mono">
                        {amb.vehicle_number}
                      </h3>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-white border border-[#E8E2D9] text-[#7D7067] font-bold">
                        {amb.id}
                      </span>
                    </div>
                    <p className="text-xs text-[#7D7067] mt-0.5">{amb.organization}</p>
                  </div>

                  <span
                    className={clsx(
                      'px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border capitalize',
                      amb.availability === 'available'
                        ? 'bg-[#EFF6F3] text-[#52796F] border-[#52796F]/30'
                        : amb.availability === 'maintenance'
                        ? 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]'
                        : 'bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]'
                    )}
                  >
                    {amb.availability.replace('_', ' ')}
                  </span>
                </div>

                {/* Telemetry Row */}
                <div className="grid grid-cols-3 gap-2 py-2.5 my-2 border-y border-[#E8E2D9] text-center font-mono">
                  <div className="p-1.5 rounded-xl bg-white border border-[#E8E2D9]">
                    <span className="text-[9px] text-[#7D7067] block">TYPE</span>
                    <span className="text-xs font-black text-[#2D231C]">{amb.ambulance_type}</span>
                  </div>
                  <div className="p-1.5 rounded-xl bg-white border border-[#E8E2D9]">
                    <span className="text-[9px] text-[#7D7067] block">SPEED</span>
                    <span className="text-xs font-black text-[#2D231C]">{amb.speed_kmh || 0} km/h</span>
                  </div>
                  <div className="p-1.5 rounded-xl bg-white border border-[#E8E2D9]">
                    <span className="text-[9px] text-[#7D7067] block">HEADING</span>
                    <span className="text-xs font-black text-[#2D231C]">{amb.heading_degrees || 0}°</span>
                  </div>
                </div>

                {/* Facilities */}
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-[#7D7067] uppercase font-bold">
                    Equipped Facilities:
                  </span>
                  <div className="flex items-center gap-1 flex-wrap">
                    {amb.facilities?.map((fac) => (
                      <span
                        key={fac}
                        className="px-2 py-0.5 rounded-md bg-white border border-[#E8E2D9] text-[10px] font-mono text-[#2D231C]"
                      >
                        {fac}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Status Controls */}
              <div className="pt-3 border-t border-[#E8E2D9] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-[11px] font-mono text-[#7D7067]">
                    <Phone className="w-3 h-3 text-[#EA580C]" />
                    <span>{amb.contact_number || '+91 98250 11000'}</span>
                  </div>

                  <button
                    onClick={() => {
                      if (confirm(`Deregister vehicle ${amb.vehicle_number}?`)) {
                        removeAmbulance(amb.id);
                      }
                    }}
                    className="p-1.5 rounded-lg border border-[#FECACA] hover:bg-[#FEF2F2] text-[#DC2626] bg-white transition-colors cursor-pointer"
                    title="Remove from fleet"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Quick Availability Selector */}
                <div className="flex items-center gap-1 pt-1">
                  {(['available', 'en_route', 'maintenance'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => handleUpdateStatus(amb.id, st)}
                      className={clsx(
                        'flex-1 py-1 rounded-lg text-[10px] font-mono font-bold capitalize transition-all border cursor-pointer',
                        amb.availability === st
                          ? 'bg-[#2D231C] text-white border-[#2D231C]'
                          : 'bg-white text-[#7D7067] border-[#E8E2D9] hover:bg-[#FAF8F5]'
                      )}
                    >
                      {st.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Ambulance Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-[#E8E2D9] shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-[#E8E2D9] pb-4">
              <div className="flex items-center gap-2">
                <AmbulanceIcon className="w-5 h-5 text-[#EA580C]" />
                <h3 className="font-display font-black text-lg text-[#2D231C]">
                  Commission New Ambulance Unit
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg hover:bg-[#FAF8F5] text-[#7D7067]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAmbulance} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-mono font-bold text-[#2D231C]">Vehicle Registration *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. GJ-05-EM-1089"
                    value={formVehicleNumber}
                    onChange={(e) => setFormVehicleNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E8E2D9] text-xs font-mono uppercase focus:border-[#EA580C] focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-mono font-bold text-[#2D231C]">Unit Type</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as AmbulanceType)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E8E2D9] text-xs font-mono font-bold"
                  >
                    <option value="ALS">ALS (Advanced Life Support)</option>
                    <option value="BLS">BLS (Basic Life Support)</option>
                    <option value="Trauma">Trauma Mobile ICU</option>
                    <option value="Neonatal">Neonatal Intensive Care</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono font-bold text-[#2D231C]">Dispatch Base / Organization</label>
                <input
                  type="text"
                  value={formOrganization}
                  onChange={(e) => setFormOrganization(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E8E2D9] text-xs font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-mono font-bold text-[#2D231C]">Patient Capacity</label>
                  <input
                    type="number"
                    min="1"
                    value={formCapacity}
                    onChange={(e) => setFormCapacity(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E8E2D9] text-xs font-mono font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-mono font-bold text-[#2D231C]">Crew Contact Number</label>
                  <input
                    type="text"
                    value={formContact}
                    onChange={(e) => setFormContact(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E8E2D9] text-xs font-mono"
                  />
                </div>
              </div>

              {/* Facilities Checklist */}
              <div className="space-y-2">
                <label className="text-xs font-mono font-bold text-[#2D231C]">
                  On-Board Medical Facilities
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ALL_FACILITIES.map((fac) => {
                    const selected = formFacilities.includes(fac.key);
                    return (
                      <button
                        type="button"
                        key={fac.key}
                        onClick={() => toggleFacility(fac.key)}
                        className={clsx(
                          'p-2 rounded-xl border text-xs font-mono text-left flex items-center gap-2 transition-all cursor-pointer',
                          selected
                            ? 'border-[#EA580C] bg-[#FFF7ED] text-[#C2410C] font-bold'
                            : 'border-[#E8E2D9] text-[#7D7067] hover:bg-[#FAF8F5]'
                        )}
                      >
                        <span
                          className={clsx(
                            'w-3.5 h-3.5 rounded-sm border flex items-center justify-center text-[10px]',
                            selected ? 'bg-[#EA580C] text-white border-[#EA580C]' : 'border-[#E8E2D9]'
                          )}
                        >
                          {selected ? '✓' : ''}
                        </span>
                        <span>{fac.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E8E2D9]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#E8E2D9] font-mono text-xs text-[#7D7067]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#EA580C] text-white font-mono font-bold text-xs shadow-xs"
                >
                  Commission Ambulance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
