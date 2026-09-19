import React, { useEffect } from 'react';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { AppRoutes } from './routes';
import { ConnectionBanner } from '../components/feedback/ConnectionBanner';
import { RoleAwareAppHeader } from '../components/layout/RoleAwareAppHeader';
import { LivingBackground } from '../components/layout/LivingBackground';
import { PageTransition } from '../components/layout/PageTransition';
import { initAutoNotificationWatcher } from '../services/notificationBus';
import clsx from 'clsx';

const AppContent: React.FC = () => {
  const location = useLocation();
  const isAuthPage = location.pathname === '/' || location.pathname === '/login';
  const isTrackPage = location.pathname.startsWith('/track/');
  const showNav = !isAuthPage && !isTrackPage;

  useEffect(() => {
    const unsub = initAutoNotificationWatcher();
    return unsub;
  }, []);

  return (
    <div className="min-h-screen bg-ink-900 text-text-hi font-sans antialiased flex flex-col selection:bg-signal/30 selection:text-text-hi relative">
      {/* Living Ambient Depth Canvas */}
      <LivingBackground />

      {/* Global Network Interruption Banner */}
      <ConnectionBanner />

      {/* Role-Aware Navigation Header */}
      {showNav && <RoleAwareAppHeader />}

      {/* Spatial Content Area */}
      <main className={clsx('flex-1 relative z-10 flex flex-col', showNav && 'pt-2 sm:pt-4')}>
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

