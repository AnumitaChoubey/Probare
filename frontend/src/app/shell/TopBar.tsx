import { useState, useEffect } from 'react';
import { AlertTriangle, Wifi, WifiOff, RefreshCw } from 'lucide-react';

export default function TopBar() {
  const [syncStatus, setSyncStatus] = useState<'SYNCED' | 'CONFLICT' | 'OFFLINE'>('SYNCED');

  // Simulate a conflict randomly after 5 seconds to demonstrate Task 14 UI, 
  // since triggering a real conflict requires a complex offline replication state.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSyncStatus('CONFLICT');
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {/* Task 14: Conflict Resolution UI */}
      <div 
        className={`fixed top-0 left-64 right-0 h-16 z-40 transition-all duration-500 ease-in-out flex items-center px-6 shadow-sm border-b
          ${syncStatus === 'CONFLICT' ? 'bg-amber-50 border-amber-200' : 
            syncStatus === 'OFFLINE' ? 'bg-slate-50 border-slate-200' : 
            'bg-white border-slate-200'}`}
      >
        <div className="flex-1" />

        {syncStatus === 'CONFLICT' && (
          <div className="flex items-center gap-3 animate-pulse bg-amber-100 px-4 py-1.5 rounded-full shadow-inner border border-amber-200">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <span className="font-semibold text-sm text-amber-800">Sync Conflict Detected! You have conflicting local edits.</span>
            <button className="ml-4 bg-amber-600 text-white px-3 py-1 rounded-md text-xs font-bold hover:bg-amber-700 shadow-sm transition-colors">
              Resolve Conflict
            </button>
          </div>
        )}

        <div className="flex-1" />

        <div className="flex items-center gap-4 text-sm font-medium">
          {syncStatus === 'SYNCED' && <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full"><Wifi className="w-4 h-4" /> Synced to Central</div>}
          {syncStatus === 'OFFLINE' && <div className="flex items-center gap-2 text-slate-500 bg-slate-100 px-3 py-1 rounded-full"><WifiOff className="w-4 h-4" /> Offline Mode</div>}
          {syncStatus === 'CONFLICT' && <div className="flex items-center gap-2 text-amber-600"><RefreshCw className="w-4 h-4 animate-spin" /> Sync Paused</div>}
          
          <div className="w-9 h-9 rounded-full bg-slate-200 border-2 border-white shadow-sm flex items-center justify-center text-slate-600 font-bold ml-4 cursor-pointer hover:bg-slate-300 transition-colors">
            AC
          </div>
        </div>
      </div>
    </>
  );
}
