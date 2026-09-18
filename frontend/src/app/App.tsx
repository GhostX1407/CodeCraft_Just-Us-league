import React from 'react';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { AppRoutes } from './routes';
import { ConnectionBanner } from '../components/feedback/ConnectionBanner';
import { CommandDock } from '../components/layout/CommandDock';
import { LivingBackground } from '../components/layout/LivingBackground';
import { PageTransition } from '../components/layout/PageTransition';
import clsx from 'clsx';

const AppContent: React.FC = () => {
  const location = useLocation();
  const isAuthPage = location.pathname === '/' || location.pathname === '/login';
  const isTrackPage = location.pathname.startsWith('/track/');
  const showNav = !isAuthPage && !isTrackPage;

  return (
    <div className="min-h-screen bg-ink-900 text-text-hi font-sans antialiased flex flex-col selection:bg-signal/30 selection:text-text-hi relative">
      {/* Living Ambient Depth Canvas */}
      <LivingBackground />

      {/* Global Network Interruption Banner */}
      <ConnectionBanner />

      {/* Floating Adaptive Command Dock - Only on authenticated functional pages */}
      {showNav && <CommandDock />}

      {/* Spatial Content Area */}
      <main className={clsx('flex-1 relative z-10 flex flex-col', showNav && 'pt-16 sm:pt-20')}>
        <PageTransition>
          <AppRoutes />
        </PageTransition>
      </main>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
};

