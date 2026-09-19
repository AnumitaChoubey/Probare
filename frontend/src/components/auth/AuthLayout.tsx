import React from 'react';
import { Activity } from 'lucide-react';

export const AuthLayout: React.FC<{ children: React.ReactNode; title: string; subtitle: string }> = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-indigo-900 relative flex-col justify-between p-12 overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-600 rounded-full mix-blend-multiply filter blur-3xl opacity-50"></div>
          <div className="absolute bottom-0 right-0 w-full h-1/2 bg-gradient-to-t from-indigo-950 to-transparent"></div>
        </div>

        <div className="relative z-10">
          <div className="flex items-center space-x-3 mb-8">
            <div className="p-2 bg-indigo-500/20 rounded-lg backdrop-blur-sm">
              <Activity className="h-8 w-8 text-indigo-400" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-white">QEMS Enterprise</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight mt-12 max-w-lg">
            Quality Error Management & Continuous Improvement
          </h1>
          <p className="text-indigo-200 mt-6 text-lg max-w-md">
            The single source of truth for quality events, corrective actions, and systemic excellence.
          </p>
        </div>

        <div className="relative z-10 text-indigo-300 text-sm">
          <p>&copy; {new Date().getFullYear()} Quality Engineering. All rights reserved.</p>
        </div>
      </div>

      {/* Right Panel - Form Container */}
      <div className="flex flex-1 flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24 relative bg-white dark:bg-slate-900">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div className="mb-8 lg:hidden flex items-center space-x-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <Activity className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <span className="text-xl font-bold text-slate-900 dark:text-white">QEMS</span>
          </div>

          <div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {title}
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
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
