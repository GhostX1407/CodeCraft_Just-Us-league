import React, { useState, useEffect } from 'react';
import { stateStore } from '../../services/stateStore';
import {
  addHospital,
  updateHospital,
  removeHospital,
  approveRegistration,
  rejectRegistration,
} from '../../services/adminActions';
import type { Hospital, HospitalRegistrationRecord } from '../../types/domain';
import {
  Building2,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  HeartPulse,
  Wind,
  Droplet,
  Trash2,
  Edit3,
  X,
  MapPin,
  Phone,
  ShieldCheck,
  Clock,
  Sparkles,
  Layers,
} from 'lucide-react';
import clsx from 'clsx';

const ALL_CAPABILITIES = [
  { key: 'trauma_team', label: 'Trauma Team on Shift' },
  { key: 'icu', label: 'ICU Critical Care' },
  { key: 'ventilator', label: 'Advanced Ventilator Support' },
  { key: 'ct_scanner', label: '24/7 CT Scanner' },
  { key: 'blood_bank', label: 'On-site Blood Bank' },
  { key: 'maternity', label: 'Maternity / Neonatal Bay' },
  { key: 'burn_unit', label: 'Burn Specialty Unit' },
  { key: 'pediatric_emergency', label: 'Pediatric Emergency Care' },
  { key: 'dialysis', label: 'Acute Hemodialysis' },
];

export const ManageHospitalsPage: React.FC = () => {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [registrations, setRegistrations] = useState<HospitalRegistrationRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingHospital, setEditingHospital] = useState<Hospital | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // New Hospital Form
  const [formName, setFormName] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formLat, setFormLat] = useState('21.1702');
  const [formLng, setFormLng] = useState('72.8311');
  const [formContact, setFormContact] = useState('+91 261 245 0000');
  const [formIcuBeds, setFormIcuBeds] = useState('6');
  const [formVentilators, setFormVentilators] = useState('4');
  const [formSpecialists, setFormSpecialists] = useState('Cardiologist, Trauma Surgeon, Intensivist');
  const [formCapabilities, setFormCapabilities] = useState<string[]>(['trauma_team', 'icu', 'ventilator', 'ct_scanner']);

  const loadData = () => {
    setHospitals(stateStore.getHospitals());
    setRegistrations(stateStore.getHospitalRegistrations());
  };

  useEffect(() => {
    loadData();
    const unsub = stateStore.subscribe(loadData);
    return unsub;
  }, []);

  const pendingRegistrations = registrations.filter((r) => r.status === 'pending');

  const filteredHospitals = hospitals.filter((h) => {
    const q = searchQuery.toLowerCase();
    return (
      h.name.toLowerCase().includes(q) ||
      h.id.toLowerCase().includes(q) ||
      h.specialists_on_call.some((s) => s.toLowerCase().includes(q))
    );
  });

  const totalIcuBeds = hospitals.reduce((sum, h) => sum + (h.icu_beds_free || 0), 0);
  const totalVentilators = hospitals.reduce((sum, h) => sum + (h.ventilators_free || 0), 0);

  const handleCreateHospital = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const specs = formSpecialists
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    addHospital({
      name: formName.trim(),
      lat: parseFloat(formLat) || 21.1702,
      lng: parseFloat(formLng) || 72.8311,
      trauma_team_on_shift: formCapabilities.includes('trauma_team'),
      specialists_on_call: specs,
      icu_beds_free: parseInt(formIcuBeds, 10) || 0,
      ventilators_free: parseInt(formVentilators, 10) || 0,
      blood_stock: { 'O+': 8, 'O-': 3, 'A+': 6, 'B+': 7, 'AB+': 4 },
      er_load_score: 2,
      accepts_scheme_patients: true,
      last_updated_at: Date.now(),
      reliability_score: 1.0,
      contact_number: formContact.trim(),
    });

    // Reset Form
    setFormName('');
    setFormAddress('');
    setShowAddModal(false);
  };

  const handleUpdateHospital = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHospital) return;

    updateHospital(editingHospital.id, {
      name: editingHospital.name,
      icu_beds_free: editingHospital.icu_beds_free,
      ventilators_free: editingHospital.ventilators_free,
      er_load_score: editingHospital.er_load_score,
      trauma_team_on_shift: editingHospital.trauma_team_on_shift,
      contact_number: editingHospital.contact_number,
    });

    setEditingHospital(null);
  };

  const toggleCapability = (key: string) => {
    setFormCapabilities((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-[#E8E2D9] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A]">
              <Building2 className="w-5 h-5" />
            </span>
            <h1 className="font-display font-black text-2xl text-[#2D231C]">
              Manage Hospital Registry
            </h1>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]">
              Regional Authority
            </span>
          </div>
          <p className="text-xs text-[#7D7067] font-medium mt-1">
            Configure accredited hospitals, verify intake capabilities, and review pending facility applications.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 rounded-2xl bg-[#EA580C] hover:bg-[#C2410C] text-white font-mono font-bold text-xs flex items-center gap-2 transition-all shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Hospital</span>
        </button>
      </div>

      {/* Metrics Counter Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-[#E8E2D9] shadow-xs flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-[#FFF7ED] text-[#EA580C] border border-[#FED7AA]">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-[#2D231C]">{hospitals.length}</div>
            <div className="text-[11px] font-mono text-[#7D7067] uppercase font-bold">Active Hospitals</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#E8E2D9] shadow-xs flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-[#EFF6F3] text-[#52796F] border border-[#52796F]/30">
            <HeartPulse className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-[#2D231C]">{totalIcuBeds}</div>
            <div className="text-[11px] font-mono text-[#7D7067] uppercase font-bold">Free ICU Beds</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#E8E2D9] shadow-xs flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-[#F0F9FF] text-[#0284C7] border border-[#BAE6FD]">
            <Wind className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-[#2D231C]">{totalVentilators}</div>
            <div className="text-[11px] font-mono text-[#7D7067] uppercase font-bold">Ventilators Free</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#E8E2D9] shadow-xs flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-[#2D231C]">{pendingRegistrations.length}</div>
            <div className="text-[11px] font-mono text-[#7D7067] uppercase font-bold">Pending Review</div>
          </div>
        </div>
      </div>

      {/* Section 1: Pending Hospital Registrations Queue */}
      {pendingRegistrations.length > 0 && (
        <div className="p-5 rounded-3xl bg-[#FFFBEB]/60 border border-[#FDE68A] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-[#D97706]" />
              <h2 className="font-display font-black text-lg text-[#2D231C]">
                Pending Hospital Registrations ({pendingRegistrations.length})
              </h2>
            </div>
            <span className="text-[11px] font-mono text-[#B45309] font-bold">
              Action Required for Routing Accreditation
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingRegistrations.map((reg) => (
              <div
                key={reg.id}
                className="p-4 rounded-2xl bg-white border border-[#E8E2D9] shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-sm text-[#2D231C]">{reg.name}</h3>
                    <p className="text-xs text-[#7D7067] flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-[#EA580C]" />
                      <span>{reg.address || 'Surat Regional Sector'}</span>
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]">
                    Pending
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 py-2 border-y border-[#E8E2D9] text-xs font-mono">
                  <div>
                    <span className="text-[#7D7067] text-[10px] block">ICU Beds</span>
                    <span className="font-black text-[#2D231C]">{reg.icu_beds}</span>
                  </div>
                  <div>
                    <span className="text-[#7D7067] text-[10px] block">Ventilators</span>
                    <span className="font-black text-[#2D231C]">{reg.ventilators}</span>
                  </div>
                  <div>
                    <span className="text-[#7D7067] text-[10px] block">Contact</span>
                    <span className="font-bold text-[#2D231C] truncate block">{reg.contact_number}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {reg.capabilities?.slice(0, 4).map((cap) => (
                    <span
                      key={cap}
                      className="px-2 py-0.5 rounded-md bg-[#EFF6F3] text-[#52796F] text-[10px] font-mono font-bold border border-[#52796F]/20"
                    >
                      {cap.replace('_', ' ')}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => approveRegistration(reg.id, 'hospital')}
                    className="flex-1 py-2 rounded-xl bg-[#52796F] hover:bg-[#3D5A52] text-white font-mono font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approve & Accredit</span>
                  </button>
                  <button
                    onClick={() => setRejectingId(reg.id)}
                    className="px-3 py-2 rounded-xl border border-[#FECACA] bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#DC2626] font-mono font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
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

      {/* Section 2: Accredited Hospitals Directory */}
      <div className="p-6 rounded-3xl bg-white border border-[#E8E2D9] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display font-black text-lg text-[#2D231C]">
              Accredited Network Hospitals ({filteredHospitals.length})
            </h2>
            <p className="text-xs text-[#7D7067]">
              Live operational capacities referenced by the capability-match routing algorithm.
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-[#7D7067] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search hospitals or specialists..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E8E2D9] text-xs font-mono focus:border-[#EA580C] focus:outline-hidden"
            />
          </div>
        </div>

        {/* Hospital Cards / Table */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredHospitals.map((hosp) => (
            <div
              key={hosp.id}
              className="p-5 rounded-2xl border border-[#E8E2D9] bg-[#FAF8F5]/50 hover:bg-white transition-all space-y-3.5 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-sm text-[#2D231C] leading-snug">{hosp.name}</h3>
                    <span className="text-[10px] font-mono text-[#7D7067] block mt-0.5">
                      ID: {hosp.id}
                    </span>
                  </div>
                  <span
                    className={clsx(
                      'px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border',
                      hosp.trauma_team_on_shift
                        ? 'bg-[#EFF6F3] text-[#52796F] border-[#52796F]/30'
                        : 'bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]'
                    )}
                  >
                    {hosp.trauma_team_on_shift ? 'Trauma Live' : 'No Trauma Shift'}
                  </span>
                </div>

                {/* Capacity Badges */}
                <div className="grid grid-cols-3 gap-2 py-3 my-2 border-y border-[#E8E2D9] text-center font-mono">
                  <div className="p-1.5 rounded-xl bg-white border border-[#E8E2D9]">
                    <span className="text-[9px] text-[#7D7067] block">ICU BEDS</span>
                    <span className="text-base font-black text-[#2D231C]">{hosp.icu_beds_free}</span>
                  </div>
                  <div className="p-1.5 rounded-xl bg-white border border-[#E8E2D9]">
                    <span className="text-[9px] text-[#7D7067] block">VENTS</span>
                    <span className="text-base font-black text-[#2D231C]">{hosp.ventilators_free}</span>
                  </div>
                  <div className="p-1.5 rounded-xl bg-white border border-[#E8E2D9]">
                    <span className="text-[9px] text-[#7D7067] block">ER LOAD</span>
                    <span
                      className={clsx(
                        'text-base font-black',
                        hosp.er_load_score <= 2
                          ? 'text-[#52796F]'
                          : hosp.er_load_score === 3
                          ? 'text-[#D97706]'
                          : 'text-[#DC2626]'
                      )}
                    >
                      {hosp.er_load_score}/5
                    </span>
                  </div>
                </div>

                {/* Specialists */}
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-[#7D7067] uppercase font-bold">
                    Specialists on Call:
                  </span>
                  <div className="flex items-center gap-1 flex-wrap">
                    {hosp.specialists_on_call.slice(0, 3).map((spec) => (
                      <span
                        key={spec}
                        className="px-2 py-0.5 rounded-md bg-white border border-[#E8E2D9] text-[10px] font-mono text-[#2D231C]"
                      >
                        {spec}
                      </span>
                    ))}
                    {hosp.specialists_on_call.length > 3 && (
                      <span className="text-[10px] font-mono text-[#7D7067]">
                        +{hosp.specialists_on_call.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-[#E8E2D9]">
                <div className="flex items-center gap-1 text-[11px] font-mono text-[#7D7067]">
                  <Phone className="w-3 h-3 text-[#EA580C]" />
                  <span>{hosp.contact_number || '+91 261 220 0000'}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setEditingHospital(hosp)}
                    className="p-1.5 rounded-lg border border-[#E8E2D9] hover:border-[#EA580C] text-[#7D7067] hover:text-[#EA580C] bg-white transition-colors cursor-pointer"
                    title="Edit capacity"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Deactivate ${hosp.name} from emergency dispatch?`)) {
                        removeHospital(hosp.id);
                      }
                    }}
                    className="p-1.5 rounded-lg border border-[#FECACA] hover:bg-[#FEF2F2] text-[#DC2626] bg-white transition-colors cursor-pointer"
                    title="Deactivate hospital"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Hospital Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-3xl border border-[#E8E2D9] shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-[#E8E2D9] pb-4">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#EA580C]" />
                <h3 className="font-display font-black text-lg text-[#2D231C]">
                  Add Accredited Hospital
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg hover:bg-[#FAF8F5] text-[#7D7067]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateHospital} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-mono font-bold text-[#2D231C]">Hospital Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sterling Institute of Critical Care"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E8E2D9] text-xs font-mono focus:border-[#EA580C] focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-mono font-bold text-[#2D231C]">Emergency Bay Contact</label>
                  <input
                    type="text"
                    placeholder="+91 261 245 0000"
                    value={formContact}
                    onChange={(e) => setFormContact(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E8E2D9] text-xs font-mono focus:border-[#EA580C] focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono font-bold text-[#2D231C]">Address / Sector</label>
                <input
                  type="text"
                  placeholder="Ring Road, Athwa Lines, Surat"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E8E2D9] text-xs font-mono focus:border-[#EA580C] focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-mono font-bold text-[#2D231C]">Latitude</label>
                  <input
                    type="text"
                    value={formLat}
                    onChange={(e) => setFormLat(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E8E2D9] text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-mono font-bold text-[#2D231C]">Longitude</label>
                  <input
                    type="text"
                    value={formLng}
                    onChange={(e) => setFormLng(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E8E2D9] text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-mono font-bold text-[#2D231C]">Free ICU Beds</label>
                  <input
                    type="number"
                    min="0"
                    value={formIcuBeds}
                    onChange={(e) => setFormIcuBeds(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E8E2D9] text-xs font-mono font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-mono font-bold text-[#2D231C]">Ventilators</label>
                  <input
                    type="number"
                    min="0"
                    value={formVentilators}
                    onChange={(e) => setFormVentilators(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E8E2D9] text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono font-bold text-[#2D231C]">
                  Specialists on Call (comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="Cardiologist, Neurosurgeon, Intensivist, Pediatrician"
                  value={formSpecialists}
                  onChange={(e) => setFormSpecialists(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E8E2D9] text-xs font-mono"
                />
              </div>

              {/* Capabilities checklist */}
              <div className="space-y-2">
                <label className="text-xs font-mono font-bold text-[#2D231C]">
                  Accredited Clinical Capabilities
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ALL_CAPABILITIES.map((cap) => {
                    const selected = formCapabilities.includes(cap.key);
                    return (
                      <button
                        type="button"
                        key={cap.key}
                        onClick={() => toggleCapability(cap.key)}
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
                        <span>{cap.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E8E2D9]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#E8E2D9] font-mono text-xs text-[#7D7067] hover:bg-[#FAF8F5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white font-mono font-bold text-xs shadow-xs"
                >
                  Accredit & Save Hospital
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Hospital Capacity Modal */}
      {editingHospital && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl border border-[#E8E2D9] shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E8E2D9] pb-3">
              <h3 className="font-display font-black text-base text-[#2D231C]">
                Edit Hospital Capacity
              </h3>
              <button
                onClick={() => setEditingHospital(null)}
                className="p-1 rounded-lg hover:bg-[#FAF8F5] text-[#7D7067]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateHospital} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-mono font-bold text-[#2D231C]">Hospital Name</label>
                <input
                  type="text"
                  value={editingHospital.name}
                  onChange={(e) =>
                    setEditingHospital({ ...editingHospital, name: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#E8E2D9] text-xs font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-mono font-bold text-[#2D231C]">Free ICU Beds</label>
                  <input
                    type="number"
                    min="0"
                    value={editingHospital.icu_beds_free}
                    onChange={(e) =>
                      setEditingHospital({
                        ...editingHospital,
                        icu_beds_free: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#E8E2D9] text-xs font-mono font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-mono font-bold text-[#2D231C]">Ventilators Free</label>
                  <input
                    type="number"
                    min="0"
                    value={editingHospital.ventilators_free}
                    onChange={(e) =>
                      setEditingHospital({
                        ...editingHospital,
                        ventilators_free: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#E8E2D9] text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-mono font-bold text-[#2D231C]">ER Load (1-5)</label>
                  <select
                    value={editingHospital.er_load_score}
                    onChange={(e) =>
                      setEditingHospital({
                        ...editingHospital,
                        er_load_score: parseInt(e.target.value, 10) || 1,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#E8E2D9] text-xs font-mono font-bold"
                  >
                    <option value={1}>1 - Low Load</option>
                    <option value={2}>2 - Normal</option>
                    <option value={3}>3 - Elevated</option>
                    <option value={4}>4 - High Congestion</option>
                    <option value={5}>5 - Overloaded</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-mono font-bold text-[#2D231C]">Trauma Shift</label>
                  <select
                    value={editingHospital.trauma_team_on_shift ? 'true' : 'false'}
                    onChange={(e) =>
                      setEditingHospital({
                        ...editingHospital,
                        trauma_team_on_shift: e.target.value === 'true',
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#E8E2D9] text-xs font-mono font-bold"
                  >
                    <option value="true">Active on Shift</option>
                    <option value="false">Unavailable</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E8E2D9]">
                <button
                  type="button"
                  onClick={() => setEditingHospital(null)}
                  className="px-4 py-2 rounded-xl border border-[#E8E2D9] font-mono text-xs text-[#7D7067]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#52796F] text-white font-mono font-bold text-xs shadow-xs"
                >
                  Update Hospital
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Registration Reason Modal */}
      {rejectingId && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl border border-[#FECACA] shadow-2xl p-6 space-y-4">
            <h3 className="font-display font-black text-base text-[#DC2626]">
              Decline Hospital Registration
            </h3>
            <p className="text-xs text-[#7D7067]">
              Provide a rationale for why this facility cannot be accredited at this time.
            </p>

            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Missing 24/7 ICU certification or insufficient emergency bay ramp access."
              className="w-full p-3 rounded-xl border border-[#E8E2D9] text-xs font-mono focus:border-[#DC2626] focus:outline-hidden"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setRejectingId(null);
                  setRejectReason('');
                }}
                className="px-4 py-2 rounded-xl border border-[#E8E2D9] font-mono text-xs text-[#7D7067]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  rejectRegistration(rejectingId, 'hospital', rejectReason);
                  setRejectingId(null);
                  setRejectReason('');
                }}
                className="px-4 py-2 rounded-xl bg-[#DC2626] text-white font-mono font-bold text-xs shadow-xs"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
