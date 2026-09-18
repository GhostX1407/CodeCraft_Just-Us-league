import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { StatusBadge } from '../../components/domain/StatusBadge';
import { FreshnessBadge } from '../../components/domain/FreshnessBadge';
import { Countdown } from '../../components/domain/Countdown';
import { CommitmentCircuit } from '../../components/domain/CommitmentCircuit';
import { ScoreBreakdown } from '../../components/domain/ScoreBreakdown';
import { NeedProfileChips } from '../../components/domain/NeedProfileChips';
import { ReliabilityMeter } from '../../components/domain/ReliabilityMeter';
import { Button } from '../../components/primitives/Button';
import { Card } from '../../components/primitives/Card';
import { LoadingState } from '../../components/feedback/LoadingState';
import { EmptyState } from '../../components/feedback/EmptyState';
import { ErrorState } from '../../components/feedback/ErrorState';
import { SEED_HOSPITALS } from '../../services/seedData';
import { ArrowLeft, Layers } from 'lucide-react';
import { RequestStatus, Freshness } from '../../types/domain';

export const ComponentGalleryPage: React.FC = () => {
  const [circuitStatus, setCircuitStatus] = useState<RequestStatus>('pending');
  const [circuitFreshness, setCircuitFreshness] = useState<Freshness>('fresh');
  const demoExpiresAt = Date.now() + 24 * 1000;

  return (
    <div className="min-h-screen bg-ink-900 text-text-hi p-6 md:p-10 font-sans select-none space-y-10">
      <div className="max-w-5xl mx-auto space-y-10">
        {/* Masthead */}
        <div className="flex items-center justify-between pb-6 border-b border-line-1/40">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="text-xs font-mono text-text-low hover:text-text-hi flex items-center gap-1 border border-line-1/60 px-2.5 py-1 rounded bg-ink-800"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Role Chooser</span>
            </Link>
            <div>
              <div className="text-xs font-mono text-signal uppercase tracking-wider font-bold">
                Design System & Component Contract Inspection
              </div>
              <h1 className="text-2xl font-bold text-text-hi tracking-tight">
                Raahi Component Testbench (/dev/components)
              </h1>
            </div>
          </div>
          <span className="text-xs font-mono text-text-low">Part F.10 Verification</span>
        </div>

        {/* 1. CommitmentCircuit Interactive Sandbox */}
        <div className="p-6 rounded border border-line-1 bg-ink-800/60 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-text-hi">G.1 CommitmentCircuit</h3>
              <p className="text-xs text-text-mid">
                The product metaphor: pending pulse, accepted lock sweep, fracture & drift, and decay.
              </p>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-2">
              {(['pending', 'accepted', 'rejected', 'timed_out', 'superseded'] as RequestStatus[]).map(
                (st) => (
                  <button
                    key={st}
                    onClick={() => setCircuitStatus(st)}
                    className={`px-2.5 py-1 text-xs font-mono rounded border capitalize ${
                      circuitStatus === st
                        ? 'border-signal bg-signal/15 text-signal font-bold'
                        : 'border-line-1 text-text-low'
                    }`}
                  >
                    {st}
                  </button>
                )
              )}
            </div>
          </div>

          <div className="p-4 bg-ink-900 rounded border border-line-1/50">
            <CommitmentCircuit
              from={{ label: 'AMB Unit 04' }}
              to={{ label: 'Apex Trauma Centre' }}
              status={circuitStatus}
              freshness={circuitFreshness}
            />
          </div>
        </div>

        {/* 2. Countdowns (Ring & Bar) */}
        <div className="p-6 rounded border border-line-1 bg-ink-800/60 space-y-4">
          <h3 className="text-base font-bold text-text-hi">G.2 Countdown (Ring & Bar Variants)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-center">
            <div className="p-4 bg-ink-900 rounded border border-line-1/40 flex justify-center">
              <Countdown expiresAt={demoExpiresAt} variant="ring" size="stage" label="Stage 220px Ring" />
            </div>
            <div className="p-4 bg-ink-900 rounded border border-line-1/40 flex justify-center">
              <Countdown expiresAt={demoExpiresAt} variant="ring" size="lg" label="Large Ring" />
            </div>
            <div className="p-4 bg-ink-900 rounded border border-line-1/40 flex flex-col justify-center space-y-4">
              <Countdown expiresAt={demoExpiresAt} variant="bar" size="lg" label="Ambulance Linear Bar" />
              <Countdown expiresAt={demoExpiresAt} variant="bar" size="sm" label="Compact Activity Bar" />
            </div>
          </div>
        </div>

        {/* 3. Status & Freshness Badges */}
        <div className="p-6 rounded border border-line-1 bg-ink-800/60 space-y-4">
          <h3 className="text-base font-bold text-text-hi">G.3 & G.4 Status & Freshness Badges</h3>
          <div className="space-y-3">
            <div className="text-xs font-mono text-text-low uppercase">All Request Status Shapes:</div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status="pending" />
              <StatusBadge status="accepted" />
              <StatusBadge status="rejected" />
              <StatusBadge status="timed_out" />
              <StatusBadge status="superseded" />
            </div>

            <div className="text-xs font-mono text-text-low uppercase pt-2">Freshness Trust Decay:</div>
            <div className="flex flex-wrap items-center gap-4">
              <FreshnessBadge lastUpdatedAt={Date.now() - 3 * 60 * 1000} />
              <FreshnessBadge lastUpdatedAt={Date.now() - 18 * 60 * 1000} />
              <FreshnessBadge lastUpdatedAt={Date.now() - 47 * 60 * 1000} />
            </div>
          </div>
        </div>

        {/* 4. ScoreBreakdown & NeedProfileChips */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded border border-line-1 bg-ink-800/60 space-y-3">
            <h3 className="text-base font-bold text-text-hi">G.6 ScoreBreakdown</h3>
            <ScoreBreakdown
              breakdown={{
                capability_match_pct: 100,
                distance_km: 4.2,
                distance_factor: 0.88,
                load_factor: 0.8,
                staleness_factor: 1.0,
                final_score: 70.4,
              }}
              defaultExpanded={true}
            />
          </div>

          <div className="p-6 rounded border border-line-1 bg-ink-800/60 space-y-3">
            <h3 className="text-base font-bold text-text-hi">G.7 NeedProfileChips</h3>
            <NeedProfileChips
              needProfile={{
                specialists_needed: ['cardiologist', 'intensivist'],
                capability_flags: ['ecg', 'icu', 'trauma_team'],
                blood_type_needed: 'O-',
              }}
              hospital={SEED_HOSPITALS[0]}
            />
          </div>
        </div>

        {/* 5. ReliabilityMeter */}
        <div className="p-6 rounded border border-line-1 bg-ink-800/60 space-y-3">
          <h3 className="text-base font-bold text-text-hi">G.9 ReliabilityMeter</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ReliabilityMeter
              score={0.94}
              metrics={{
                accepted_count: 17,
                successful_commitment_count: 16,
                average_response_seconds: 14,
              }}
            />
            <ReliabilityMeter
              score={0.72}
              metrics={{
                accepted_count: 25,
                successful_commitment_count: 18,
                average_response_seconds: 22,
              }}
            />
          </div>
        </div>

        {/* 6. Feedback States */}
        <div className="p-6 rounded border border-line-1 bg-ink-800/60 space-y-4">
          <h3 className="text-base font-bold text-text-hi">G.13 Feedback & Failure States</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <LoadingState label="Synchronizing…" />
            <EmptyState message="No active case. Start a new case to begin routing." />
            <ErrorState message="Unable to calculate a match. Retry." onRetry={() => {}} />
          </div>
        </div>
      </div>
    </div>
  );
};
