import { Database, Wifi, AlertTriangle, Info, Map } from 'lucide-react';

export default function StatusBar() {
  return (
    <div className="fixed bottom-0 left-0 right-0 h-8 bg-slate-900 border-t border-slate-800 flex items-center justify-between px-3 z-50 text-[11px] font-medium text-slate-400">
      
      {/* Left: Sync Status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-emerald-400">
          <Wifi className="w-3 h-3" />
          <span>Connected</span>
        </div>
        <div className="flex items-center gap-1.5 border-l border-slate-700 pl-4">
          <Database className="w-3 h-3 text-slate-500" />
          <span>Local SQLite Sync: Active</span>
        </div>
      </div>

      {/* Center: Alerts */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
          <AlertTriangle className="w-3 h-3" />
          <span>SLA Breach: 1</span>
        </div>
        <div className="flex items-center gap-1.5 text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
          <Info className="w-3 h-3" />
          <span>Open Disputed: 4</span>
        </div>
      </div>

      {/* Right: Tools & Environment */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 hover:text-white cursor-pointer transition-colors">
          <Map className="w-3 h-3" />
          <span>Shortcut Map (Alt + ?)</span>
        </div>
        <div className="border-l border-slate-700 pl-4">
          v1.0.4-prod
        </div>
      </div>
      
    </div>
  );
}
