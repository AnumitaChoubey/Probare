import React, { useEffect } from 'react';
import { QEMSProvider, useQEMS } from './context/QEMSContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { StatusBar } from './components/common/StatusBar';
import { CommandPalette } from './components/common/CommandPalette';
import { ToastContainer } from './components/common/ToastContainer';
import { CommandCenter } from './components/dashboard/CommandCenter';
import { QualityEventsTable } from './components/events/QualityEventsTable';
import { ErrorDetailWorkspace } from './components/events/ErrorDetailWorkspace';
import { DisputeCenter } from './components/disputes/DisputeCenter';
import { CalibrationCenter } from './components/calibration/CalibrationCenter';
import { QualityIntelligence } from './components/analytics/QualityIntelligence';
import { MyWork } from './components/work/MyWork';
import { CorrectiveActionsHub } from './components/capa/CorrectiveActionsHub';
import { EvidenceGallery } from './components/evidence/EvidenceGallery';
import { ReportsAudits } from './components/reports/ReportsAudits';
import { Administration } from './components/admin/Administration';
import { NewErrorModal } from './components/entry/NewErrorModal';
import { AiAssistantDrawer } from './components/ai/AiAssistantDrawer';

const AppContent: React.FC = () => {
  const { activeSection, selectedEventId, setIsNewErrorModalOpen, theme, density, toggleTheme } = useQEMS();

  // Keyboard shortcut listener ('D' key toggles theme when not focused on an input)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      if (!isInput && (e.key === 'd' || e.key === 'D') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        toggleTheme();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleTheme]);

  const renderMainContent = () => {
    switch (activeSection) {
      case 'COMMAND CENTER':
        return <CommandCenter />;

      case 'MY WORK':
        return <MyWork />;

      case 'QUALITY EVENTS':
        if (selectedEventId) {
          return <ErrorDetailWorkspace />;
        }
        return <QualityEventsTable />;

      case 'NEW ERROR':
        return (
          <div className="p-8 max-w-xl mx-auto text-center space-y-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 shadow-xs space-y-3">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Log New Quality Error Finding
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Fast 60-second entry mode with AI categorization, guided severity rubrics, and automated SLA timers.
              </p>
              <button
                type="button"
                onClick={() => setIsNewErrorModalOpen(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-semibold shadow-xs"
              >
                Launch Fast Entry Modal
              </button>
            </div>
            <QualityEventsTable />
          </div>
        );

      case 'DISPUTE CENTER':
        return <DisputeCenter />;

      case 'EVIDENCE':
        return <EvidenceGallery />;

      case 'ROOT CAUSE':
        return selectedEventId ? (
          <ErrorDetailWorkspace />
        ) : (
          <div className="p-6">
            <QualityEventsTable />
          </div>
        );

      case 'CORRECTIVE ACTIONS':
        return <CorrectiveActionsHub />;

      case 'CALIBRATION':
        return <CalibrationCenter />;

      case 'QUALITY INTELLIGENCE':
        return <QualityIntelligence />;

      case 'REPORTS':
        return <ReportsAudits />;

      case 'ADMINISTRATION':
        return <Administration />;

      default:
        return <CommandCenter />;
    }
  };

  return (
    <div
      className={`flex flex-col h-screen font-sans antialiased overflow-hidden ${
        theme === 'dark' ? 'dark bg-slate-950 text-slate-100' : 'bg-white text-slate-900'
      } ${density === 'compact' ? 'qems-density-compact' : 'qems-density-comfortable'}`}
    >
      {/* Skip to main content accessibility link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-3 focus:py-1.5 focus:bg-indigo-600 focus:text-white focus:rounded focus:text-xs font-semibold"
      >
        Skip to main content
      </a>

      {/* Top Header */}
      <Header />

      {/* Center Layout: Sidebar + Main Workspace */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 relative outline-none"
        >
          <ErrorBoundary>
            {renderMainContent()}
          </ErrorBoundary>
        </main>
      </div>

      {/* Bottom Status Telemetry Bar */}
      <StatusBar />

      {/* Global Modals & Overlays */}
      <CommandPalette />
      <NewErrorModal />
      <AiAssistantDrawer />
      <ToastContainer />
    </div>
  );
};

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ClerkProvider, SignedIn, SignedOut } from '@clerk/clerk-react';
import { Login } from './components/auth/Login';
import { Register } from './components/auth/Register';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '';

const AuthRouter = () => {
  const [currentPath, setCurrentPath] = React.useState(window.location.pathname);

  useEffect(() => {
    const handleLocationChange = () => setCurrentPath(window.location.pathname);
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  if (currentPath === '/login') {
    return <Login />;
  }
  
  if (currentPath === '/register') {
    return <Register />;
  }
  
  // Default unauthenticated fallback
  return <Login />;
};

export default function App() {
  if (!clerkPubKey) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-900 p-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-xl font-bold text-red-600">Configuration Error</h1>
          <p>Missing VITE_CLERK_PUBLISHABLE_KEY in environment.</p>
        </div>
      </div>
    );
  }

  return (
    <ClerkProvider publishableKey={clerkPubKey}>
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary fallbackTitle="Quality Error Management System Error">
          <SignedIn>
            <QEMSProvider>
              <AppContent />
            </QEMSProvider>
          </SignedIn>
          <SignedOut>
            <AuthRouter />
          </SignedOut>
        </ErrorBoundary>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ClerkProvider>
  );
}
