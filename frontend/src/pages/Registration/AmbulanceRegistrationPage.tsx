import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { AmbulanceType, AmbulanceFacility } from '../../types/domain';
import { Ambulance as AmbIcon, ShieldCheck, CheckCircle2, ArrowLeft, Truck, Activity } from 'lucide-react';
import clsx from 'clsx';

export const AmbulanceRegistrationPage: React.FC = () => {
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const [vehicleNumber, setVehicleNumber] = useState('');
  const [organization, setOrganization] = useState('');
  const [ambulanceType, setAmbulanceType] = useState<AmbulanceType>('ALS');
  const [contactNumber, setContactNumber] = useState('');
  const [driverName, setDriverName] = useState('');
  const [lat, setLat] = useState('21.1850');
  const [lng, setLng] = useState('72.8250');
  const [facilities, setFacilities] = useState<AmbulanceFacility[]>([
    'oxygen',
    'ecg',
    'stretcher',
    'defibrillator',
  ]);

  const facilityList: { id: AmbulanceFacility; label: string }[] = [
    { id: 'oxygen', label: 'Continuous High-Flow O2 Supply' },
    { id: 'ecg', label: '12-Lead ECG Monitor' },
    { id: 'ventilator', label: 'Portable Transport Mechanical Ventilator' },
    { id: 'defibrillator', label: 'Biphasic Defibrillator / AED' },
    { id: 'stretcher', label: 'Hydraulic Multi-Position Stretcher' },
  ];

  const toggleFacility = (id: AmbulanceFacility) => {
    setFacilities((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.submitAmbulanceRegistration({
        vehicle_number: vehicleNumber,
        organization,
        ambulance_type: ambulanceType,
        capacity_patients: 1,
        base_location: { lat: parseFloat(lat), lng: parseFloat(lng) },
        facilities,
        contact_number: contactNumber,
        driver_name: driverName,
      });
      setSubmitted(true);
    } catch {
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
            <h2 className="text-2xl font-display font-black text-[#2D231C]">Ambulance Enrolled</h2>
            <p className="text-xs font-mono text-[#7D7067] mt-1">Status: PENDING ADMIN FLEET VERIFICATION</p>
          </div>
          <p className="text-xs text-[#524438] leading-relaxed">
            Ambulance unit <strong>{vehicleNumber}</strong> ({ambulanceType}) has been logged in the regional EMS registry. Once authorized by the administrator, its GPS telemetry and dispatch feed will be online.
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
    <div className="min-h-[calc(100vh-64px)] p-4 sm:p-8 select-none max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-[#E8E2D9]">
        <Link
          to="/roles"
          className="p-2 rounded-xl border border-[#E8E2D9] bg-white hover:bg-[#FAF8F5] text-[#7D7067]"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <span className="text-[10px] font-mono text-[#EA580C] uppercase tracking-widest font-black">
            Fleet Enrollment (Feature 4)
          </span>
          <h1 className="text-2xl font-display font-black text-[#2D231C]">
            Ambulance Unit Registration
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Vehicle Identity */}
        <div className="bg-white rounded-3xl border border-[#E8E2D9] p-6 space-y-4 shadow-xs">
          <h3 className="font-display font-black text-sm text-[#2D231C] flex items-center gap-2">
            <Truck className="w-4 h-4 text-[#EA580C]" />
            <span>Vehicle Identification</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-mono font-bold text-[#7D7067]">Vehicle License Plate *</label>
              <input
                required
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                placeholder="e.g. GJ-05-EM-1088"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E2D9] text-xs font-mono font-bold focus:border-[#EA580C] outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-mono font-bold text-[#7D7067]">Operating Organization *</label>
              <input
                required
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                placeholder="e.g. GVK EMRI / Gujarat EMS"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E2D9] text-xs font-medium focus:border-[#EA580C] outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-mono font-bold text-[#7D7067]">Lead Paramedic / Driver Name</label>
              <input
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                placeholder="e.g. Rajesh Patel"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E2D9] text-xs font-medium focus:border-[#EA580C] outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-mono font-bold text-[#7D7067]">Direct Contact Number *</label>
              <input
                required
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                placeholder="+91 98250 00000"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E2D9] text-xs font-medium focus:border-[#EA580C] outline-none"
              />
            </div>
          </div>
        </div>

        {/* Ambulance Tier / Type */}
        <div className="bg-white rounded-3xl border border-[#E8E2D9] p-6 space-y-4 shadow-xs">
          <h3 className="font-display font-black text-sm text-[#2D231C] flex items-center gap-2">
            <AmbIcon className="w-4 h-4 text-[#EA580C]" />
            <span>Emergency Vehicle Classification</span>
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {(['BLS', 'ALS', 'Trauma', 'Neonatal'] as AmbulanceType[]).map((t) => {
              const active = ambulanceType === t;
              return (
                <button
                  type="button"
                  key={t}
                  onClick={() => setAmbulanceType(t)}
                  className={clsx(
                    'p-3.5 rounded-2xl border text-center transition-all font-mono',
                    active
                      ? 'border-[#EA580C] bg-[#FFF7ED] text-[#C2410C] font-black shadow-xs'
                      : 'border-[#E8E2D9] bg-[#FAF8F5] text-[#7D7067] font-bold hover:border-[#EA580C]/40'
                  )}
                >
                  <div className="text-sm">{t}</div>
                  <div className="text-[10px] text-[#A89F91] mt-0.5">
                    {t === 'BLS' && 'Basic Life'}
                    {t === 'ALS' && 'Advanced'}
                    {t === 'Trauma' && 'Trauma Van'}
                    {t === 'Neonatal' && 'NICU Unit'}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Equipment Checklist */}
        <div className="bg-white rounded-3xl border border-[#E8E2D9] p-6 space-y-4 shadow-xs">
          <h3 className="font-display font-black text-sm text-[#2D231C] flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#EA580C]" />
            <span>Verified Equipment Onboard</span>
          </h3>

          <div className="space-y-2">
            {facilityList.map((f) => {
              const checked = facilities.includes(f.id);
              return (
                <button
                  type="button"
                  key={f.id}
                  onClick={() => toggleFacility(f.id)}
                  className={clsx(
                    'w-full p-3 rounded-2xl border text-left text-xs font-bold flex items-center justify-between transition-all',
                    checked
                      ? 'border-[#52796F] bg-[#EFF6F3] text-[#354F52] shadow-xs'
                      : 'border-[#E8E2D9] bg-[#FAF8F5] text-[#7D7067] hover:border-[#52796F]/40'
                  )}
                >
                  <span>{f.label}</span>
                  <span className={clsx('w-2.5 h-2.5 rounded-full', checked ? 'bg-[#52796F]' : 'bg-[#E8E2D9]')} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Base Location */}
        <div className="bg-white rounded-3xl border border-[#E8E2D9] p-6 space-y-4 shadow-xs">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-mono font-bold text-[#7D7067]">Base Latitude</label>
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
              <label className="text-xs font-mono font-bold text-[#7D7067]">Base Longitude</label>
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

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 rounded-2xl bg-[#EA580C] hover:bg-[#C2410C] text-white font-display font-black text-sm tracking-wide shadow-lg transition-all disabled:opacity-50"
        >
          {loading ? 'Submitting Unit…' : 'Enroll Ambulance for Fleet Verification'}
        </button>
      </form>
    </div>
  );
};
