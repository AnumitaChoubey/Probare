import { useState, useEffect } from 'react';
import { Filter, Bookmark, BookmarkPlus, DownloadCloud, Loader2, Database } from 'lucide-react';

export default function FilterBarDemo() {
  const [savedFilters, setSavedFilters] = useState<any[]>([]);
  const [activeFilterId, setActiveFilterId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [newFilterName, setNewFilterName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  // Simulated active filters state
  const [currentLobs, setCurrentLobs] = useState<string[]>(['Retail Banking']);
  const [currentStatus, setCurrentStatus] = useState<string>('ALL');

  // Task 28: Fetching saved filters
  useEffect(() => {
    // Simulate GET /saved-filters
    setTimeout(() => {
      setSavedFilters([
        { id: '1', name: 'My Open Retail Errors', filter_json: { status: 'OPEN', lobs: ['Retail Banking'] } },
        { id: '2', name: 'Critical SLA Breaches', filter_json: { sla_state: 'BREACHED', severity: 'CRITICAL' } }
      ]);
    }, 500);
  }, []);

  const handleSaveFilter = () => {
    setIsSaving(true);
    // Simulate POST /saved-filters
    setTimeout(() => {
      setSavedFilters([...savedFilters, { 
        id: Date.now().toString(), 
        name: newFilterName, 
        filter_json: { status: currentStatus, lobs: currentLobs } 
      }]);
      setIsSaving(false);
      setShowSaveDialog(false);
      setNewFilterName('');
      setActiveFilterId(Date.now().toString());
    }, 800);
  };

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Filters & Export</h1>
          <p className="text-slate-500 mt-1">Manage complex data queries and export feeds.</p>
        </div>
        
        {/* Task 29: Power BI Export Option */}
        <a 
          href="http://localhost:8000/reports/export/powerbi"
          download
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-md flex items-center gap-2 transition-all hover:-translate-y-0.5 active:scale-95"
        >
          <Database className="w-5 h-5" />
          Power BI Live Export
        </a>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
        
        {/* Task 28: Saved Filters Quick-Select Chips */}
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Saved Filters</h3>
          <div className="flex flex-wrap gap-2">
            {savedFilters.map(filter => (
              <button
                key={filter.id}
                onClick={() => setActiveFilterId(filter.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors border shadow-sm ${
                  activeFilterId === filter.id 
                    ? 'bg-blue-50 border-blue-200 text-blue-700 ring-2 ring-blue-500/20' 
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Bookmark className={`w-4 h-4 ${activeFilterId === filter.id ? 'text-blue-500 fill-current' : 'text-slate-400'}`} />
                {filter.name}
              </button>
            ))}
            
            <div className="h-9 w-px bg-slate-200 mx-2" />
            
            {!showSaveDialog ? (
              <button 
                onClick={() => setShowSaveDialog(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors shadow-sm"
              >
                <BookmarkPlus className="w-4 h-4 text-slate-500" />
                Save Current View
              </button>
            ) : (
              <div className="flex items-center gap-2 animate-in slide-in-from-right-4 duration-300">
                <input 
                  type="text" 
                  autoFocus
                  placeholder="Filter name..." 
                  value={newFilterName}
                  onChange={(e) => setNewFilterName(e.target.value)}
                  className="px-3 py-1.5 border border-blue-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
                />
                <button 
                  onClick={handleSaveFilter}
                  disabled={!newFilterName || isSaving}
                  className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                </button>
                <button 
                  onClick={() => setShowSaveDialog(false)}
                  className="text-slate-500 hover:text-slate-700 px-2 text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        <hr className="border-slate-100" />

        {/* Task 27: Advanced Filtering Builder Mock */}
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Active Filters</h3>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select 
                value={currentStatus}
                onChange={e => setCurrentStatus(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-700 outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="OPEN">Open</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Line of Business</label>
              <select 
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-700 outline-none"
              >
                <option>Retail Banking</option>
                <option>Commercial Banking</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">SLA State</label>
              <select className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-700 outline-none">
                <option>All States</option>
                <option>Breached</option>
                <option>At Risk</option>
              </select>
            </div>
          </div>
        </div>
        
      </div>
      
      {/* Table Mock */}
      <div className="mt-6 bg-white rounded-2xl shadow-sm border border-slate-200 h-96 flex items-center justify-center text-slate-400 flex-col gap-3">
        <Filter className="w-12 h-12 text-slate-200" />
        <p>Data Table Results (Filtered by {activeFilterId ? 'Saved Filter' : 'Custom Filters'})</p>
      </div>

    </div>
  );
}
