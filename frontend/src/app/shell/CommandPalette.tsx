import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';

export default function CommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-slate-900/50 backdrop-blur-sm">
      <div 
        className="w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95"
        role="dialog"
      >
        <div className="flex items-center px-4 border-b border-slate-100">
          <Search className="w-5 h-5 text-slate-400 mr-2" />
          <input
            autoFocus
            type="text"
            className="flex-1 py-4 text-base bg-transparent outline-none placeholder:text-slate-400"
            placeholder="Type a command or search for #ERR-1042..."
            onKeyDown={(e) => {
              if (e.key === 'Escape') setOpen(false);
            }}
          />
          <kbd className="px-2 py-1 text-xs font-semibold text-slate-500 bg-slate-100 rounded border border-slate-200">ESC</kbd>
        </div>
        <div className="p-2 max-h-[60vh] overflow-y-auto">
          <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Quick Actions</div>
          <button className="w-full text-left px-3 py-2.5 rounded-lg text-sm text-slate-700 hover:bg-slate-100 flex items-center">
            Log New Error
          </button>
          <button className="w-full text-left px-3 py-2.5 rounded-lg text-sm text-slate-700 hover:bg-slate-100 flex items-center">
            Go to Dispute Center
          </button>
          
          <div className="px-3 py-2 mt-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Recent Errors</div>
          <button className="w-full text-left px-3 py-2.5 rounded-lg text-sm text-slate-700 hover:bg-slate-100 flex items-center">
            <span className="font-mono text-slate-400 mr-2">#ERR-4029</span> Compliance Missing Document
          </button>
        </div>
      </div>
    </div>
  );
}
