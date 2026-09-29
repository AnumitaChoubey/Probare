import React from 'react';
import { Activity } from 'lucide-react';

export const AuthLayout: React.FC<{ children: React.ReactNode; title: string; subtitle: string }> = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen bg-qems-bg-surface flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-qems-bg-secondary border-r border-qems-border relative flex-col justify-between p-12">
        <div className="relative z-10">
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-10 h-10 flex items-center justify-center transition drop-shadow-sm">
              <svg width="100%" height="100%" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="tealGradAL" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#14b8a6" />
                    <stop offset="100%" stopColor="#0f766e" />
                  </linearGradient>
                  <linearGradient id="navyGradAL" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#0f172a" />
                    <stop offset="100%" stopColor="#020617" />
                  </linearGradient>
                </defs>
                <path d="M25 45 C25 10 45 5 70 5 C95 5 95 30 95 45 C95 70 80 85 60 85 C40 85 30 75 25 65 Z" fill="url(#tealGradAL)" />
                <path d="M25 95 V 20 C25 15 35 15 45 25 V 80 C45 95 35 100 25 95 Z" fill="url(#navyGradAL)" />
                <path d="M45 80 C60 80 80 75 80 50 C80 30 65 25 45 25 C30 25 25 35 25 45 C25 60 30 80 45 80 Z" fill="url(#navyGradAL)" />
                <path d="M42 45 L 50 53 L 68 32 L 75 38 L 50 65 L 35 50 Z" fill="#ffffff" />
              </svg>
            </div>
            <span className="text-3xl font-bold tracking-tight text-qems-text-primary lowercase">probare</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-qems-text-primary leading-tight mt-12 max-w-lg tracking-tight uppercase">
            Proactive.<br/>Precise.<br/>Quality.
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
            <div className="w-8 h-8 flex items-center justify-center">
              <svg width="100%" height="100%" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M25 45 C25 10 45 5 70 5 C95 5 95 30 95 45 C95 70 80 85 60 85 C40 85 30 75 25 65 Z" fill="#14b8a6" />
                <path d="M25 95 V 20 C25 15 35 15 45 25 V 80 C45 95 35 100 25 95 Z" fill="#0f172a" />
                <path d="M45 80 C60 80 80 75 80 50 C80 30 65 25 45 25 C30 25 25 35 25 45 C25 60 30 80 45 80 Z" fill="#0f172a" />
                <path d="M42 45 L 50 53 L 68 32 L 75 38 L 50 65 L 35 50 Z" fill="#ffffff" />
              </svg>
            </div>
            <span className="text-2xl font-bold text-qems-text-primary lowercase">probare</span>
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
