import { useState, useRef, useEffect } from 'react';
import { UploadCloud, Save, X, ImageIcon, FileText } from 'lucide-react';

export default function NewErrorForm() {
  const [evidence, setEvidence] = useState<{name: string, type: string, size: number}[]>([]);
  const dropRef = useRef<HTMLDivElement>(null);

  // Ctrl + V Paste Hook for Evidence Ingestion
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!e.clipboardData) return;
      const items = e.clipboardData.items;
      for (const item of items) {
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) {
            setEvidence(prev => [...prev, { name: `Pasted_Image_${Date.now()}.png`, type: file.type, size: file.size }]);
          }
        }
      }
    };
    
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, []);

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden w-full max-w-4xl mx-auto mt-4">
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800">Log New Finding</h2>
        <div className="flex gap-2">
          <kbd className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-mono">Ctrl + Enter</kbd>
          <span className="text-xs text-slate-500 font-medium">to submit</span>
        </div>
      </div>

      <div className="p-6 grid grid-cols-3 gap-8">
        
        {/* Left: Form Fields (Tab Optimized) */}
        <div className="col-span-2 space-y-5">
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Process Area *</label>
              <select autoFocus className="w-full text-sm border border-slate-300 rounded-md p-2 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow">
                <option>Select Area...</option>
                <option>Retail Banking</option>
                <option>Commercial Loans</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Sub-Category *</label>
              <select className="w-full text-sm border border-slate-300 rounded-md p-2 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow">
                <option>Select Sub-category...</option>
                <option>Documentation</option>
                <option>Compliance Check</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Standard Operating Procedure (SOP)</label>
            <input type="text" placeholder="e.g. SOP-104-B" className="w-full text-sm border border-slate-300 rounded-md p-2 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Defect Description *</label>
            <textarea rows={4} placeholder="Describe the error precisely..." className="w-full text-sm border border-slate-300 rounded-md p-2 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow resize-none" />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Agent / Operator</label>
              <input type="text" placeholder="Search employee directory..." className="w-full text-sm border border-slate-300 rounded-md p-2 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Severity</label>
              <select className="w-full text-sm border border-slate-300 rounded-md p-2 outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-shadow">
                <option>Coaching</option>
                <option>High</option>
                <option className="text-rose-600 font-bold">Fatal</option>
              </select>
            </div>
          </div>
          
        </div>

        {/* Right: Evidence Dropzone & Preview */}
        <div className="col-span-1 border-l border-slate-200 pl-8 flex flex-col">
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Evidence Upload</label>
          
          <div 
            ref={dropRef}
            className="flex-1 border-2 border-dashed border-slate-300 rounded-lg bg-slate-50 flex flex-col items-center justify-center text-center p-6 text-slate-500 hover:bg-slate-100 hover:border-blue-400 transition-colors cursor-pointer group"
          >
            <UploadCloud className="w-8 h-8 mb-3 text-slate-400 group-hover:text-blue-500" />
            <p className="text-sm font-semibold text-slate-700">Drag & Drop files</p>
            <p className="text-xs mt-1">or click to browse</p>
            <div className="mt-4 px-3 py-1 bg-white border border-slate-200 rounded text-xs font-mono shadow-sm flex items-center gap-1.5">
              <span className="font-semibold text-slate-600">Ctrl + V</span> to paste image
            </div>
          </div>

          {/* Uploaded Evidence List */}
          {evidence.length > 0 && (
            <div className="mt-4 space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
              {evidence.map((ev, i) => (
                <div key={i} className="flex items-center justify-between p-2 text-xs border border-slate-200 rounded bg-white shadow-sm">
                  <div className="flex items-center gap-2 truncate">
                    {ev.type.includes('image') ? <ImageIcon className="w-3.5 h-3.5 text-blue-500" /> : <FileText className="w-3.5 h-3.5 text-slate-500" />}
                    <span className="truncate max-w-[120px] font-medium text-slate-700">{ev.name}</span>
                  </div>
                  <button className="text-slate-400 hover:text-rose-500 transition-colors" onClick={() => setEvidence(e => e.filter((_, idx) => idx !== i))}>
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
        <button className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded-md transition-colors">
          Cancel (Esc)
        </button>
        <button className="px-6 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm transition-colors flex items-center gap-2">
          <Save className="w-4 h-4" />
          Submit Finding
        </button>
      </div>

    </div>
  );
}
