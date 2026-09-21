import React from 'react';
import { Activity } from 'lucide-react';

export const AuthLayout: React.FC<{ children: React.ReactNode; title: string; subtitle: string }> = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen bg-qems-bg-surface flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-qems-bg-secondary border-r border-qems-border relative flex-col justify-between p-12">
        <div className="relative z-10">
          <div className="flex items-center space-x-3 mb-8">
            <span className="text-2xl font-bold tracking-tight text-qems-text-primary uppercase">QEMS Enterprise</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-qems-text-primary leading-tight mt-12 max-w-lg tracking-tight">
            Quality Operations & Continuous Improvement
          </h1>
          <p className="text-qems-text-secondary mt-6 text-lg max-w-md">
            The single source of truth for quality events, corrective actions, and systemic excellence.
          </p>
        </div>

        <div className="relative z-10 text-qems-text-muted text-sm font-mono uppercase tracking-wider">
          <p>&copy; {new Date().getFullYear()} Quality Engineering.</p>
        </div>
      </div>

      {/* Right Panel - Form Container */}
      <div className="flex flex-1 flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24 relative bg-qems-bg-white ">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div className="mb-8 lg:hidden flex items-center space-x-3">
            <div className="p-2 bg-qems-brand-light rounded-lg">
              <Activity className="h-6 w-6 text-qems-brand-dark " />
            </div>
            <span className="text-xl font-bold text-qems-text-primary ">QEMS</span>
          </div>

          <div>
            <h2 className="text-3xl font-bold tracking-tight text-qems-text-primary ">
              {title}
            </h2>
            <p className="mt-2 text-sm text-qems-text-muted ">
              {subtitle}
            </p>
          </div>

          <div className="mt-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
