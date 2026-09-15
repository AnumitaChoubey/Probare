import { useState, useEffect } from 'react';
import { Sparkles, AlertCircle, Save, Loader2 } from 'lucide-react';

// Custom debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function LogNewErrorForm() {
  const [description, setDescription] = useState('');
  const debouncedDescription = useDebounce(description, 1000);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestion, setSuggestion] = useState<{ category: string, severity: string } | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Task 23: AI Classification Suggestion UI
  useEffect(() => {
    if (debouncedDescription.trim().length > 15) {
      setIsSuggesting(true);
      // Simulate API call to POST /ai/suggest-classification
      setTimeout(() => {
        setSuggestion({
          category: 'Data Entry Error',
          severity: 'HIGH'
        });
        setIsSuggesting(false);
      }, 1500);
    } else {
      setSuggestion(null);
    }
  }, [debouncedDescription]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setDuplicateWarning(null);

    // Simulate POST /errors which returns duplicate warnings (Task 24)
    setTimeout(() => {
      setIsSubmitting(false);
      // Simulate a semantic duplicate warning being returned
      if (description.toLowerCase().includes('client')) {
        setDuplicateWarning('Possible duplicate of QA-2026-402: "Client account misconfigured"');
      } else {
        alert("Error logged successfully!");
        setDescription('');
        setSuggestion(null);
      }
    }, 1200);
  };

  return (
    <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 px-8 py-6">
          <h1 className="text-2xl font-bold text-slate-800">Log New Error</h1>
          <p className="text-slate-500 mt-1">Submit a new quality error for review and classification.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {/* Task 24: Duplicate Warning Toast */}
          {duplicateWarning && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-4 items-start shadow-sm animate-in fade-in slide-in-from-top-2">
              <div className="p-2 bg-amber-100 rounded-full text-amber-600">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-amber-800">Semantic Duplicate Detected</h3>
                <p className="text-amber-700 text-sm mt-1">{duplicateWarning}</p>
                <div className="mt-3 flex gap-3">
                  <button type="button" className="text-sm bg-white border border-amber-300 text-amber-700 px-4 py-1.5 rounded-lg hover:bg-amber-100 font-medium transition-colors">
                    View Duplicate
                  </button>
                  <button type="button" onClick={() => setDuplicateWarning(null)} className="text-sm bg-amber-600 text-white px-4 py-1.5 rounded-lg hover:bg-amber-700 font-medium shadow-sm transition-colors">
                    Log Anyway
                  </button>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Error Description</label>
            <div className="relative">
              <textarea 
                rows={5}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none"
                placeholder="Describe the error in detail... (Hint: type 'client' to test the duplicate warning!)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              
              {/* Task 23: AI Classification Suggestion Card */}
              <div className="absolute right-4 top-4">
                {isSuggesting && (
                  <div className="flex items-center gap-2 text-blue-500 bg-blue-50 px-3 py-1.5 rounded-full text-xs font-medium animate-pulse border border-blue-100 shadow-sm">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Analyzing semantics...
                  </div>
                )}
                {suggestion && !isSuggesting && (
                  <div className="flex items-center gap-2 text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl text-sm font-medium border border-indigo-100 shadow-sm animate-in zoom-in-95 duration-300">
                    <Sparkles className="w-4 h-4 text-indigo-500" />
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-wider text-indigo-400 font-bold mb-0.5">AI Suggestion</span>
                      <span>{suggestion.category} • <span className="text-red-500">{suggestion.severity}</span></span>
                    </div>
                    <button type="button" className="ml-2 bg-indigo-600 text-white px-2 py-1 rounded text-xs hover:bg-indigo-700 shadow-sm transition-colors">
                      Apply
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Line of Business</label>
              <select className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none">
                <option>Retail Banking</option>
                <option>Commercial Banking</option>
                <option>Wealth Management</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Assigned Owner</label>
              <select className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none">
                <option>Sarah Jenkins</option>
                <option>Michael Chen</option>
                <option>Amanda Rodriguez</option>
              </select>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button 
              type="submit" 
              disabled={isSubmitting || !description}
              className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white px-8 py-3 rounded-xl font-semibold shadow-md shadow-slate-900/20 flex items-center gap-2 transition-all active:scale-95"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {isSubmitting ? 'Processing...' : 'Submit Error'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
