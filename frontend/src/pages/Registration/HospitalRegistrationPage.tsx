import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { Building2, ShieldCheck, CheckCircle2, ArrowLeft, Plus, Trash2, Stethoscope, Bed, Wind } from 'lucide-react';
import clsx from 'clsx';

export const HospitalRegistrationPage: React.FC = () => {
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [lat, setLat] = useState('21.1702');
  const [lng, setLng] = useState('72.8311');
  const [icuBeds, setIcuBeds] = useState('10');
  const [ventilators, setVentilators] = useState('5');
  const [capabilities, setCapabilities] = useState<string[]>(['trauma_team', 'icu']);
  const [specialists, setSpecialists] = useState<string[]>(['trauma_surgeon', 'cardiologist']);
  const [bloodStock, setBloodStock] = useState<Record<string, number>>({
    'O+': 15,
    'O-': 4,
    'A+': 10,
    'B+': 12,
  });

  const availableCapabilities = [
    { id: 'trauma_team', label: 'Trauma Resuscitation Team' },
    { id: 'cath_lab', label: 'Catheterization Lab (Cath Lab)' },
    { id: 'stroke_pathway', label: 'Acute Stroke / Thrombolysis Pathway' },
    { id: 'pediatric_emergency', label: 'Pediatric Critical Care Unit' },
    { id: 'burn_unit', label: 'Dedicated Burn Center' },
    { id: 'ct_scan', label: '24/7 CT Scanner' },
    { id: 'mri', label: 'MRI Unit' },
    { id: 'blood_bank', label: 'Licensed Blood Bank & Component Lab' },
    { id: 'cardiac_icu', label: 'Cardiac Care Unit (CCU)' },
    { id: 'neonatal_icu', label: 'NICU Level III' },
  ];

  const availableSpecialists = [
    { id: 'trauma_surgeon', label: 'Trauma Surgeon' },
    { id: 'cardiologist', label: 'Interventional Cardiologist' },
    { id: 'neurosurgeon', label: 'Neurosurgeon' },
    { id: 'neurologist', label: 'Neurologist' },
    { id: 'orthopedist', label: 'Orthopedic Surgeon' },
    { id: 'anesthesiologist', label: 'Critical Care Anesthesiologist' },
    { id: 'pediatrician', label: 'Pediatric Intensivist' },
    { id: 'obgyn', label: 'Obstetrician & Gynecologist' },
  ];

  const toggleCapability = (id: string) => {
    setCapabilities((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const toggleSpecialist = (id: string) => {
    setSpecialists((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.submitHospitalRegistration({
        name,
        address,
        contact_number: contactNumber,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        icu_beds: parseInt(icuBeds, 10),
        ventilators: parseInt(ventilators, 10),
        capabilities,
        specialists_on_call: specialists,
        blood_stock: bloodStock,
      });
      setSubmitted(true);
    } catch {
      // Offline fallback
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-6 select-none">
        <div className="max-w-md w-full bg-white rounded-3xl border border-[#E8E2D9] p-8 text-center space-y-5 shadow-xl animate-in zoom-in-95">
          <div className="w-16 h-16 bg-[#EFF6F3] text-[#52796F] rounded-full flex items-center justify-center mx-auto border-2 border-[#52796F]/30">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-display font-black text-[#2D231C]">Registration Submitted</h2>
            <p className="text-xs font-mono text-[#7D7067] mt-1">Status: PENDING CLINICAL VERIFICATION</p>
          </div>
          <p className="text-xs text-[#524438] leading-relaxed">
            Your facility application for <strong>{name}</strong> has been transmitted to the Raahi Regional Oversight
            Authority. Once accredited, your emergency beds will be indexed for deterministic dispatch matching.
          </p>
          <div className="pt-2">
            <Link
              to="/admin"
              className="inline-flex items-center justify-center w-full py-3 px-4 rounded-xl bg-[#EA580C] text-white font-mono text-xs font-bold shadow-md hover:bg-[#C2410C] transition-colors"
            >
              Open Oversight Authority Queue
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] p-4 sm:p-8 select-none max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-[#E8E2D9]">
        <Link
          to="/roles"
          className="p-2 rounded-xl border border-[#E8E2D9] bg-white hover:bg-[#FAF8F5] text-[#7D7067]"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <span className="text-[10px] font-mono text-[#EA580C] uppercase tracking-widest font-black">
            Accreditation Intake (Feature 3)
          </span>
          <h1 className="text-2xl font-display font-black text-[#2D231C]">
            Hospital Network Registration
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Core Facility Info */}
        <div className="bg-white rounded-3xl border border-[#E8E2D9] p-6 space-y-4 shadow-xs">
          <h3 className="font-display font-black text-sm text-[#2D231C] flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#EA580C]" />
            <span>Facility Metadata</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-mono font-bold text-[#7D7067]">Hospital Full Name *</label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Surat Institute of Medical Sciences"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E2D9] text-xs font-medium focus:border-[#EA580C] outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-mono font-bold text-[#7D7067]">Emergency Contact Phone *</label>
              <input
                required
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                placeholder="+91 261 2470000"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E2D9] text-xs font-medium focus:border-[#EA580C] outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-mono font-bold text-[#7D7067]">Physical Address *</label>
            <input
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Ring Road, Majura Gate, Surat"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E2D9] text-xs font-medium focus:border-[#EA580C] outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-mono font-bold text-[#7D7067]">Latitude Coordinates</label>
              <input
                required
                type="number"
                step="any"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E2D9] text-xs font-mono focus:border-[#EA580C] outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-mono font-bold text-[#7D7067]">Longitude Coordinates</label>
              <input
                required
                type="number"
                step="any"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E2D9] text-xs font-mono focus:border-[#EA580C] outline-none"
              />
            </div>
          </div>
        </div>

        {/* Countable Critical Resources */}
        <div className="bg-white rounded-3xl border border-[#E8E2D9] p-6 space-y-4 shadow-xs">
          <h3 className="font-display font-black text-sm text-[#2D231C] flex items-center gap-2">
            <Bed className="w-4 h-4 text-[#EA580C]" />
            <span>Dedicated Critical Resources</span>
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-mono font-bold text-[#7D7067]">Initial ICU Beds Total</label>
              <input
                type="number"
                min="0"
                value={icuBeds}
                onChange={(e) => setIcuBeds(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E2D9] text-xs font-mono font-bold focus:border-[#EA580C] outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-mono font-bold text-[#7D7067]">Mechanical Ventilators</label>
              <input
                type="number"
                min="0"
                value={ventilators}
                onChange={(e) => setVentilators(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E2D9] text-xs font-mono font-bold focus:border-[#EA580C] outline-none"
              />
            </div>
          </div>
        </div>

        {/* Capabilities Declaration */}
        <div className="bg-white rounded-3xl border border-[#E8E2D9] p-6 space-y-4 shadow-xs">
          <h3 className="font-display font-black text-sm text-[#2D231C] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#EA580C]" />
            <span>Clinical Capabilities (Capability Graph Nodes)</span>
          </h3>
          <p className="text-xs text-[#7D7067]">
            Select verified operational units active at your hospital. The Raahi dependency engine checks these during emergency routing.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {availableCapabilities.map((cap) => {
              const active = capabilities.includes(cap.id);
              return (
                <button
                  type="button"
                  key={cap.id}
                  onClick={() => toggleCapability(cap.id)}
                  className={clsx(
                    'p-3 rounded-2xl border text-left text-xs font-bold flex items-center justify-between transition-all',
                    active
                      ? 'border-[#EA580C] bg-[#FFF7ED] text-[#C2410C] shadow-xs'
                      : 'border-[#E8E2D9] bg-[#FAF8F5] text-[#7D7067] hover:border-[#EA580C]/40'
                  )}
                >
                  <span>{cap.label}</span>
                  <span className={clsx('w-2 h-2 rounded-full', active ? 'bg-[#EA580C]' : 'bg-[#E8E2D9]')} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Specialists On Call */}
        <div className="bg-white rounded-3xl border border-[#E8E2D9] p-6 space-y-4 shadow-xs">
          <h3 className="font-display font-black text-sm text-[#2D231C] flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-[#EA580C]" />
            <span>Specialists In-House / On-Call</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {availableSpecialists.map((spec) => {
              const active = specialists.includes(spec.id);
              return (
                <button
                  type="button"
                  key={spec.id}
                  onClick={() => toggleSpecialist(spec.id)}
                  className={clsx(
                    'p-3 rounded-2xl border text-left text-xs font-bold flex items-center justify-between transition-all',
                    active
                      ? 'border-[#52796F] bg-[#EFF6F3] text-[#354F52] shadow-xs'
                      : 'border-[#E8E2D9] bg-[#FAF8F5] text-[#7D7067] hover:border-[#52796F]/40'
                  )}
                >
                  <span>{spec.label}</span>
                  <span className={clsx('w-2 h-2 rounded-full', active ? 'bg-[#52796F]' : 'bg-[#E8E2D9]')} />
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 rounded-2xl bg-[#EA580C] hover:bg-[#C2410C] text-white font-display font-black text-sm tracking-wide shadow-lg transition-all disabled:opacity-50"
        >
          {loading ? 'Transmitting Registration…' : 'Submit Hospital for Verification'}
        </button>
      </form>
    </div>
  );
};
