import { Search, User, Settings, Minimize2, Maximize2, X } from 'lucide-react';

export default function TitleBar() {
  return (
    <div className="fixed top-0 left-0 right-0 h-12 bg-slate-950 flex items-center justify-between px-4 z-50 border-b border-slate-800" style={{ WebkitAppRegion: 'drag' } as any}>
      {/* Left: Branding */}
      <div className="flex items-center gap-3">
        <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
          Q
        </div>
        <span className="font-bold text-sm tracking-tight text-white">QEMS Enterprise</span>
      </div>

      {/* Center: Global Search Prompt */}
      <div 
        className="flex items-center bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 w-96 text-slate-400 text-xs shadow-inner cursor-pointer hover:bg-slate-800 transition-colors"
        style={{ WebkitAppRegion: 'no-drag' } as any}
      >
        <Search className="w-3.5 h-3.5 mr-2 text-slate-500" />
        <span className="flex-1">Search or jump to...</span>
        <div className="flex gap-1">
          <kbd className="bg-slate-800 border border-slate-700 px-1.5 rounded text-[10px] font-mono">Ctrl</kbd>
          <kbd className="bg-slate-800 border border-slate-700 px-1.5 rounded text-[10px] font-mono">K</kbd>
        </div>
      </div>

      {/* Right: User Profile & Controls */}
      <div className="flex items-center gap-4" style={{ WebkitAppRegion: 'no-drag' } as any}>
        <div className="flex items-center gap-2">
          <div className="text-right hidden md:block">
            <div className="text-xs font-bold text-slate-200">Sarah Jenkins</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">QA Lead</div>
          </div>
          <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
            <User className="w-4 h-4" />
          </div>
        </div>
        
        {/* Mock Window Controls for Electron frameless window */}
        <div className="flex items-center gap-1 border-l border-slate-800 pl-4">
          <button className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"><Minimize2 className="w-3.5 h-3.5" /></button>
          <button className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"><Maximize2 className="w-3.5 h-3.5" /></button>
          <button className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 rounded transition-colors"><X className="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  );
}
