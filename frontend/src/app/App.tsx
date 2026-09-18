import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from './routes';
import { ConnectionBanner } from '../components/feedback/ConnectionBanner';
import { CommandDock } from '../components/layout/CommandDock';
import { LivingBackground } from '../components/layout/LivingBackground';
import { PageTransition } from '../components/layout/PageTransition';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-ink-900 text-text-hi font-sans antialiased flex flex-col selection:bg-signal/30 selection:text-text-hi relative">
        {/* Living Ambient Depth Canvas */}
        <LivingBackground />

        {/* Global Network Interruption Banner */}
        <ConnectionBanner />

        {/* Floating Adaptive Command Dock */}
        <CommandDock />

        {/* Spatial Content Area with 120Hz Camera-Lens Page Transitions */}
        <main className="flex-1 relative z-10 pt-16 sm:pt-20">
          <PageTransition>
            <AppRoutes />
          </PageTransition>
        </main>
      </div>
    </BrowserRouter>
  );
};
