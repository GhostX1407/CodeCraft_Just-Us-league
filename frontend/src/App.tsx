import React from 'react';

export default function App() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-xl p-8 rounded-2xl bg-slate-800/80 border border-slate-700 shadow-2xl backdrop-blur">
        <h1 className="text-3xl font-bold tracking-tight text-white mb-3">
          Rahi — Coordination System
        </h1>
        <p className="text-slate-400 text-sm mb-6">
          Capability-Match Ambulance–Hospital Coordination Platform
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          Repository Foundation Initialized
        </div>
        <p className="text-slate-500 text-xs mt-6">
          Core development will proceed in subsequent phases across dedicated feature branches.
        </p>
      </div>
    </div>
  );
}
